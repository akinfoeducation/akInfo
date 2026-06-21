Feature: Lead duplicate prevention & ownership protection
  As the AKT Institute admin team
  We need duplicate leads blocked across every number a lead carries
  And warm leads locked to the caller who is working them
  So that two callers never chase the same student and no one loses a hot lead

  Background:
    Given an admin and two callers are logged in

  # ═══════════════════════════ Duplicate prevention ════════════════════════════

  # Req 1/3 — the primary number is already in the system as a primary number
  Scenario: Duplicate primary number is rejected
    Given an active lead exists for a new phone number
    When a lead is created with that same primary number
    Then the lead creation is rejected as DUPLICATE_RESOURCE

  # Req 2/3, P0 Gap 2 — new PRIMARY number collides with an existing ALTERNATE number
  Scenario: A new primary number matching an existing alternate number is rejected
    Given an active lead exists with a primary and an alternate number
    When a lead is created whose primary number equals the existing alternate number
    Then the lead creation is rejected as DUPLICATE_RESOURCE

  # Req 2/3, P0 Gap 2 — new ALTERNATE number collides with an existing PRIMARY number
  Scenario: A new alternate number matching an existing primary number is rejected
    Given an active lead exists for a new phone number
    When a lead is created whose alternate number equals the existing primary number
    Then the lead creation is rejected as DUPLICATE_RESOURCE

  # C9 contrast — a dead/closed number is NOT a duplicate; it re-enters and re-routes
  Scenario: A dead number is not treated as a duplicate
    Given a closed lead exists for a new phone number
    When a lead is created with that same primary number
    Then the lead is created successfully

  # P0 Gap 1 — the database is the final authority even on a direct insert (race net)
  Scenario: The database rejects a second active lead for the same number
    Given an active lead exists for a new phone number
    When a second active lead with that same number is inserted directly into the database
    Then the database rejects it with a unique-constraint violation

  # ═══════════════════════════ Ownership protection ════════════════════════════

  # P0 Gap 3 — a direct read by id must respect ownership, not just the list filter
  Scenario: A caller cannot open a lead owned by another caller
    Given a lead is assigned to the first caller
    When the second caller opens the lead by id
    Then the read is rejected as ACCESS_DENIED
    And the first caller can open the lead by id

  # P0 Gap 3 — the action panel must not leak an unowned lead's state
  Scenario: A caller cannot see the action panel of a lead owned by another caller
    Given a lead is assigned to the first caller
    When the second caller requests the action panel
    Then the read is rejected as ACCESS_DENIED

  # Req 7, P0 Gap 4 — a CALLBACK lead is locked to its caller
  Scenario: A CALLBACK lead cannot be reassigned to another caller
    Given a lead is assigned to the first caller
    And the first caller marks the lead as callback
    When the admin reassigns the lead to the second caller
    Then the reassignment is rejected as LEAD_OWNERSHIP_LOCKED
    And the lead is still owned by the first caller

  # Req 7, P0 Gap 4 — an INTERESTED lead is locked to its caller
  Scenario: An INTERESTED lead cannot be reassigned to another caller
    Given a lead is assigned to the first caller
    And the first caller marks the lead as interested
    When the admin reassigns the lead to the second caller
    Then the reassignment is rejected as LEAD_OWNERSHIP_LOCKED
    And the lead is still owned by the first caller

  # Req 8 contrast — a NOT_CONNECTED lead stays freely reassignable
  Scenario: A NOT_CONNECTED lead can be reassigned to another caller
    Given a lead is assigned to the first caller
    And the first caller marks the lead as not connected
    When the admin reassigns the lead to the second caller
    Then the lead is owned by the second caller

  # P0 Gap 4 — the bulk path honours the lock too
  Scenario: Bulk reassign moves free leads but leaves locked leads with their caller
    Given a lead is assigned to the first caller
    And the first caller marks the lead as callback
    And a second lead is assigned to the first caller
    When the admin bulk reassigns both leads to the second caller
    Then one lead is reported locked
    And one lead is reported reassigned
    And the callback lead is still owned by the first caller

  # ═══════════════════ Caller update path (the real workflow) ═══════════════════

  # Caller creation — admin seeds numbers, but a caller may also create directly
  Scenario: A caller can create a lead directly
    When the first caller creates a lead for a new phone number
    Then the lead is created successfully

  # Req 6, caller-update path — an alternate number belonging to ANOTHER active lead
  # is dropped (not saved), while every other field on the call still saves
  Scenario: A conflicting alternate number is dropped on update but other fields are saved
    Given another active lead exists holding a known number
    And a lead is assigned to the first caller
    When the first caller updates that lead with the known number as the alternate and a new note
    Then the update succeeds
    And the alternate number was not saved
    And the new note was saved
    And the update reports a duplicate conflict

  # Contrast — a fresh alternate number saves normally with no popup
  Scenario: A fresh alternate number is saved on update
    Given a lead is assigned to the first caller
    When the first caller updates that lead with a fresh alternate number
    Then the update succeeds
    And the alternate number was saved
    And the update reports no duplicate conflict

  # ═══════════════════ Real-time lookup (backs the popup) ═══════════════════════

  # Req 6 — a caller can check a number and see it exists + who owns it (cross-caller)
  Scenario: Looking up an existing number returns the lead's status and owner
    Given a lead is assigned to the first caller
    When the second caller looks up that lead's phone number
    Then the lookup says the number exists
    And the lookup shows it is owned by the first caller

  # Req 6 — an unknown number is free to use
  Scenario: Looking up an unknown number returns not found
    When the second caller looks up a brand-new phone number
    Then the lookup says the number does not exist
