-- ─────────────────────────────────────────────────────────────────────────────
-- V39: Grant full finance-operations permissions to the ACCOUNTANT role.
--
-- V36/V38 gave the accountant only LEAD_VIEW, BOOKING_VIEW, BOOKING_VERIFY (payment
-- verification). The Phase-1 finance module also needs the accountant to collect
-- fees, record expenses, and view financial reports. Granted to every institute's
-- ACCOUNTANT role. Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
JOIN   permissions p
       ON p.code IN (
            'FEE_VIEW',        -- fee summary, payment history, receipts
            'FEE_COLLECT',     -- record fee payments
            'EXPENSE_VIEW',    -- view expenses
            'EXPENSE_CREATE',  -- record expenses
            'REPORT_VIEW'      -- revenue, P&L, pending-dues, finance reports
       )
WHERE  r.code = 'ACCOUNTANT'
ON CONFLICT DO NOTHING;
