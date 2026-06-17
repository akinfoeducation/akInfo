Feature: CRM lead-to-admission workflow
  As AKT Institute staff working the action-driven pipeline
  We perform named actions ("what happened?")
  So that status, ownership, payments and admissions stay correct automatically

  Background:
    Given an admin, a caller, a counsellor and an accountant are logged in
    And a course with a batch of 5 seats exists

  # C1 — most common positive flow, end to end
  Scenario: Offline happy path - caller to counsellor to admission
    Given a new OFFLINE lead assigned to the caller
    When the caller marks "Called - Reached"
    And the caller marks "Interested"
    And the caller plans a visit
    And the caller marks "Student Visited" and hands off to the counsellor
    Then the lead status is VISIT_DONE
    And the lead is owned by the counsellor
    And the original caller still keeps attribution
    When the counsellor starts fee negotiation
    And the counsellor creates a booking and uploads payment proof
    And the accountant verifies the payment
    Then the lead status is BOOKING_CONFIRMED
    And one batch seat is deducted
    When the counsellor creates the admission record
    And the counsellor assigns a batch and enrolls the student
    Then the lead status is ADMISSION_DONE
    And the lead stage is ADMITTED

  # C7 — online course, no physical visit
  Scenario: Online remote booking - no physical visit
    Given a new ONLINE lead assigned to the caller
    When the caller marks "Called - Reached"
    And the caller marks "Interested"
    And the caller confirms a remote admission
    And the caller creates a REMOTE_TOKEN booking and uploads proof
    And the accountant verifies the payment
    Then the lead status is BOOKING_CONFIRMED

  # CR1 — student walks in with no prior caller
  Scenario: Walk-in claim - counsellor owns from the start
    Given a walk-in lead with no caller
    When the counsellor claims the walk-in
    Then the lead status is VISIT_DONE
    And the lead is owned by the counsellor

  # Key Rule 1 — separation of duties
  Scenario: A booking's creator cannot verify their own payment
    Given a booking created by the admin who will try to verify it
    When the admin uploads proof and tries to verify the booking
    Then the request is rejected as SELF_VERIFY_DENIED

  # Action-driven integrity — no backward transitions
  Scenario: A planned visit cannot be regressed by a call action
    Given a lead in VISIT_PLANNED
    When the caller tries to mark "Called - Reached"
    Then the request is rejected as INVALID_WORKFLOW_TRANSITION
    And the action panel does not offer "Called - Reached" or "Not Connected"

  # Key Rule 5 — admission done only after the student exists
  Scenario: Admission is finalised only after the student record is created
    Given a lead at BOOKING_CONFIRMED
    When the counsellor creates the admission record
    Then the lead status is ADMISSION_IN_PROGRESS
    When the counsellor tries to complete the admission
    Then the request is rejected as STUDENT_RECORD_MISSING
    When the counsellor assigns a batch and enrolls the student
    Then the lead status is ADMISSION_DONE
    And the lead stage is ADMITTED

  # Regression — opening the admission form (START_ADMISSION) must not wedge the
  # lead out of ever creating its admission record.
  Scenario: Admission record can still be created after the form was opened
    Given a lead at BOOKING_CONFIRMED
    When the counsellor opens the admission form
    Then the lead status is ADMISSION_IN_PROGRESS
    When the counsellor creates the admission record
    Then the lead status is ADMISSION_IN_PROGRESS
    When the counsellor assigns a batch and enrolls the student
    Then the lead status is ADMISSION_DONE
    And the lead stage is ADMITTED

  # Admission status auto-advances to ENROLLED once the student record is created.
  Scenario: Enrolling the student marks the admission ENROLLED
    Given a lead at BOOKING_CONFIRMED
    When the counsellor creates the admission record
    Then the admission status is PENDING
    When the counsellor assigns a batch and enrolls the student
    Then the admission status is ENROLLED

  # An admission cannot be marked COMPLETED while fees are still outstanding.
  Scenario: Admission cannot be completed while fees are due
    Given a lead at BOOKING_CONFIRMED
    When the counsellor creates the admission record
    And the counsellor assigns a batch and enrolls the student
    And the counsellor tries to mark the admission completed
    Then the request is rejected as FEES_OUTSTANDING
    When all fees for the admission are paid
    And the counsellor marks the admission completed
    Then the admission status is COMPLETED

  # C2 — multiple touchpoints before the lead commits
  Scenario: Follow-up loop - callback then follow-up then interested
    Given a new OFFLINE lead assigned to the caller
    When the caller marks "Called - Reached"
    And the caller requests a callback
    Then the lead status is CALLBACK
    When the caller schedules a follow-up
    Then the lead status is FOLLOW_UP
    When the caller marks "Interested"
    And the caller plans a visit
    Then the lead status is VISIT_PLANNED

  # C3 — no answer, lead rests in the shared pool, another caller reclaims it
  Scenario: Not connected - reclaimed from the retry pool by another caller
    Given a new OFFLINE lead assigned to the caller
    When the caller marks the lead not connected
    Then the lead status is NOT_CONNECTED
    When the lead has waited in the retry pool over 30 minutes
    And another caller claims it from the retry pool
    Then the lead is owned by the other caller

  # C4 — repeated failures, admin gives up
  Scenario: Not reachable - admin marks the lead dead
    Given a new OFFLINE lead assigned to the caller
    When the caller marks the lead not connected
    And the admin marks the lead not reachable
    Then the lead status is NOT_REACHABLE
    And the lead stage is DEAD

  # C5 — clean exit
  Scenario: Lead says not interested
    Given a new OFFLINE lead assigned to the caller
    When the caller marks "Called - Reached"
    And the caller marks "Interested"
    And the caller marks the lead not interested
    Then the lead status is NOT_INTERESTED
    And the lead stage is DEAD

  # C6 — lead wants a different location (source side closes)
  Scenario: Branch transfer closes the source lead
    Given a new OFFLINE lead assigned to the caller
    When the caller marks "Called - Reached"
    And the caller marks "Interested"
    And the caller transfers the lead to another branch
    Then the lead status is CLOSED

  # C8 — agreed to visit, did not show, caller reschedules
  Scenario: Visit no-show - caller reschedules
    Given a lead in VISIT_PLANNED
    When the caller reschedules the visit
    Then the lead status is VISIT_PLANNED

  # CR2 — student needs time after the visit
  Scenario: Post-visit follow-up before negotiation
    Given a lead handed off to the counsellor at VISIT_DONE
    When the counsellor schedules a post-visit follow-up
    Then the lead status is FOLLOW_UP_AFTER_VISIT
    When the counsellor starts fee negotiation
    Then the lead status is NEGOTIATION

  # CR4 — documents required before admission
  Scenario: Document pending then received
    Given a lead at BOOKING_CONFIRMED
    When the counsellor requests documents
    Then the lead status is DOCUMENT_PENDING
    When the student submits the documents
    Then the lead status is ADMISSION_IN_PROGRESS

  # CR6 — counsellor goes on leave, admin reassigns
  Scenario: Counsellor reassignment preserves caller attribution
    Given a lead handed off to the counsellor at VISIT_DONE
    When the admin reassigns the lead to another counsellor
    Then the lead is owned by the other counsellor
    And the original caller still keeps attribution

  # CR7 — student backs out after paying
  Scenario: Booking cancelled after payment restores the seat
    Given a lead at BOOKING_CONFIRMED
    When the booking is cancelled
    Then the batch seat is restored
    And the lead status is ADMISSION_INTERESTED

  # CR10 — sat through counselling, decided not to join
  Scenario: Visit done but the student drops out
    Given a lead handed off to the counsellor at VISIT_DONE
    When the counsellor marks the lead not interested
    Then the lead status is NOT_INTERESTED
    And the lead stage is DEAD

  # Pipeline stage tabs — the leads list filters by stage (derived from status)
  Scenario: Leads list can be filtered by pipeline stage
    Given an admitted lead and a dead lead exist
    Then the stage "ADMITTED" filter shows the admitted lead and hides the dead lead
    And the stage "DEAD" filter shows the dead lead and hides the admitted lead

  # C9 — a returning number whose only prior lead is dead/closed is re-imported
  # and auto-routed back to the caller who handled it before (within 90 days).
  Scenario: Returning lead is auto-routed to the previous caller
    Given a lead from a phone number, assigned to the caller, is closed
    When the same phone number is re-imported
    Then the new lead is auto-assigned to the same caller

  # CR8 — student wants a different batch; cancel and rebook moves the seat
  Scenario: Cancellation rebooked onto a different batch moves the seat
    Given a second batch with 5 seats exists
    And a lead at BOOKING_CONFIRMED
    When the booking is cancelled
    Then the batch seat is restored
    When the counsellor books the lead onto the second batch and the accountant verifies
    Then the second batch has one seat deducted
