-- ── Notification templates ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_templates (
    id           BIGSERIAL PRIMARY KEY,
    institute_id BIGINT      NOT NULL REFERENCES institutes(id),
    name         VARCHAR(200) NOT NULL,
    type         VARCHAR(50)  NOT NULL,   -- ADMISSION_CONFIRMATION, FEE_PAYMENT, FEE_REMINDER, BATCH_ASSIGNMENT, GENERAL
    channel      VARCHAR(20)  NOT NULL,   -- EMAIL, WHATSAPP, BOTH
    subject      VARCHAR(500),            -- email subject
    body         TEXT         NOT NULL,   -- message body with {{variable}} placeholders
    variables    TEXT,                    -- comma-separated list of expected variables
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    is_default   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by   BIGINT       REFERENCES users(id),
    UNIQUE (institute_id, name, channel)
);

-- ── Notification logs ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_logs (
    id                BIGSERIAL PRIMARY KEY,
    institute_id      BIGINT      NOT NULL REFERENCES institutes(id),
    channel           VARCHAR(20) NOT NULL,   -- EMAIL, WHATSAPP
    template_type     VARCHAR(50),
    recipient_name    VARCHAR(200),
    recipient_phone   VARCHAR(20),
    recipient_email   VARCHAR(255),
    subject           VARCHAR(500),
    message_preview   TEXT,                   -- first 500 chars of message
    status            VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, SENT, FAILED
    failure_reason    TEXT,
    retry_count       INT         NOT NULL DEFAULT 0,
    sent_at           TIMESTAMPTZ,
    related_type      VARCHAR(50),            -- ADMISSION, FEE_PAYMENT, BROADCAST
    related_id        BIGINT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notif_log_institute ON notification_logs(institute_id);
CREATE INDEX IF NOT EXISTS idx_notif_log_status    ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notif_log_related   ON notification_logs(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_notif_log_created   ON notification_logs(created_at DESC);

-- ── Notification permissions ──────────────────────────────────────────────────

INSERT INTO permissions (name, code, resource, action, description)
VALUES
    ('View Notifications',      'NOTIFICATION_VIEW',      'NOTIFICATION', 'READ',   'View notification logs and templates'),
    ('Send Notifications',      'NOTIFICATION_SEND',      'NOTIFICATION', 'CREATE', 'Send manual and broadcast notifications'),
    ('Manage Templates',        'NOTIFICATION_TEMPLATE',  'NOTIFICATION', 'UPDATE', 'Create and edit notification templates')
ON CONFLICT (code) DO NOTHING;

-- Grant to SUPER_ADMIN + INSTITUTE_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code IN ('SUPER_ADMIN', 'INSTITUTE_ADMIN')
  AND  p.resource = 'NOTIFICATION'
  AND  r.institute_id = 1
ON CONFLICT DO NOTHING;

-- COUNSELLOR: view + send
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'COUNSELLOR'
  AND  p.code IN ('NOTIFICATION_VIEW', 'NOTIFICATION_SEND')
  AND  r.institute_id = 1
ON CONFLICT DO NOTHING;

-- ── Seed default templates for institute 1 ────────────────────────────────────

INSERT INTO notification_templates
    (institute_id, name, type, channel, subject, body, variables, is_active, is_default, created_by)
VALUES

-- Admission confirmation — WhatsApp
(1, 'Admission Confirmation (WhatsApp)', 'ADMISSION_CONFIRMATION', 'WHATSAPP', NULL,
E'Dear {{studentName}},\n\nWelcome to *AKT Info Institute*! 🎉\n\nYour admission has been confirmed.\n\n📚 *Course:* {{courseName}}\n🔢 *Admission No:* {{admissionNumber}}\n📅 *Date:* {{enrollmentDate}}\n\nFor queries, contact us:\n📞 +91-0000000000\n📧 info@aktinstitute.com\n\nWe wish you a great learning journey!',
'studentName,courseName,admissionNumber,enrollmentDate', TRUE, TRUE, NULL),

-- Admission confirmation — Email
(1, 'Admission Confirmation (Email)', 'ADMISSION_CONFIRMATION', 'EMAIL',
'Admission Confirmed – {{courseName}} | AKT Info Institute',
E'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333">'
'<h2 style="color:#059669">🎉 Admission Confirmed!</h2>'
'<p>Dear <strong>{{studentName}}</strong>,</p>'
'<p>We are delighted to confirm your admission to <strong>AKT Info Institute</strong>.</p>'
'<table style="width:100%;border-collapse:collapse;margin:16px 0">'
'<tr><td style="padding:8px;background:#f9fafb;font-weight:bold;width:40%">Course</td><td style="padding:8px;background:#f9fafb">{{courseName}}</td></tr>'
'<tr><td style="padding:8px;font-weight:bold">Admission No</td><td style="padding:8px">{{admissionNumber}}</td></tr>'
'<tr><td style="padding:8px;background:#f9fafb;font-weight:bold">Enrollment Date</td><td style="padding:8px;background:#f9fafb">{{enrollmentDate}}</td></tr>'
'<tr><td style="padding:8px;font-weight:bold">Fees Agreed</td><td style="padding:8px">₹{{feesAgreed}}</td></tr>'
'</table>'
'<p style="margin-top:16px">For any queries, please contact us:</p>'
'<p>📞 +91-0000000000 &nbsp;|&nbsp; 📧 info@aktinstitute.com</p>'
'<p style="color:#6b7280;font-size:12px;margin-top:24px">AKT Info Institute · Excellence in Computer Education · Rajkot, Gujarat</p>'
'</div>',
'studentName,courseName,admissionNumber,enrollmentDate,feesAgreed', TRUE, TRUE, NULL),

-- Fee payment — WhatsApp
(1, 'Fee Payment Confirmation (WhatsApp)', 'FEE_PAYMENT', 'WHATSAPP', NULL,
E'Dear {{studentName}},\n\n✅ Payment received successfully!\n\n🧾 *Receipt No:* {{receiptNumber}}\n💰 *Amount Paid:* ₹{{amountPaid}}\n📅 *Date:* {{paymentDate}}\n💳 *Mode:* {{paymentMode}}\n\n📊 *Balance Remaining:* ₹{{balanceRemaining}}\n\nThank you for your payment.\n— AKT Info Institute',
'studentName,receiptNumber,amountPaid,paymentDate,paymentMode,balanceRemaining', TRUE, TRUE, NULL),

-- Fee payment — Email
(1, 'Fee Payment Confirmation (Email)', 'FEE_PAYMENT', 'EMAIL',
'Payment Receipt – ₹{{amountPaid}} | AKT Info Institute',
E'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333">'
'<h2 style="color:#059669">✅ Payment Received</h2>'
'<p>Dear <strong>{{studentName}}</strong>,</p>'
'<p>We have received your fee payment. Details below:</p>'
'<table style="width:100%;border-collapse:collapse;margin:16px 0">'
'<tr><td style="padding:8px;background:#f9fafb;font-weight:bold;width:40%">Receipt No</td><td style="padding:8px;background:#f9fafb">{{receiptNumber}}</td></tr>'
'<tr><td style="padding:8px;font-weight:bold">Amount Paid</td><td style="padding:8px">₹{{amountPaid}}</td></tr>'
'<tr><td style="padding:8px;background:#f9fafb;font-weight:bold">Payment Date</td><td style="padding:8px;background:#f9fafb">{{paymentDate}}</td></tr>'
'<tr><td style="padding:8px;font-weight:bold">Payment Mode</td><td style="padding:8px">{{paymentMode}}</td></tr>'
'<tr><td style="padding:8px;background:#f9fafb;font-weight:bold">Balance Remaining</td><td style="padding:8px;background:#f9fafb">₹{{balanceRemaining}}</td></tr>'
'</table>'
'<p style="color:#6b7280;font-size:12px;margin-top:24px">AKT Info Institute · Excellence in Computer Education · Rajkot, Gujarat</p>'
'</div>',
'studentName,receiptNumber,amountPaid,paymentDate,paymentMode,balanceRemaining', TRUE, TRUE, NULL),

-- Fee reminder — WhatsApp
(1, 'Fee Reminder (WhatsApp)', 'FEE_REMINDER', 'WHATSAPP', NULL,
E'Dear {{studentName}},\n\n⚠️ *Fee Reminder*\n\nYour outstanding fee balance is *₹{{balanceRemaining}}*.\n\n📚 Course: {{courseName}}\n🔢 Admission: {{admissionNumber}}\n\nKindly clear your dues at the earliest.\n\nFor assistance: +91-0000000000\n— AKT Info Institute',
'studentName,balanceRemaining,courseName,admissionNumber', TRUE, TRUE, NULL),

-- Batch assignment — WhatsApp
(1, 'Batch Assignment (WhatsApp)', 'BATCH_ASSIGNMENT', 'WHATSAPP', NULL,
E'Dear {{studentName}},\n\n📅 You have been assigned to a batch!\n\n🏫 *Batch:* {{batchName}}\n📚 *Course:* {{courseName}}\n⏰ *Timing:* {{timing}}\n\nSee you in class!\n— AKT Info Institute',
'studentName,batchName,courseName,timing', TRUE, TRUE, NULL),

-- General announcement — WhatsApp
(1, 'General Announcement (WhatsApp)', 'GENERAL', 'WHATSAPP', NULL,
E'📢 *AKT Info Institute*\n\n{{message}}',
'message', TRUE, TRUE, NULL),

-- General announcement — Email
(1, 'General Announcement (Email)', 'GENERAL', 'EMAIL',
'{{subject}} | AKT Info Institute',
E'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333">'
'<h2>{{subject}}</h2><div>{{message}}</div>'
'<p style="color:#6b7280;font-size:12px;margin-top:24px">AKT Info Institute · Rajkot, Gujarat</p></div>',
'subject,message', TRUE, TRUE, NULL)

ON CONFLICT (institute_id, name, channel) DO NOTHING;
