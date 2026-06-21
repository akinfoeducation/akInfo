package com.akt.institute.workflow.cucumber;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.io.ByteArrayOutputStream;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

/**
 * Step definitions for lead-intake-qualification.feature. Self-contained (own
 * helpers) so it shares no state with the other glue classes. Phones are generated
 * per scenario from a static counter (the test DB is shared across scenarios).
 */
public class LeadIntakeQualificationSteps {

    private static final String SEED_PASSWORD = "caller123";
    private static final AtomicInteger SEQ = new AtomicInteger(60_000_000);

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper om;
    @Autowired private JdbcTemplate jdbc;

    private record Auth(String token, long userId) {}

    private Auth admin, caller, counsellor;
    private long leadId;
    private String phone;
    private ResultActions lastResponse;

    @Given("an admin and a caller are ready")
    public void loggedIn() throws Exception {
        admin  = login("admin", "admin");
        caller = login("caller", SEED_PASSWORD);
    }

    // ── Minimal intake ────────────────────────────────────────────────────────

    @When("a lead is created with only a mobile number")
    public void createMinimalLead() throws Exception {
        phone = nextPhone();
        leadId = dataOf(ok(send(HttpMethod.POST, "/api/v1/leads", admin,
            Map.of("phone", phone)))).path("id").asLong();
        lastResponse = send(HttpMethod.GET, "/api/v1/leads/" + leadId, admin, null);
    }

    @Then("the minimal lead is created successfully")
    public void leadCreated() throws Exception {
        ok(lastResponse);
    }

    @Then("the lead's name defaults to its phone number")
    public void nameDefaultsToPhone() throws Exception {
        assertThat(dataOf(lastResponse).path("firstName").asText()).isEqualTo(phone);
    }

    @Then("the lead's source is {word}")
    public void leadSourceIs(String source) throws Exception {
        assertThat(getLead(leadId).path("source").asText()).isEqualTo(source);
    }

    // ── Source classification ─────────────────────────────────────────────────

    @When("a phone number is bulk-imported")
    public void bulkImport() throws Exception {
        phone = nextPhone();
        var file = new org.springframework.mock.web.MockMultipartFile(
            "file", "leads.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            singlePhoneWorkbook(phone));
        ok(mvc.perform(multipart("/api/v1/leads/bulk-import")
            .file(file)
            .header("Authorization", "Bearer " + admin.token())));
    }

    @Then("the imported lead's source is {word}")
    public void importedLeadSourceIs(String source) {
        String actual = jdbc.queryForObject(
            "SELECT source FROM leads WHERE phone = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1",
            String.class, phone);
        assertThat(actual).isEqualTo(source);
    }

    // ── Delivery-mode gate ────────────────────────────────────────────────────

    @Given("a minimal lead is assigned to the caller")
    public void minimalLeadAssigned() throws Exception {
        phone = nextPhone();
        leadId = dataOf(ok(send(HttpMethod.POST, "/api/v1/leads", admin,
            Map.of("phone", phone)))).path("id").asLong();
        ok(send(HttpMethod.PATCH, "/api/v1/leads/" + leadId + "/assign", admin,
            Map.of("callerId", caller.userId())));
    }

    @When("the caller tries to plan a visit")
    public void callerTriesPlanVisit() throws Exception {
        lastResponse = send(HttpMethod.POST, "/api/v1/leads/" + leadId + "/actions", caller,
            Map.of("action", "PLAN_VISIT", "visitDate", "2026-09-10T10:00"));
    }

    @When("the caller tries to hand off the lead to a counsellor")
    public void callerTriesHandoff() throws Exception {
        counsellor = login("neha.counsellor", SEED_PASSWORD);
        lastResponse = send(HttpMethod.POST, "/api/v1/leads/" + leadId + "/handoff", caller,
            Map.of("counsellorId", counsellor.userId()));
    }

    @When("the caller sets the lead's delivery mode to {word}")
    public void callerSetsDeliveryMode(String mode) throws Exception {
        ok(send(HttpMethod.PUT, "/api/v1/leads/" + leadId, caller, Map.of("deliveryMode", mode)));
    }

    @When("the caller plans the visit")
    public void callerPlansVisit() throws Exception {
        ok(send(HttpMethod.POST, "/api/v1/leads/" + leadId + "/actions", caller,
            Map.of("action", "PLAN_VISIT", "visitDate", "2026-09-10T10:00")));
    }

    @Then("the action is rejected as {word}")
    public void actionRejected(String errorCode) throws Exception {
        var res = lastResponse.andReturn().getResponse();
        assertThat(res.getStatus()).as("expected a 4xx but got " + res.getStatus()
            + ": " + res.getContentAsString()).isGreaterThanOrEqualTo(400);
        assertThat(om.readTree(res.getContentAsString()).path("errorCode").asText()).isEqualTo(errorCode);
    }

    @When("the caller sets a callback for later")
    public void callerSetsCallback() throws Exception {
        lastResponse = send(HttpMethod.POST, "/api/v1/leads/" + leadId + "/actions", caller,
            Map.of("action", "REQUEST_CALLBACK", "followUpAt", "2026-09-10T18:00"));
    }

    @When("the caller marks the lead invalid with a reason")
    public void callerMarksInvalidWithReason() throws Exception {
        lastResponse = send(HttpMethod.POST, "/api/v1/leads/" + leadId + "/actions", caller,
            Map.of("action", "MARK_INVALID", "reason", "Wrong number"));
    }

    @When("the caller marks the lead invalid without a reason")
    public void callerMarksInvalidNoReason() throws Exception {
        lastResponse = send(HttpMethod.POST, "/api/v1/leads/" + leadId + "/actions", caller,
            Map.of("action", "MARK_INVALID"));
    }

    @Then("the qualified lead status is {word}")
    public void qualifiedLeadStatusIs(String status) throws Exception {
        assertThat(getLead(leadId).path("status").asText()).isEqualTo(status);
    }

    @Then("the qualified lead stage is {word}")
    public void qualifiedLeadStageIs(String stage) throws Exception {
        assertThat(getLead(leadId).path("stage").asText()).isEqualTo(stage);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Auth login(String userOrEmail, String pass) throws Exception {
        JsonNode data = dataOf(mvc.perform(request(HttpMethod.POST, "/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(om.writeValueAsString(Map.of("emailOrUsername", userOrEmail, "password", pass)))));
        return new Auth(data.path("accessToken").asText(), data.path("user").path("id").asLong());
    }

    private JsonNode getLead(long id) throws Exception {
        return dataOf(send(HttpMethod.GET, "/api/v1/leads/" + id, admin, null));
    }

    private String nextPhone() {
        return "9" + String.format("%09d", SEQ.incrementAndGet());
    }

    private byte[] singlePhoneWorkbook(String phone) throws Exception {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Leads");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Date");
            header.createCell(1).setCellValue("Mobile");
            Row data = sheet.createRow(1);
            data.createCell(0).setCellValue("2026-06-06");
            data.createCell(1).setCellValue(phone);
            wb.write(out);
            return out.toByteArray();
        }
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
