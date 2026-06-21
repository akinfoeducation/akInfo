Feature: Lead intake & qualification
  As AKT Institute staff
  We capture leads with minimal info at intake
  And qualify them later, where delivery mode is required before advancing
  So intake stays fast and the pipeline never proceeds on missing information

  Background:
    Given an admin and a caller are ready

  # ── Minimal intake ──────────────────────────────────────────────────────────

  Scenario: A lead can be created with only a mobile number
    When a lead is created with only a mobile number
    Then the minimal lead is created successfully
    And the lead's name defaults to its phone number
    And the lead's source is UNKNOWN

  # ── Source classification ───────────────────────────────────────────────────

  Scenario: A bulk-imported lead is classified as IMPORTED, not WALK_IN
    When a phone number is bulk-imported
    Then the imported lead's source is IMPORTED

  # ── Delivery-mode gate (qualification) ──────────────────────────────────────

  Scenario: Planning a visit is blocked until delivery mode is set
    Given a minimal lead is assigned to the caller
    When the caller tries to plan a visit
    Then the action is rejected as DELIVERY_MODE_REQUIRED
    When the caller sets the lead's delivery mode to OFFLINE
    And the caller plans the visit
    Then the qualified lead status is VISIT_PLANNED

  # The guard also closes the latent handoff gap (null mode skipped the status check)
  Scenario: Counsellor handoff is blocked until delivery mode is set
    Given a minimal lead is assigned to the caller
    When the caller tries to hand off the lead to a counsellor
    Then the action is rejected as DELIVERY_MODE_REQUIRED

  # ── 4-button disposition: Invalid ───────────────────────────────────────────

  Scenario: Marking a lead invalid closes it as a dead lead
    Given a minimal lead is assigned to the caller
    When the caller marks the lead invalid with a reason
    Then the qualified lead status is INVALID
    And the qualified lead stage is DEAD

  Scenario: Marking invalid without a reason is rejected
    Given a minimal lead is assigned to the caller
    When the caller marks the lead invalid without a reason
    Then the action is rejected as INVALID_REASON_REQUIRED

  # ── 4-button disposition: Call Back Later (reached but busy, on the first call) ─

  Scenario: Call Back Later from the first call lands as CALLBACK, not a missed connect
    Given a minimal lead is assigned to the caller
    When the caller sets a callback for later
    Then the qualified lead status is CALLBACK
