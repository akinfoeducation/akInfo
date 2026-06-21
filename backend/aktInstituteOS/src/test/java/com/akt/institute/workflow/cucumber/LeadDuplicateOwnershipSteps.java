package com.akt.institute.workflow.cucumber;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

/**
 * Step definitions for lead-duplicate-ownership.feature. Self-contained (its own
 * login/HTTP helpers) so it shares no mutable state with CrmWorkflowSteps — each
 * scenario gets a fresh instance. Phone numbers are generated per scenario from a
 * static counter because the test DB is shared across scenarios (no rollback).
 */
public class LeadDuplicateOwnershipSteps {

    private static final String SEED_PASSWORD = "caller123";
    private static final AtomicInteger SEQ = new AtomicInteger(50_000_000);

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper om;
    @Autowired private JdbcTemplate jdbc;

    private record Auth(String token, long userId) {}

    // ── per-scenario state ──────────────────────────────────────────────────
    private Auth admin, callerOne, callerTwo;
    private long leadId, secondLeadId;
    private String phoneA;                 // the existing lead's primary number
    private String altA;                   // the existing lead's alternate number
    private ResultActions lastResponse;    // for rejection / success assertions
    private boolean dbRejected;            // direct-insert unique-violation flag
    private JsonNode bulkResult;           // bulk-assign result payload

    // ═══════════════════════════ Background ══════════════════════════════════

    @Given("an admin and two callers are logged in")
    public void everyoneLoggedIn() throws Exception {
        admin     = login("admin", "admin");
        callerOne = login("caller", SEED_PASSWORD);
        callerTwo = login("rahul.verma", SEED_PASSWORD);
    }

    // ═══════════════════════════ Duplicate prevention ════════════════════════

    @Given("an active lead exists for a new phone number")
    public void anActiveLeadExists() throws Exception {
        phoneA = nextPhone();
        leadId = createLead(admin, phoneA, null);
    }

    @Given("an active lead exists with a primary and an alternate number")
    public void anActiveLeadWithAlternate() throws Exception {
        phoneA = nextPhone();
        altA   = nextPhone();
        leadId = createLead(admin, phoneA, altA);
    }

    @Given("a closed lead exists for a new phone number")
    public void aClosedLeadExists() throws Exception {
        phoneA = nextPhone();
        leadId = createLead(admin, phoneA, null);
        assign(admin, leadId, callerOne.userId());
        ok(action(callerOne, "MARK_NOT_INTERESTED", Map.of("reason", "Not now")));
    }

    @When("a lead is created with that same primary number")
    public void createWithSamePrimary() throws Exception {
        lastResponse = attemptCreate(admin, phoneA, null);
    }

    @When("a lead is created whose primary number equals the existing alternate number")
    public void createPrimaryEqualsExistingAlternate() throws Exception {
        lastResponse = attemptCreate(admin, altA, null);
    }

    @When("a lead is created whose alternate number equals the existing primary number")
    public void createAlternateEqualsExistingPrimary() throws Exception {
        lastResponse = attemptCreate(admin, nextPhone(), phoneA);
    }

    @When("a second active lead with that same number is inserted directly into the database")
    public void directInsertDuplicate() {
        Long instituteId = jdbc.queryForObject(
            "SELECT institute_id FROM leads WHERE id = ?", Long.class, leadId);
        try {
            jdbc.update(
                "INSERT INTO leads (uuid, institute_id, first_name, phone, status, source, created_at, updated_at)" +
                " VALUES (gen_random_uuid()::text, ?, 'Dup', ?, 'ASSIGNED', 'WALK_IN', now(), now())",
                instituteId, phoneA);
            dbRejected = false;
        } catch (DataIntegrityViolationException e) {
            dbRejected = true;
        }
    }

    @Then("the lead creation is rejected as {word}")
    public void leadCreationRejected(String errorCode) throws Exception {
        assertRejected(errorCode);
    }

    @Then("the lead is created successfully")
    public void leadCreatedSuccessfully() throws Exception {
        var res = lastResponse.andReturn().getResponse();
        assertThat(res.getStatus())
            .as("expected a 2xx but got " + res.getStatus() + ": " + res.getContentAsString())
            .isLessThan(300);
    }

    @Then("the database rejects it with a unique-constraint violation")
    public void databaseRejectsDuplicate() {
        assertThat(dbRejected)
            .as("the partial unique index should reject a second active lead for the same number")
            .isTrue();
    }

    // ═══════════════════════════ Ownership protection ════════════════════════

    @Given("a lead is assigned to the first caller")
    public void leadAssignedToFirstCaller() throws Exception {
        phoneA = nextPhone();
        leadId = createLead(admin, phoneA, null);
        assign(admin, leadId, callerOne.userId());
    }

    @Given("a second lead is assigned to the first caller")
    public void secondLeadAssignedToFirstCaller() throws Exception {
        secondLeadId = createLead(admin, nextPhone(), null);
        assign(admin, secondLeadId, callerOne.userId());
    }

    @Given("the first caller marks the lead as callback")
    public void firstCallerMarksCallback() throws Exception {
        ok(action(callerOne, "REQUEST_CALLBACK", Map.of()));
    }

    @Given("the first caller marks the lead as interested")
    public void firstCallerMarksInterested() throws Exception {
        ok(action(callerOne, "MARK_INTERESTED", Map.of()));
    }

    @Given("the first caller marks the lead as not connected")
    public void firstCallerMarksNotConnected() throws Exception {
        ok(action(callerOne, "CALL_NOT_CONNECTED", Map.of()));
    }

    @When("the second caller opens the lead by id")
    public void secondCallerOpensLead() throws Exception {
        lastResponse = send(HttpMethod.GET, "/api/v1/leads/" + leadId, callerTwo, null);
    }

    @When("the second caller requests the action panel")
    public void secondCallerRequestsActionPanel() throws Exception {
        lastResponse = send(HttpMethod.GET, "/api/v1/leads/" + leadId + "/available-actions", callerTwo, null);
    }

    @When("the admin reassigns the lead to the second caller")
    public void adminReassigns() throws Exception {
        lastResponse = send(HttpMethod.PATCH, "/api/v1/leads/" + leadId + "/assign",
            admin, Map.of("callerId", callerTwo.userId()));
    }

    @When("the admin bulk reassigns both leads to the second caller")
    public void adminBulkReassigns() throws Exception {
        ResultActions ra = send(HttpMethod.POST, "/api/v1/leads/bulk-assign", admin,
            Map.of("leadIds", List.of(leadId, secondLeadId), "callerId", callerTwo.userId()));
        ok(ra);
        bulkResult = dataOf(ra);
    }

    @Then("the read is rejected as {word}")
    public void readRejected(String errorCode) throws Exception {
        assertRejected(errorCode);
    }

    @Then("the reassignment is rejected as {word}")
    public void reassignmentRejected(String errorCode) throws Exception {
        assertRejected(errorCode);
    }

    @Then("the first caller can open the lead by id")
    public void firstCallerCanOpen() throws Exception {
        ok(send(HttpMethod.GET, "/api/v1/leads/" + leadId, callerOne, null));
    }

    @Then("the lead is still owned by the first caller")
    public void leadStillOwnedByFirst() throws Exception {
        assertThat(getLead(leadId).path("assignedToId").asLong()).isEqualTo(callerOne.userId());
    }

    @Then("the callback lead is still owned by the first caller")
    public void callbackLeadStillOwnedByFirst() throws Exception {
        assertThat(getLead(leadId).path("assignedToId").asLong()).isEqualTo(callerOne.userId());
    }

    @Then("the lead is owned by the second caller")
    public void leadOwnedBySecond() throws Exception {
        assertThat(getLead(leadId).path("assignedToId").asLong()).isEqualTo(callerTwo.userId());
    }

    @Then("one lead is reported locked")
    public void oneLeadLocked() {
        assertThat(bulkResult.path("locked").asInt()).isEqualTo(1);
    }

    @Then("one lead is reported reassigned")
    public void oneLeadReassigned() {
        assertThat(bulkResult.path("reassigned").asInt()).isEqualTo(1);
    }

    // ═══════════════════════════ Caller update path ══════════════════════════

    @Given("another active lead exists holding a known number")
    public void anotherActiveLeadHoldsKnownNumber() throws Exception {
        altA = nextPhone();                 // reuse altA to hold the "known" colliding number
        createLead(admin, altA, null);
    }

    @When("the first caller creates a lead for a new phone number")
    public void firstCallerCreatesLead() throws Exception {
        lastResponse = attemptCreate(callerOne, nextPhone(), null);
    }

    @When("the first caller updates that lead with the known number as the alternate and a new note")
    public void firstCallerUpdatesWithConflictingAlternate() throws Exception {
        lastResponse = send(HttpMethod.PUT, "/api/v1/leads/" + leadId, callerOne,
            Map.of("whatsappNumber", altA, "notes", "Called - interested"));
    }

    @When("the first caller updates that lead with a fresh alternate number")
    public void firstCallerUpdatesWithFreshAlternate() throws Exception {
        altA = nextPhone();
        lastResponse = send(HttpMethod.PUT, "/api/v1/leads/" + leadId, callerOne,
            Map.of("whatsappNumber", altA));
    }

    @Then("the update succeeds")
    public void updateSucceeds() throws Exception {
        ok(lastResponse);
    }

    @Then("the alternate number was not saved")
    public void alternateNotSaved() throws Exception {
        assertThat(getLead(leadId).path("whatsappNumber").asText("")).isNotEqualTo(altA);
    }

    @Then("the alternate number was saved")
    public void alternateSaved() throws Exception {
        assertThat(getLead(leadId).path("whatsappNumber").asText("")).isEqualTo(altA);
    }

    @Then("the new note was saved")
    public void newNoteSaved() throws Exception {
        assertThat(getLead(leadId).path("notes").asText("")).isEqualTo("Called - interested");
    }

    @Then("the update reports a duplicate conflict")
    public void updateReportsConflict() throws Exception {
        JsonNode conflicts = dataOf(lastResponse).path("duplicateConflicts");
        assertThat(conflicts.size()).as("expected at least one reported duplicate conflict").isGreaterThanOrEqualTo(1);
    }

    @Then("the update reports no duplicate conflict")
    public void updateReportsNoConflict() throws Exception {
        JsonNode conflicts = dataOf(lastResponse).path("duplicateConflicts");
        assertThat(conflicts.size()).as("expected no duplicate conflicts").isEqualTo(0);
    }

    // ═══════════════════════════ Real-time lookup ════════════════════════════

    @When("the second caller looks up that lead's phone number")
    public void secondCallerLooksUpKnownNumber() throws Exception {
        lastResponse = send(HttpMethod.GET, "/api/v1/leads/lookup?phone=" + phoneA, callerTwo, null);
    }

    @When("the second caller looks up a brand-new phone number")
    public void secondCallerLooksUpUnknownNumber() throws Exception {
        lastResponse = send(HttpMethod.GET, "/api/v1/leads/lookup?phone=" + nextPhone(), callerTwo, null);
    }

    @Then("the lookup says the number exists")
    public void lookupSaysExists() throws Exception {
        assertThat(dataOf(lastResponse).path("exists").asBoolean()).isTrue();
    }

    @Then("the lookup says the number does not exist")
    public void lookupSaysNotExists() throws Exception {
        assertThat(dataOf(lastResponse).path("exists").asBoolean()).isFalse();
    }

    @Then("the lookup shows it is owned by the first caller")
    public void lookupShowsFirstCallerOwner() throws Exception {
        assertThat(dataOf(lastResponse).path("assignedToId").asLong()).isEqualTo(callerOne.userId());
    }

    // ═══════════════════════════ Helpers ═════════════════════════════════════

    private Auth login(String userOrEmail, String pass) throws Exception {
        JsonNode data = dataOf(mvc.perform(request(HttpMethod.POST, "/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(om.writeValueAsString(Map.of("emailOrUsername", userOrEmail, "password", pass)))));
        return new Auth(data.path("accessToken").asText(), data.path("user").path("id").asLong());
    }

    /** Creates a lead and asserts success; returns its id. */
    private long createLead(Auth as, String phone, String whatsapp) throws Exception {
        return dataOf(ok(attemptCreate(as, phone, whatsapp))).path("id").asLong();
    }

    /** Attempts to create a lead and returns the raw response (no success assertion). */
    private ResultActions attemptCreate(Auth as, String phone, String whatsapp) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("firstName", "Dup");
        body.put("lastName", "Test");
        body.put("phone", phone);
        if (whatsapp != null) body.put("whatsappNumber", whatsapp);
        body.put("deliveryMode", "OFFLINE");
        body.put("source", "REFERRAL");
        return send(HttpMethod.POST, "/api/v1/leads", as, body);
    }

    private void assign(Auth as, long leadId, long callerId) throws Exception {
        ok(send(HttpMethod.PATCH, "/api/v1/leads/" + leadId + "/assign", as, Map.of("callerId", callerId)));
    }

    private ResultActions action(Auth as, String action, Map<String, Object> extras) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("action", action);
        body.putAll(extras);
        return send(HttpMethod.POST, "/api/v1/leads/" + leadId + "/actions", as, body);
    }

    private JsonNode getLead(long id) throws Exception {
        return dataOf(send(HttpMethod.GET, "/api/v1/leads/" + id, admin, null));
    }

    private String nextPhone() {
        // 10-digit Indian mobile in a 9-prefixed band that avoids seeded/generated ranges.
        return "9" + String.format("%09d", SEQ.incrementAndGet());
    }

    private void assertRejected(String errorCode) throws Exception {
        var res = lastResponse.andReturn().getResponse();
        assertThat(res.getStatus()).as("HTTP status should be a 4xx rejection but was "
            + res.getStatus() + ": " + res.getContentAsString()).isGreaterThanOrEqualTo(400);
        JsonNode body = om.readTree(res.getContentAsString());
        assertThat(body.path("errorCode").asText()).isEqualTo(errorCode);
    }

    private ResultActions send(HttpMethod method, String path, Auth as, Object body) throws Exception {
        MockHttpServletRequestBuilder rb = request(method, path);
        if (as != null) rb.header("Authorization", "Bearer " + as.token());
        if (body != null) rb.contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(body));
        return mvc.perform(rb);
    }

    private ResultActions ok(ResultActions ra) throws Exception {
        var res = ra.andReturn().getResponse();
        assertThat(res.getStatus()).as("expected a 2xx success but got " + res.getStatus()
            + ": " + res.getContentAsString()).isLessThan(300);
        return ra;
    }

    private JsonNode dataOf(ResultActions ra) throws Exception {
        String json = ra.andReturn().getResponse().getContentAsString();
        return om.readTree(json.isBlank() ? "{}" : json).path("data");
    }
}
