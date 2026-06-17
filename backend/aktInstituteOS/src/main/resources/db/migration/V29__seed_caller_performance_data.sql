-- ============================================================
-- V29: Caller Performance Seed Data
-- Institute ID = 1 (AKT Institute Delhi)
-- Creates 4 callers + realistic lead data across multiple dates
-- Password = "Password@123" (bcrypt hash reused from existing caller)
-- ============================================================

-- ── 1. Create 4 Caller users ─────────────────────────────────────────────────

INSERT INTO users (uuid, institute_id, username, email, password_hash,
                   first_name, last_name, phone, is_active, is_email_verified)
VALUES
  (gen_random_uuid()::TEXT, 1, 'rahul.verma',   'rahul.verma@akt.in',   '$2b$10$CkK.SfCP/fTNzhbUo1FjgO0ZeN5KV9HIjLR4NGycmrsHtNeAM.qEu', 'Rahul',   'Verma',   '9811000101', TRUE, TRUE),
  (gen_random_uuid()::TEXT, 1, 'priya.joshi',   'priya.joshi@akt.in',   '$2b$10$CkK.SfCP/fTNzhbUo1FjgO0ZeN5KV9HIjLR4NGycmrsHtNeAM.qEu', 'Priya',   'Joshi',   '9811000102', TRUE, TRUE),
  (gen_random_uuid()::TEXT, 1, 'amit.saxena',   'amit.saxena@akt.in',   '$2b$10$CkK.SfCP/fTNzhbUo1FjgO0ZeN5KV9HIjLR4NGycmrsHtNeAM.qEu', 'Amit',    'Saxena',  '9811000103', TRUE, TRUE),
  (gen_random_uuid()::TEXT, 1, 'sunita.rawat',  'sunita.rawat@akt.in',  '$2b$10$CkK.SfCP/fTNzhbUo1FjgO0ZeN5KV9HIjLR4NGycmrsHtNeAM.qEu', 'Sunita',  'Rawat',   '9811000104', TRUE, TRUE)
ON CONFLICT (username, institute_id) DO NOTHING;

-- ── 2. Assign Caller role (id=13) to all 4 new users ─────────────────────────

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, 13
FROM   users u
WHERE  u.username IN ('rahul.verma','priya.joshi','amit.saxena','sunita.rawat')
  AND  u.institute_id = 1
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ── 3. Helper: store caller IDs in a temp table for clean joins ───────────────

CREATE TEMP TABLE seed_callers AS
SELECT u.id AS caller_id, u.first_name || ' ' || u.last_name AS name
FROM   users u
WHERE  u.username IN ('rahul.verma','priya.joshi','amit.saxena','sunita.rawat')
  AND  u.institute_id = 1;

-- ── 4. Insert leads across Today, Yesterday, This Week ───────────────────────
-- Caller 1 (Rahul) — top performer:  25 leads, high connection rate
-- Caller 2 (Priya) — good performer: 20 leads, strong interest rate
-- Caller 3 (Amit)  — mid performer:  18 leads, average
-- Caller 4 (Sunita)— new caller:     12 leads, low conversion so far

-- We use generate_series to create varied data in one block.
-- assigned_at spread: 70% today, 20% yesterday, 10% earlier this week

DO $$
DECLARE
  v_rahul   BIGINT := (SELECT caller_id FROM seed_callers WHERE name LIKE 'Rahul%');
  v_priya   BIGINT := (SELECT caller_id FROM seed_callers WHERE name LIKE 'Priya%');
  v_amit    BIGINT := (SELECT caller_id FROM seed_callers WHERE name LIKE 'Amit%');
  v_sunita  BIGINT := (SELECT caller_id FROM seed_callers WHERE name LIKE 'Sunita%');
  v_inst    BIGINT := 1;
  v_patna   BIGINT := (SELECT id FROM branches WHERE institute_id = 1 AND code = 'PATNA');

  -- Arrays: caller_id, phone prefix, name prefix
  r_caller  BIGINT;
  r_status  TEXT;
  r_offset  INT;
  r_phone   TEXT;
  i         INT;

  -- Lead tracking
  v_lead_id   BIGINT;
  v_uuid      TEXT;

  -- Status pools per caller (weighted)
  rahul_statuses TEXT[] := ARRAY[
    'CONTACTED','CONTACTED','CONTACTED',
    'INTERESTED','INTERESTED','INTERESTED','INTERESTED',
    'FOLLOW_UP','FOLLOW_UP',
    'CALLBACK','CALLBACK',
    'VISIT_PLANNED','VISIT_PLANNED',
    'BOOKING_CONFIRMED','BOOKING_CONFIRMED',
    'NOT_CONNECTED','NOT_CONNECTED',
    'NOT_INTERESTED',
    'ADMISSION_INTERESTED',
    'CLOSED',
    'ASSIGNED','ASSIGNED','ASSIGNED','ASSIGNED','ASSIGNED'
  ];

  priya_statuses TEXT[] := ARRAY[
    'CONTACTED','CONTACTED',
    'INTERESTED','INTERESTED','INTERESTED',
    'FOLLOW_UP','FOLLOW_UP','FOLLOW_UP',
    'CALLBACK','CALLBACK',
    'VISIT_PLANNED',
    'BOOKING_CONFIRMED',
    'NOT_CONNECTED','NOT_CONNECTED','NOT_CONNECTED',
    'NOT_INTERESTED','NOT_INTERESTED',
    'ADMISSION_INTERESTED',
    'ASSIGNED','ASSIGNED'
  ];

  amit_statuses TEXT[] := ARRAY[
    'CONTACTED','CONTACTED',
    'INTERESTED','INTERESTED',
    'FOLLOW_UP',
    'CALLBACK',
    'NOT_CONNECTED','NOT_CONNECTED','NOT_CONNECTED','NOT_CONNECTED',
    'NOT_INTERESTED','NOT_INTERESTED','NOT_INTERESTED',
    'ASSIGNED','ASSIGNED','ASSIGNED','ASSIGNED','ASSIGNED'
  ];

  sunita_statuses TEXT[] := ARRAY[
    'CONTACTED',
    'INTERESTED',
    'NOT_CONNECTED','NOT_CONNECTED','NOT_CONNECTED',
    'NOT_INTERESTED','NOT_INTERESTED',
    'ASSIGNED','ASSIGNED','ASSIGNED','ASSIGNED','ASSIGNED'
  ];

  -- per-caller lead counts
  rahul_count  INT := 25;
  priya_count  INT := 20;
  amit_count   INT := 18;
  sunita_count INT := 12;

  -- date offsets: negative = days ago (0=today, -1=yesterday, etc.)
  v_day_offset INT;
  v_assigned_at TIMESTAMPTZ;
  v_not_conn_at TIMESTAMPTZ;

BEGIN

  -- ── Rahul's leads ──────────────────────────────────────────────────────────
  FOR i IN 1..rahul_count LOOP
    v_uuid   := gen_random_uuid()::TEXT;
    r_phone  := '98110' || LPAD((1000 + i)::TEXT, 5, '0');
    r_status := rahul_statuses[((i - 1) % array_length(rahul_statuses, 1)) + 1];

    -- Spread: 60% today, 25% yesterday, 15% this week
    v_day_offset := CASE
      WHEN i % 10 < 6 THEN 0
      WHEN i % 10 < 9 THEN -1
      ELSE -(2 + (i % 3))
    END;
    v_assigned_at := (CURRENT_DATE + v_day_offset) + (i * INTERVAL '18 minutes');

    v_not_conn_at := CASE WHEN r_status = 'NOT_CONNECTED'
      THEN v_assigned_at + INTERVAL '5 minutes' ELSE NULL END;

    INSERT INTO leads (uuid, institute_id, first_name, last_name, phone, status,
                       source, assigned_to_id, assigned_at, not_connected_at,
                       previous_caller_id, created_at, updated_at, created_by, updated_by)
    VALUES (v_uuid, v_inst,
            'Lead' || i, 'Rahul',
            r_phone,
            r_status,
            (ARRAY['WALK_IN','SOCIAL_MEDIA','REFERRAL','WEBSITE','GOOGLE_ADS'])[((i-1)%5)+1],
            v_rahul, v_assigned_at, v_not_conn_at, NULL,
            v_assigned_at, v_assigned_at + INTERVAL '10 minutes', v_rahul, v_rahul)
    RETURNING id INTO v_lead_id;

    -- Activity log
    INSERT INTO lead_activities (institute_id, lead_id, action_type, description, performed_by, created_at)
    VALUES (v_inst, v_lead_id, 'ASSIGNED', 'Lead assigned to Rahul Verma', v_rahul, v_assigned_at);

    IF r_status <> 'ASSIGNED' THEN
      INSERT INTO lead_activities (institute_id, lead_id, action_type, description, performed_by, created_at)
      VALUES (v_inst, v_lead_id, r_status,
              CASE r_status
                WHEN 'INTERESTED'          THEN 'Lead is interested in the course'
                WHEN 'FOLLOW_UP'           THEN 'Follow-up scheduled'
                WHEN 'CALLBACK'            THEN 'Callback requested by lead'
                WHEN 'VISIT_PLANNED'       THEN 'Lead will visit the institute'
                WHEN 'BOOKING_CONFIRMED'   THEN 'Admission confirmed!'
                WHEN 'NOT_CONNECTED'       THEN 'Call not connected. Will enter retry pool in 30 minutes.'
                WHEN 'NOT_INTERESTED'      THEN 'Lead not interested at this time'
                WHEN 'CONTACTED'           THEN 'Successfully contacted lead'
                WHEN 'ADMISSION_INTERESTED' THEN 'Interested in admission'
                ELSE 'Status updated'
              END,
              v_rahul, v_assigned_at + INTERVAL '15 minutes');
    END IF;

    -- Follow-up for relevant statuses
    IF r_status IN ('FOLLOW_UP','CALLBACK','INTERESTED') THEN
      INSERT INTO follow_ups (institute_id, lead_id, scheduled_at, remarks, is_done, created_by, created_at)
      VALUES (v_inst, v_lead_id,
              v_assigned_at + INTERVAL '2 days',
              'Follow up with lead about course details',
              (i % 3 = 0), v_rahul, v_assigned_at);
    END IF;

    -- Branch transfer for 2 leads
    IF r_status = 'VISIT_PLANNED' AND i % 12 = 0 THEN
      UPDATE leads SET branch_id = v_patna, assigned_to_id = NULL, status = 'CLOSED',
                       previous_caller_id = v_rahul, updated_at = v_assigned_at + INTERVAL '20 minutes'
      WHERE id = v_lead_id;

      INSERT INTO lead_transfers (lead_id, institute_id, transfer_type, from_caller_id,
                                  to_branch_id, notes, transferred_by, transferred_at)
      VALUES (v_lead_id, v_inst, 'BRANCH_TRANSFER', v_rahul,
              v_patna, 'Lead interested in Patna campus',
              v_rahul, v_assigned_at + INTERVAL '20 minutes');

      INSERT INTO lead_activities (institute_id, lead_id, action_type, description, performed_by, created_at)
      VALUES (v_inst, v_lead_id, 'BRANCH_TRANSFER',
              'Lead transferred to Patna Branch',
              v_rahul, v_assigned_at + INTERVAL '20 minutes');
    END IF;

  END LOOP;

  -- ── Priya's leads ──────────────────────────────────────────────────────────
  FOR i IN 1..priya_count LOOP
    v_uuid   := gen_random_uuid()::TEXT;
    r_phone  := '98120' || LPAD((2000 + i)::TEXT, 5, '0');
    r_status := priya_statuses[((i - 1) % array_length(priya_statuses, 1)) + 1];

    v_day_offset := CASE
      WHEN i % 10 < 6 THEN 0
      WHEN i % 10 < 9 THEN -1
      ELSE -(2 + (i % 3))
    END;
    v_assigned_at := (CURRENT_DATE + v_day_offset) + (i * INTERVAL '22 minutes');

    v_not_conn_at := CASE WHEN r_status = 'NOT_CONNECTED'
      THEN v_assigned_at + INTERVAL '5 minutes' ELSE NULL END;

    INSERT INTO leads (uuid, institute_id, first_name, last_name, phone, status,
                       source, assigned_to_id, assigned_at, not_connected_at,
                       course_interested, created_at, updated_at, created_by, updated_by)
    VALUES (v_uuid, v_inst,
            'Lead' || (100+i), 'Priya',
            r_phone, r_status,
            (ARRAY['SOCIAL_MEDIA','WEBSITE','REFERRAL','WALK_IN'])[((i-1)%4)+1],
            v_priya, v_assigned_at, v_not_conn_at,
            (ARRAY['Computer Science','Data Science','Digital Marketing','Spoken English','Tally'])[((i-1)%5)+1],
            v_assigned_at, v_assigned_at + INTERVAL '12 minutes', v_priya, v_priya)
    RETURNING id INTO v_lead_id;

    INSERT INTO lead_activities (institute_id, lead_id, action_type, description, performed_by, created_at)
    VALUES (v_inst, v_lead_id, 'ASSIGNED', 'Lead assigned to Priya Joshi', v_priya, v_assigned_at);

    IF r_status <> 'ASSIGNED' THEN
      INSERT INTO lead_activities (institute_id, lead_id, action_type, description, performed_by, created_at)
      VALUES (v_inst, v_lead_id, r_status,
              CASE r_status
                WHEN 'INTERESTED'        THEN 'Very interested, wants fee details'
                WHEN 'FOLLOW_UP'         THEN 'Will call back after discussing with family'
                WHEN 'CALLBACK'          THEN 'Requested callback tomorrow morning'
                WHEN 'VISIT_PLANNED'     THEN 'Planning to visit this weekend'
                WHEN 'BOOKING_CONFIRMED' THEN 'Paid registration fee — admission confirmed'
                WHEN 'NOT_CONNECTED'     THEN 'Call not connected. Will enter retry pool in 30 minutes.'
                WHEN 'NOT_INTERESTED'    THEN 'Already enrolled elsewhere'
                WHEN 'CONTACTED'         THEN 'Contacted — gathering requirements'
                ELSE 'Status updated'
              END,
              v_priya, v_assigned_at + INTERVAL '18 minutes');
    END IF;

    IF r_status IN ('FOLLOW_UP','CALLBACK','INTERESTED') THEN
      INSERT INTO follow_ups (institute_id, lead_id, scheduled_at, remarks, is_done, created_by, created_at)
      VALUES (v_inst, v_lead_id,
              v_assigned_at + INTERVAL '1 day',
              'Discuss course fees and schedule', FALSE, v_priya, v_assigned_at);
    END IF;

    -- 1 branch transfer
    IF r_status = 'VISIT_PLANNED' AND i = 11 THEN
      UPDATE leads SET branch_id = v_patna, assigned_to_id = NULL, status = 'CLOSED',
                       previous_caller_id = v_priya, updated_at = v_assigned_at + INTERVAL '25 minutes'
      WHERE id = v_lead_id;

      INSERT INTO lead_transfers (lead_id, institute_id, transfer_type, from_caller_id,
                                  to_branch_id, notes, transferred_by, transferred_at)
      VALUES (v_lead_id, v_inst, 'BRANCH_TRANSFER', v_priya,
              v_patna, 'Lead lives near Patna, transferred for convenience',
              v_priya, v_assigned_at + INTERVAL '25 minutes');

      INSERT INTO lead_activities (institute_id, lead_id, action_type, description, performed_by, created_at)
      VALUES (v_inst, v_lead_id, 'BRANCH_TRANSFER',
              'Lead transferred to Patna Branch. Lead lives near Patna, transferred for convenience',
              v_priya, v_assigned_at + INTERVAL '25 minutes');
    END IF;

  END LOOP;

  -- ── Amit's leads ───────────────────────────────────────────────────────────
  FOR i IN 1..amit_count LOOP
    v_uuid   := gen_random_uuid()::TEXT;
    r_phone  := '98130' || LPAD((3000 + i)::TEXT, 5, '0');
    r_status := amit_statuses[((i - 1) % array_length(amit_statuses, 1)) + 1];

    v_day_offset := CASE
      WHEN i % 10 < 5 THEN 0
      WHEN i % 10 < 8 THEN -1
      ELSE -(2 + (i % 4))
    END;
    v_assigned_at := (CURRENT_DATE + v_day_offset) + (i * INTERVAL '25 minutes');

    v_not_conn_at := CASE WHEN r_status = 'NOT_CONNECTED'
      THEN v_assigned_at + INTERVAL '5 minutes' ELSE NULL END;

    INSERT INTO leads (uuid, institute_id, first_name, last_name, phone, status,
                       source, assigned_to_id, assigned_at, not_connected_at,
                       course_interested, created_at, updated_at, created_by, updated_by)
    VALUES (v_uuid, v_inst,
            'Lead' || (200+i), 'Amit',
            r_phone, r_status,
            (ARRAY['GOOGLE_ADS','WALK_IN','SOCIAL_MEDIA','WEBSITE'])[((i-1)%4)+1],
            v_amit, v_assigned_at, v_not_conn_at,
            (ARRAY['MS Office','Computer Hardware','Web Design','Accounting'])[((i-1)%4)+1],
            v_assigned_at, v_assigned_at + INTERVAL '8 minutes', v_amit, v_amit)
    RETURNING id INTO v_lead_id;

    INSERT INTO lead_activities (institute_id, lead_id, action_type, description, performed_by, created_at)
    VALUES (v_inst, v_lead_id, 'ASSIGNED', 'Lead assigned to Amit Saxena', v_amit, v_assigned_at);

    IF r_status <> 'ASSIGNED' THEN
      INSERT INTO lead_activities (institute_id, lead_id, action_type, description, performed_by, created_at)
      VALUES (v_inst, v_lead_id, r_status,
              CASE r_status
                WHEN 'INTERESTED'    THEN 'Interested but wants to think over'
                WHEN 'FOLLOW_UP'     THEN 'Call tomorrow'
                WHEN 'CALLBACK'      THEN 'Busy now, call in 2 hours'
                WHEN 'NOT_CONNECTED' THEN 'Call not connected. Will enter retry pool in 30 minutes.'
                WHEN 'NOT_INTERESTED' THEN 'Not interested'
                WHEN 'CONTACTED'     THEN 'Connected, explained courses'
                ELSE 'Status updated'
              END,
              v_amit, v_assigned_at + INTERVAL '20 minutes');
    END IF;

  END LOOP;

  -- ── Sunita's leads (new caller, fewer + mostly assigned/not-connected) ──────
  FOR i IN 1..sunita_count LOOP
    v_uuid   := gen_random_uuid()::TEXT;
    r_phone  := '98140' || LPAD((4000 + i)::TEXT, 5, '0');
    r_status := sunita_statuses[((i - 1) % array_length(sunita_statuses, 1)) + 1];

    v_day_offset := CASE WHEN i % 4 = 0 THEN -1 ELSE 0 END;
    v_assigned_at := (CURRENT_DATE + v_day_offset) + (i * INTERVAL '30 minutes');

    v_not_conn_at := CASE WHEN r_status = 'NOT_CONNECTED'
      THEN v_assigned_at + INTERVAL '5 minutes' ELSE NULL END;

    INSERT INTO leads (uuid, institute_id, first_name, last_name, phone, status,
                       source, assigned_to_id, assigned_at, not_connected_at,
                       created_at, updated_at, created_by, updated_by)
    VALUES (v_uuid, v_inst,
            'Lead' || (300+i), 'Sunita',
            r_phone, r_status,
            (ARRAY['WALK_IN','REFERRAL','SOCIAL_MEDIA'])[((i-1)%3)+1],
            v_sunita, v_assigned_at, v_not_conn_at,
            v_assigned_at, v_assigned_at + INTERVAL '5 minutes', v_sunita, v_sunita)
    RETURNING id INTO v_lead_id;

    INSERT INTO lead_activities (institute_id, lead_id, action_type, description, performed_by, created_at)
    VALUES (v_inst, v_lead_id, 'ASSIGNED', 'Lead assigned to Sunita Rawat', v_sunita, v_assigned_at);

    IF r_status <> 'ASSIGNED' THEN
      INSERT INTO lead_activities (institute_id, lead_id, action_type, description, performed_by, created_at)
      VALUES (v_inst, v_lead_id, r_status,
              CASE r_status
                WHEN 'INTERESTED'    THEN 'Interested — first lead converted!'
                WHEN 'NOT_CONNECTED' THEN 'Call not connected. Will enter retry pool in 30 minutes.'
                WHEN 'NOT_INTERESTED' THEN 'Not interested'
                WHEN 'CONTACTED'     THEN 'Call connected, introduced institute'
                ELSE 'Status updated'
              END,
              v_sunita, v_assigned_at + INTERVAL '10 minutes');
    END IF;

  END LOOP;

  -- ── 5. Retry pool: set 5 NOT_CONNECTED leads > 30 min old ────────────────
  UPDATE leads
  SET    not_connected_at = NOW() - INTERVAL '45 minutes'
  WHERE  status = 'NOT_CONNECTED'
    AND  not_connected_at IS NOT NULL
    AND  institute_id = 1
    AND  id IN (
      SELECT id FROM leads
      WHERE status = 'NOT_CONNECTED' AND institute_id = 1
      ORDER BY id LIMIT 5
    );

END $$;

-- ── 6. Verify counts ──────────────────────────────────────────────────────────
-- (runs silently, errors would fail the migration)
DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(1) INTO v_count FROM seed_callers;
  IF v_count < 4 THEN
    RAISE EXCEPTION 'Expected 4 seed callers, found %', v_count;
  END IF;
END $$;

DROP TABLE IF EXISTS seed_callers;
