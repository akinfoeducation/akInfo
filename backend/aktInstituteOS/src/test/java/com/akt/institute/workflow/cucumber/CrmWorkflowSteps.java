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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.io.ByteArrayOutputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

/**
 * Step definitions for crm-workflow.feature. One instance per scenario (Cucumber
 * glue scope), so the instance fields below hold that scenario's state.
 *
 * Each @Given/@When/@Then is a thin wrapper over an API call via MockMvc — the
 * .feature file is the readable source of truth; this is just the glue.
 */
public class CrmWorkflowSteps {

    // caller (V25) & counsellor (V31) share this hash; plaintext is "caller123".
    private static final String SEED_PASSWORD = "caller123";
    private static final String SEED_PW_HASH =
        "$2b$10$CkK.SfCP/fTNzhbUo1FjgO0ZeN5KV9HIjLR4NGycmrsHtNeAM.qEu";
    private static final String FUTURE_VISIT = "2026-09-10T10:00";

    private static final AtomicInteger SEQ = new AtomicInteger(10_000_000);

    private static final Map<String, String> LABEL_TO_ACTION = Map.of(
        "Called - Reached", "MARK_CONTACTED",
        "Interested",       "MARK_INTERESTED",
        "Not Connected",    "CALL_NOT_CONNECTED",
        "Student Visited",  "STUDENT_VISITED");

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper om;
    @Autowired private JdbcTemplate jdbc;

    private record Auth(String token, long userId) {}

    // ── per-scenario state ──────────────────────────────────────────────────
    private Auth admin, caller, counsellor, accountant, otherCaller, otherCounsellor;
    private long courseId, batchId, batchId2, leadId, bookingId, admissionId;
    private int seatsBefore, seatsBefore2;
    private String c9Phone;               // C9 — phone shared by the closed lead and the re-import
    private long admittedLeadId, deadLeadId; // stage-filter scenario
    private ResultActions lastResponse;   // for "the request is rejected as ..."

    // ═══════════════════════════ Background ══════════════════════════════════

    @Given("an admin, a caller, a counsellor and an accountant are logged in")
    public void everyoneLoggedIn() throws Exception {
        admin      = login("admin", "admin");
        caller     = login("caller", SEED_PASSWORD);
        counsellor = login("neha.counsellor", SEED_PASSWORD);
        accountant = createAndLoginAccountant();
    }

    @Given("a course with a batch of {int} seats exists")
    public void aCourseWithBatch(int seats) throws Exception {
        courseId = createCourse(admin);
        batchId  = createBatch(admin, courseId, seats);
        seatsBefore = availableSeats(batchId);
    }

    // ═══════════════════════════ Givens (lead states) ════════════════════════

    @Given("a new {word} lead assigned to the caller")
    public void newLeadAssigned(String deliveryMode) throws Exception {
        leadId = createLead(admin, deliveryMode, "REFERRAL", null);
        assignLead(admin, leadId, caller.userId());
    }

    @Given("a walk-in lead with no caller")
    public void walkInLead() throws Exception {
        leadId = createLead(admin, "OFFLINE", "WALK_IN", null);
    }

    @Given("a lead in VISIT_PLANNED")
    public void leadInVisitPlanned() throws Exception {
        newLeadAssigned("OFFLINE");
        ok(action(caller, "MARK_CONTACTED"));
        ok(action(caller, "MARK_INTERESTED"));
        ok(action(caller, "PLAN_VISIT", Map.of("visitDate", FUTURE_VISIT)));
    }

    @Given("a lead handed off to the counsellor at VISIT_DONE")
    public void leadHandedOff() throws Exception {
        leadInVisitPlanned();
        ok(action(caller, "STUDENT_VISITED", Map.of("counsellorId", counsellor.userId())));
    }

    @Given("a lead at BOOKING_CONFIRMED")
    public void leadAtBookingConfirmed() throws Exception {
        leadHandedOff();
        ok(action(counsellor, "START_NEGOTIATION"));
        bookingId = createBooking(counsellor, leadId, batchId, "ADMISSION_CLOSING");
        uploadProof(counsellor, bookingId);
        ok(verifyBooking(accountant, bookingId));
    }

    @Given("a booking created by the admin who will try to verify it")
    public void bookingCreatedByAdmin() throws Exception {
        leadId = createLead(admin, "ONLINE", "WEBSITE", null);
        bookingId = createBooking(admin, leadId, batchId, "REMOTE_TOKEN");
    }

    // ═══════════════════════════ Whens — caller ══════════════════════════════

    @When("the caller marks {string}")
    public void callerMarks(String label) throws Exception {
        ok(action(caller, LABEL_TO_ACTION.get(label)));
    }

    @When("the caller plans a visit")
    public void callerPlansVisit() throws Exception {
        ok(action(caller, "PLAN_VISIT", Map.of("visitDate", FUTURE_VISIT)));
    }

    @When("the caller reschedules the visit")
    public void callerReschedulesVisit() throws Exception {
        ok(action(caller, "RESCHEDULE_VISIT", Map.of("visitDate", FUTURE_VISIT)));
    }

    @When("the caller requests a callback")
    public void callerRequestsCallback() throws Exception {
        ok(action(caller, "REQUEST_CALLBACK"));
    }

    @When("the caller schedules a follow-up")
    public void callerSchedulesFollowUp() throws Exception {
        ok(action(caller, "SCHEDULE_FOLLOW_UP"));
    }

    @When("the caller marks {string} and hands off to the counsellor")
    public void studentVisitedHandoff(String label) throws Exception {
        ok(action(caller, LABEL_TO_ACTION.get(label), Map.of("counsellorId", counsellor.userId())));
    }

    @When("the caller confirms a remote admission")
    public void confirmRemoteAdmission() throws Exception {
        ok(action(caller, "CONFIRM_REMOTE_ADMISSION"));
    }

    @When("the caller creates a {word} booking and uploads proof")
    public void callerCreatesBooking(String type) throws Exception {
        bookingId = createBooking(caller, leadId, batchId, type);
        uploadProof(caller, bookingId);
    }

    @When("the caller marks the lead not connected")
    public void callerMarksNotConnected() throws Exception {
        ok(action(caller, "CALL_NOT_CONNECTED"));
    }

    @When("the caller transfers the lead to another branch")
    public void callerTransfersBranch() throws Exception {
        long branchId = ensureBranchId();
        ok(send(HttpMethod.POST, "/api/v1/leads/" + leadId + "/transfer-branch", caller,
            Map.of("branchId", branchId, "notes", "Prefers another branch")));
    }

    @When("the {word} marks the lead not interested")
    public void marksNotInterested(String role) throws Exception {
        ok(action(actor(role), "MARK_NOT_INTERESTED", Map.of("reason", "Changed mind")));
    }

    @When("the admin marks the lead not reachable")
    public void adminMarksNotReachable() throws Exception {
        ok(action(admin, "MARK_NOT_REACHABLE", Map.of("reason", "Multiple failed attempts")));
    }

    // ═══════════════════════════ Whens — counsellor ══════════════════════════

    @When("the counsellor starts fee negotiation")
    public void counsellorStartsNegotiation() throws Exception {
        ok(action(counsellor, "START_NEGOTIATION"));
    }

    @When("the counsellor schedules a post-visit follow-up")
    public void counsellorPostVisitFollowUp() throws Exception {
        ok(action(counsellor, "SCHEDULE_POST_VISIT_FOLLOWUP"));
    }

    @When("the counsellor requests documents")
    public void counsellorRequestsDocuments() throws Exception {
        ok(action(counsellor, "REQUEST_DOCUMENTS", Map.of("notes", "10th marksheet + Aadhar")));
    }

    @When("the student submits the documents")
    public void studentSubmitsDocuments() throws Exception {
        ok(action(counsellor, "MARK_DOCUMENTS_RECEIVED"));
    }

    @When("the counsellor creates a booking and uploads payment proof")
    public void counsellorCreatesBooking() throws Exception {
        bookingId = createBooking(counsellor, leadId, batchId, "ADMISSION_CLOSING");
        uploadProof(counsellor, bookingId);
    }

    @When("the counsellor claims the walk-in")
    public void counsellorClaimsWalkIn() throws Exception {
        ok(send(HttpMethod.POST, "/api/v1/leads/" + leadId + "/claim-walk-in", counsellor, null));
    }

    @When("the counsellor opens the admission form")
    public void counsellorOpensAdmissionForm() throws Exception {
        ok(action(counsellor, "START_ADMISSION"));
    }

    @Then("the admission status is {word}")
    public void admissionStatusIs(String status) throws Exception {
        JsonNode admission = dataOf(send(HttpMethod.GET, "/api/v1/admissions/" + admissionId, admin, null));
        assertThat(admission.path("status").asText()).isEqualTo(status);
    }

    @When("the counsellor tries to mark the admission completed")
    public void counsellorTriesMarkAdmissionCompleted() throws Exception {
        lastResponse = send(HttpMethod.PATCH, "/api/v1/admissions/" + admissionId + "/status",
            counsellor, Map.of("status", "COMPLETED"));
    }

    @When("all fees for the admission are paid")
    public void allFeesForAdmissionPaid() {
        jdbc.update("UPDATE admissions SET fees_paid = fees_agreed WHERE id = ?", admissionId);
    }

    @When("the counsellor marks the admission completed")
    public void counsellorMarksAdmissionCompleted() throws Exception {
        ok(send(HttpMethod.PATCH, "/api/v1/admissions/" + admissionId + "/status",
            counsellor, Map.of("status", "COMPLETED")));
    }

    @When("the counsellor creates the admission record")
    public void counsellorCreatesAdmission() throws Exception {
        admissionId = createAdmission(counsellor, leadId, leadPhone());
    }

    @When("the counsellor assigns a batch and enrolls the student")
    public void counsellorEnrolls() throws Exception {
        send(HttpMethod.PATCH, "/api/v1/admissions/" + admissionId + "/batch", counsellor,
            Map.of("batchId", batchId)).andReturn();
        ok(send(HttpMethod.POST, "/api/v1/admissions/" + admissionId + "/enroll", counsellor,
            Map.of("firstName", "Lead", "lastName", "Test", "phone", leadPhone())));
    }

    // ═══════════════════════════ Whens — other actors ════════════════════════

    @When("the accountant verifies the payment")
    public void accountantVerifies() throws Exception {
        ok(verifyBooking(accountant, bookingId));
    }

    @When("the admin reassigns the lead to another counsellor")
    public void adminReassignsCounsellor() throws Exception {
        otherCounsellor = login("ravi.counsellor", SEED_PASSWORD);
        ok(action(admin, "REASSIGN_COUNSELLOR",
            Map.of("counsellorId", otherCounsellor.userId(), "reason", "On leave")));
    }

    @When("the lead has waited in the retry pool over 30 minutes")
    public void leadWaitedInPool() {
        jdbc.update("UPDATE leads SET not_connected_at = now() - interval '31 minutes' WHERE id = ?", leadId);
    }

    @When("another caller claims it from the retry pool")
    public void otherCallerClaims() throws Exception {
        otherCaller = login("rahul.verma", SEED_PASSWORD);
        ok(send(HttpMethod.POST, "/api/v1/leads/retry-pool/" + leadId + "/claim", otherCaller, null));
    }

    @When("the booking is cancelled")
    public void bookingCancelled() throws Exception {
        ok(send(HttpMethod.PATCH, "/api/v1/bookings/" + bookingId + "/cancel?reason=Student+got+a+job",
            admin, null));
    }

    @When("the counsellor cancels the booking")
    public void counsellorCancelsBooking() throws Exception {
        ok(send(HttpMethod.PATCH, "/api/v1/bookings/" + bookingId + "/cancel?reason=Wrong+batch",
            counsellor, null));
    }

    @When("the accountant cancels the booking")
    public void accountantCancelsBooking() throws Exception {
        ok(send(HttpMethod.PATCH, "/api/v1/bookings/" + bookingId + "/cancel?reason=Refund",
            accountant, null));
    }

    @When("the counsellor tries to cancel the booking")
    public void counsellorTriesCancelBooking() throws Exception {
        lastResponse = send(HttpMethod.PATCH, "/api/v1/bookings/" + bookingId + "/cancel?reason=x",
            counsellor, null);
    }

    @When("the counsellor tries to verify the booking")
    public void counsellorTriesVerifyBooking() throws Exception {
        lastResponse = verifyBooking(counsellor, bookingId);
    }

    @When("the admin transfers the lead to another branch")
    public void adminTransfersBranch() throws Exception {
        long bId = ensureBranchId();
        ok(send(HttpMethod.POST, "/api/v1/leads/" + leadId + "/transfer-branch", admin,
            Map.of("branchId", bId, "notes", "Confirmed lead moved")));
    }

    @When("the admission is cancelled")
    public void admissionCancelled() throws Exception {
        ok(send(HttpMethod.PATCH, "/api/v1/admissions/" + admissionId + "/status", admin,
            Map.of("status", "CANCELLED")));
    }

    // ── Whens that are expected to FAIL (stored for a rejection check) ─────────

    @When("the caller tries to mark {string}")
    public void callerTriesToMark(String label) throws Exception {
        lastResponse = action(caller, LABEL_TO_ACTION.get(label));
    }

    @When("the admin uploads proof and tries to verify the booking")
    public void adminTriesSelfVerify() throws Exception {
        uploadProof(admin, bookingId);
        lastResponse = verifyBooking(admin, bookingId);
    }

    @When("the counsellor tries to complete the admission")
    public void counsellorTriesComplete() throws Exception {
        lastResponse = action(counsellor, "COMPLETE_ADMISSION");
    }

    @When("the counsellor tries to mark the lead not interested")
    public void counsellorTriesNotInterested() throws Exception {
        lastResponse = action(counsellor, "MARK_NOT_INTERESTED", Map.of("reason", "Changed mind"));
    }

    @When("the counsellor tries to schedule a follow-up")
    public void counsellorTriesScheduleFollowUp() throws Exception {
        lastResponse = action(counsellor, "SCHEDULE_FOLLOW_UP");
    }

    // C4 / C5 — the legacy backdoor endpoints were removed; hitting them must 404/405.
    @When("a caller hits the removed not-connected endpoint")
    public void hitRemovedNotConnected() throws Exception {
        lastResponse = send(HttpMethod.PATCH, "/api/v1/leads/" + leadId + "/not-connected", caller, null);
    }

    @When("a counsellor hits the removed convert endpoint")
    public void hitRemovedConvert() throws Exception {
        lastResponse = send(HttpMethod.POST, "/api/v1/leads/" + leadId + "/convert", counsellor, null);
    }

    @Then("the endpoint no longer exists")
    public void endpointNoLongerExists() throws Exception {
        // The route is gone, so the legacy backdoor can never succeed. (An unmapped path on this
        // app surfaces as a non-2xx error rather than a clean 404 — see the separate missing-404
        // handler item; here we only assert the backdoor cannot be invoked.)
        int status = lastResponse.andReturn().getResponse().getStatus();
        assertThat(status).as("legacy backdoor must not succeed").isGreaterThanOrEqualTo(400);
    }

    // ═══════════════════════════ Thens ═══════════════════════════════════════

    @Then("the lead status is {word}")
    public void leadStatusIs(String status) throws Exception {
        assertThat(getLead(admin, leadId).path("status").asText()).isEqualTo(status);
    }

    @Then("the lead stage is {word}")
    public void leadStageIs(String stage) throws Exception {
        assertThat(getLead(admin, leadId).path("stage").asText()).isEqualTo(stage);
    }

    @Then("the lead is owned by the counsellor")
    public void leadOwnedByCounsellor() throws Exception {
        JsonNode lead = getLead(admin, leadId);
        assertThat(lead.path("counsellorId").asLong()).isEqualTo(counsellor.userId());
        assertThat(lead.path("assignedToId").asLong()).isEqualTo(counsellor.userId());
    }

    @Then("the lead is owned by the other counsellor")
    public void leadOwnedByOtherCounsellor() throws Exception {
        assertThat(getLead(admin, leadId).path("counsellorId").asLong()).isEqualTo(otherCounsellor.userId());
    }

    @Then("the lead is owned by the other caller")
    public void leadOwnedByOtherCaller() throws Exception {
        assertThat(getLead(admin, leadId).path("assignedToId").asLong()).isEqualTo(otherCaller.userId());
    }

    @Then("the original caller still keeps attribution")
    public void callerKeepsAttribution() throws Exception {
        assertThat(getLead(admin, leadId).path("callerId").asLong()).isEqualTo(caller.userId());
    }

    @Then("one batch seat is deducted")
    public void oneSeatDeducted() {
        assertThat(availableSeats(batchId)).isEqualTo(seatsBefore - 1);
    }

    @Then("the batch seat is restored")
    public void seatRestored() {
        assertThat(availableSeats(batchId)).isEqualTo(seatsBefore);
    }

    @Then("the request is rejected as {word}")
    public void requestRejectedAs(String errorCode) throws Exception {
        var res = lastResponse.andReturn().getResponse();
        assertThat(res.getStatus()).as("HTTP status should be a 4xx rejection").isGreaterThanOrEqualTo(400);
        JsonNode body = om.readTree(res.getContentAsString());
        assertThat(body.path("errorCode").asText()).isEqualTo(errorCode);
    }

    @Then("the action panel does not offer {string} or {string}")
    public void actionPanelDoesNotOffer(String label1, String label2) throws Exception {
        List<String> offered = actionNames(availableActions(caller, leadId));
        assertThat(offered).doesNotContain(LABEL_TO_ACTION.get(label1), LABEL_TO_ACTION.get(label2));
    }

    // ═══════════════════════════ CR8 — rebook onto another batch ══════════════

    @Given("a second batch with {int} seats exists")
    public void aSecondBatch(int seats) throws Exception {
        batchId2 = createBatch(admin, courseId, seats);
        seatsBefore2 = availableSeats(batchId2);
    }

    @When("the counsellor books the lead onto the second batch and the accountant verifies")
    public void rebookOntoSecondBatch() throws Exception {
        bookingId = createBooking(counsellor, leadId, batchId2, "ADMISSION_CLOSING");
        uploadProof(counsellor, bookingId);
        ok(verifyBooking(accountant, bookingId));
    }

    @Then("the second batch has one seat deducted")
    public void secondBatchDeducted() {
        assertThat(availableSeats(batchId2)).isEqualTo(seatsBefore2 - 1);
    }

    // ═══════════════════════════ Pipeline stage filter ════════════════════════

    @Given("an admitted lead and a dead lead exist")
    public void anAdmittedAndDeadLead() throws Exception {
        // Dead lead: assigned to caller, then marked not interested → stage DEAD
        deadLeadId = createLead(admin, "OFFLINE", "REFERRAL", null);
        assignLead(admin, deadLeadId, caller.userId());
        leadId = deadLeadId;
        ok(action(caller, "MARK_NOT_INTERESTED", Map.of("reason", "No")));

        // Admitted lead: full pipeline through to ADMISSION_DONE → stage ADMITTED
        leadAtBookingConfirmed();
        admittedLeadId = leadId;
        counsellorCreatesAdmission();
        counsellorEnrolls();
    }

    @Then("the stage {string} filter shows the {word} lead and hides the {word} lead")
    public void stageFilterShowsAndHides(String stage, String shownRef, String hiddenRef) throws Exception {
        List<Long> ids = leadIdsForStage(stage);
        assertThat(ids).contains(leadRef(shownRef));
        assertThat(ids).doesNotContain(leadRef(hiddenRef));
    }

    private long leadRef(String ref) {
        return switch (ref) {
            case "admitted" -> admittedLeadId;
            case "dead"     -> deadLeadId;
            default -> throw new IllegalArgumentException("Unknown lead ref: " + ref);
        };
    }

    private List<Long> leadIdsForStage(String stage) throws Exception {
        JsonNode data = dataOf(send(HttpMethod.GET, "/api/v1/leads?size=100&stage=" + stage, admin, null));
        return java.util.stream.StreamSupport.stream(data.spliterator(), false)
            .map(n -> n.path("id").asLong()).toList();
    }

    // ═══════════════════════════ C9 — same-number routing ═════════════════════

    @Given("a lead from a phone number, assigned to the caller, is closed")
    public void aClosedLeadAssignedToCaller() throws Exception {
        c9Phone = nextPhone();
        leadId = createLead(admin, "OFFLINE", "REFERRAL", null, c9Phone);
        assignLead(admin, leadId, caller.userId());                 // stamps caller_id permanently
        ok(action(caller, "MARK_NOT_INTERESTED", Map.of("reason", "Not now")));
        assertThat(getLead(admin, leadId).path("status").asText()).isEqualTo("NOT_INTERESTED");
    }

    @When("the same phone number is re-imported")
    public void thePhoneIsReImported() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
            "file", "leads.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            singlePhoneWorkbook(c9Phone));
        ok(mvc.perform(multipart("/api/v1/leads/bulk-import")
            .file(file)
            .header("Authorization", "Bearer " + admin.token())));
    }

    @Then("the new lead is auto-assigned to the same caller")
    public void newLeadAutoAssignedToCaller() throws Exception {
        Long newLeadId = jdbc.queryForObject(
            "SELECT id FROM leads WHERE phone = ? AND id <> ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1",
            Long.class, c9Phone, leadId);
        assertThat(newLeadId).as("re-import should have created a fresh lead for the returning number").isNotNull();

        JsonNode newLead = getLead(admin, newLeadId);
        assertThat(newLead.path("assignedToId").asLong()).isEqualTo(caller.userId());
        assertThat(newLead.path("status").asText()).isEqualTo("ASSIGNED");
    }

    /** A minimal .xlsx with a header row and one data row (date col + mobile col). */
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

    // ═══════════════════════════ Helpers ═════════════════════════════════════

    private Auth actor(String role) {
        return switch (role) {
            case "caller"     -> caller;
            case "counsellor" -> counsellor;
            case "admin"      -> admin;
            case "accountant" -> accountant;
            default -> throw new IllegalArgumentException("Unknown role: " + role);
        };
    }

    private Auth login(String userOrEmail, String pass) throws Exception {
        JsonNode data = dataOf(mvc.perform(request(HttpMethod.POST, "/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(om.writeValueAsString(Map.of("emailOrUsername", userOrEmail, "password", pass)))));
        return new Auth(data.path("accessToken").asText(), data.path("user").path("id").asLong());
    }

    private Auth createAndLoginAccountant() throws Exception {
        jdbc.update("""
            INSERT INTO users (uuid, institute_id, username, email, password_hash,
                               first_name, last_name, is_active, is_email_verified)
            VALUES (gen_random_uuid()::text, 1, 'accountant.test', 'accountant.test@akt.in', ?,
                    'Acc', 'Tant', TRUE, TRUE)
            ON CONFLICT (username, institute_id) DO NOTHING
            """, SEED_PW_HASH);
        jdbc.update("""
            INSERT INTO user_roles (user_id, role_id)
            SELECT u.id, r.id FROM users u CROSS JOIN roles r
            WHERE u.username = 'accountant.test' AND u.institute_id = 1
              AND r.code = 'ACCOUNTANT' AND r.institute_id = 1
            ON CONFLICT DO NOTHING
            """);
        return login("accountant.test", SEED_PASSWORD);
    }

    private ResultActions action(Auth as, String action) throws Exception {
        return action(as, action, Map.of());
    }

    private ResultActions action(Auth as, String action, Map<String, Object> extras) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("action", action);
        body.putAll(extras);
        return send(HttpMethod.POST, "/api/v1/leads/" + leadId + "/actions", as, body);
    }

    private long createCourse(Auth as) throws Exception {
        String code = "TC" + SEQ.incrementAndGet();
        return dataOf(send(HttpMethod.POST, "/api/v1/courses", as, Map.of(
            "name", "Test Course " + code, "code", code, "durationWeeks", 8, "fees", 10000)))
            .path("id").asLong();
    }

    private long createBatch(Auth as, long courseId, int capacity) throws Exception {
        return dataOf(send(HttpMethod.POST, "/api/v1/courses/" + courseId + "/batches", as, Map.of(
            "name", "Batch " + SEQ.incrementAndGet(), "mode", "OFFLINE", "maxCapacity", capacity)))
            .path("id").asLong();
    }

    private long createLead(Auth as, String deliveryMode, String source, Long assignedToId) throws Exception {
        return createLead(as, deliveryMode, source, assignedToId, nextPhone());
    }

    private long createLead(Auth as, String deliveryMode, String source, Long assignedToId, String phone) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("firstName", "Lead");
        body.put("lastName", "Test");
        body.put("phone", phone);
        body.put("deliveryMode", deliveryMode);
        body.put("courseInterested", "Test Course");
        body.put("source", source);
        if (assignedToId != null) body.put("assignedToId", assignedToId);
        return dataOf(send(HttpMethod.POST, "/api/v1/leads", as, body)).path("id").asLong();
    }

    private String nextPhone() {
        return "9" + String.format("%09d", SEQ.incrementAndGet());
    }

    private void assignLead(Auth as, long leadId, long callerId) throws Exception {
        send(HttpMethod.PATCH, "/api/v1/leads/" + leadId + "/assign", as, Map.of("callerId", callerId)).andReturn();
    }

    private long createBooking(Auth as, long leadId, long batchId, String bookingType) throws Exception {
        return dataOf(send(HttpMethod.POST, "/api/v1/leads/" + leadId + "/booking", as, Map.of(
            "batchId", batchId, "paymentAmount", 5000, "bookingType", bookingType))).path("id").asLong();
    }

    private void uploadProof(Auth as, long bookingId) throws Exception {
        send(HttpMethod.PATCH, "/api/v1/bookings/" + bookingId
            + "/payment-proof?proofUrl=https://example.com/proof.png", as, null).andReturn();
    }

    private ResultActions verifyBooking(Auth as, long bookingId) throws Exception {
        return send(HttpMethod.PATCH, "/api/v1/bookings/" + bookingId + "/verify", as, null);
    }

    private long createAdmission(Auth as, long leadId, String phone) throws Exception {
        return dataOf(send(HttpMethod.POST, "/api/v1/admissions", as, Map.of(
            "leadId", leadId, "firstName", "Lead", "lastName", "Test",
            "phone", phone, "courseName", "Test Course", "feesAgreed", 5000))).path("id").asLong();
    }

    private JsonNode getLead(Auth as, long leadId) throws Exception {
        return dataOf(send(HttpMethod.GET, "/api/v1/leads/" + leadId, as, null));
    }

    private JsonNode availableActions(Auth as, long leadId) throws Exception {
        return dataOf(send(HttpMethod.GET, "/api/v1/leads/" + leadId + "/available-actions", as, null));
    }

    private String leadPhone() throws Exception {
        return getLead(admin, leadId).path("phone").asText();
    }

    /** A branch to transfer to — uses an existing one, or creates a minimal one. */
    private long ensureBranchId() throws Exception {
        JsonNode branches = dataOf(send(HttpMethod.GET, "/api/v1/leads/branches", caller, null));
        if (branches.isArray() && branches.size() > 0) {
            return branches.get(0).path("id").asLong();
        }
        jdbc.update("""
            INSERT INTO branches (uuid, institute_id, name, code, is_active, created_at, updated_at)
            VALUES (gen_random_uuid()::text, 1, 'Test Branch', 'TB-' || ?, TRUE, now(), now())
            """, SEQ.incrementAndGet());
        return jdbc.queryForObject(
            "SELECT id FROM branches WHERE institute_id = 1 ORDER BY id DESC LIMIT 1", Long.class);
    }

    private int availableSeats(long batchId) {
        Integer n = jdbc.queryForObject("SELECT available_seats FROM batches WHERE id = ?", Integer.class, batchId);
        return n == null ? -1 : n;
    }

    private List<String> actionNames(JsonNode arr) {
        return java.util.stream.StreamSupport.stream(arr.spliterator(), false)
            .map(n -> n.path("action").asText()).toList();
    }

    private ResultActions send(HttpMethod method, String path, Auth as, Object body) throws Exception {
        MockHttpServletRequestBuilder rb = request(method, path);
        if (as != null) rb.header("Authorization", "Bearer " + as.token());
        if (body != null) rb.contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(body));
        return mvc.perform(rb);
    }

    /** Assert a 2xx and return the response (fails the step with a clear message otherwise). */
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
