CREATE TABLE subscription_plans (
    code VARCHAR(40) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    plan_type VARCHAR(30) NOT NULL,
    billing_interval VARCHAR(20),
    price_vnd BIGINT NOT NULL DEFAULT 0,
    target_segment VARCHAR(255),
    max_active_events INT,
    unlimited_events BOOLEAN NOT NULL DEFAULT FALSE,
    max_users_per_event INT,
    unlimited_users BOOLEAN NOT NULL DEFAULT FALSE,
    storage_limit_bytes BIGINT,
    unlimited_storage BOOLEAN NOT NULL DEFAULT FALSE,
    ai_credits_per_month INT,
    ai_credits_per_event INT,
    unlimited_ai BOOLEAN NOT NULL DEFAULT FALSE,
    event_duration_days INT,
    extra_user_price_vnd BIGINT,
    priority_rank INT NOT NULL DEFAULT 0,
    features TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_code VARCHAR(40) NOT NULL REFERENCES subscription_plans(code),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    current_period_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    provider VARCHAR(40),
    provider_customer_id VARCHAR(120),
    provider_subscription_id VARCHAR(120),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_subscriptions_user_status
    ON user_subscriptions(user_id, status, current_period_end);

CREATE TABLE event_passes (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    plan_code VARCHAR(40) NOT NULL REFERENCES subscription_plans(code),
    purchaser_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    starts_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    provider VARCHAR(40),
    provider_payment_id VARCHAR(120),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_event_passes_event_status
    ON event_passes(event_id, status, expires_at);

CREATE TABLE ai_credit_ledger (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
    event_pass_id BIGINT REFERENCES event_passes(id) ON DELETE SET NULL,
    source_type VARCHAR(30) NOT NULL,
    plan_code VARCHAR(40) NOT NULL,
    credits_delta INT NOT NULL,
    action VARCHAR(80) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_credit_ledger_user_month
    ON ai_credit_ledger(user_id, source_type, created_at);

CREATE INDEX idx_ai_credit_ledger_event_pass
    ON ai_credit_ledger(event_pass_id, created_at);

CREATE TABLE payment_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id BIGINT REFERENCES events(id) ON DELETE SET NULL,
    plan_code VARCHAR(40) NOT NULL REFERENCES subscription_plans(code),
    amount_vnd BIGINT NOT NULL,
    provider VARCHAR(40) NOT NULL DEFAULT 'MANUAL',
    provider_order_id VARCHAR(120),
    provider_transaction_id VARCHAR(120),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    checkout_url TEXT,
    raw_payload TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP
);

CREATE INDEX idx_payment_transactions_user_status
    ON payment_transactions(user_id, status, created_at);

INSERT INTO subscription_plans (
    code, display_name, plan_type, billing_interval, price_vnd, target_segment,
    max_active_events, unlimited_events, max_users_per_event, unlimited_users,
    storage_limit_bytes, unlimited_storage, ai_credits_per_month, ai_credits_per_event,
    unlimited_ai, event_duration_days, extra_user_price_vnd, priority_rank, features
) VALUES
('FREE', 'Free', 'SUBSCRIPTION', 'MONTHLY', 0,
 'Cá nhân, CLB nhỏ đang thử EventFlow',
 1, FALSE, 3, FALSE, 536870912, FALSE, 5, NULL, FALSE, NULL, NULL, 10,
 'Task cơ bản;Phòng ban;Dashboard cơ bản;Template public'),
('CLUB', 'Club', 'SUBSCRIPTION', 'MONTHLY', 199000,
 'CLB, nhóm nhỏ, lớp, đội project',
 3, FALSE, 30, FALSE, 10737418240, FALSE, 50, NULL, FALSE, NULL, NULL, 20,
 'Kanban/task;Calendar;Reminder;Documents/reports;Email invite'),
('PRO_AGENCY', 'Pro Agency', 'SUBSCRIPTION', 'YEARLY', 6990000,
 'Agency sự kiện, doanh nghiệp SME',
 NULL, TRUE, 50, FALSE, 53687091200, FALSE, 300, NULL, FALSE, NULL, 50000, 30,
 'Không giới hạn sự kiện;Timeline/Gantt-ready;Export;Advanced reports;Logo doanh nghiệp'),
('EVENT_STANDARD', 'Event Pass Standard', 'EVENT_PASS', 'ONE_TIME', 399000,
 'Một sự kiện vừa/nhỏ',
 NULL, FALSE, 15, FALSE, 10737418240, FALSE, NULL, 50, FALSE, 90, NULL, 40,
 '1 event;Task basic;Budget-ready;Documents/reports'),
('EVENT_PREMIUM', 'Event Pass Premium', 'EVENT_PASS', 'ONE_TIME', 999000,
 'Một sự kiện lớn, year-end, festival',
 NULL, FALSE, 50, FALSE, 21474836480, FALSE, NULL, 1000, FALSE, 120, NULL, 50,
 '1 event;QR check-in-ready;Landing page-ready;Auto email-ready;Priority support'),
('ENTERPRISE', 'Enterprise', 'SUBSCRIPTION', 'CUSTOM', 70000000,
 'Tập đoàn 200-500+ nhân sự',
 NULL, TRUE, NULL, TRUE, NULL, TRUE, NULL, NULL, TRUE, NULL, NULL, 100,
 'Custom users/events/storage;SSO-ready;SLA;Audit nâng cao;ERP/kế toán-ready')
ON CONFLICT (code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    plan_type = EXCLUDED.plan_type,
    billing_interval = EXCLUDED.billing_interval,
    price_vnd = EXCLUDED.price_vnd,
    target_segment = EXCLUDED.target_segment,
    max_active_events = EXCLUDED.max_active_events,
    unlimited_events = EXCLUDED.unlimited_events,
    max_users_per_event = EXCLUDED.max_users_per_event,
    unlimited_users = EXCLUDED.unlimited_users,
    storage_limit_bytes = EXCLUDED.storage_limit_bytes,
    unlimited_storage = EXCLUDED.unlimited_storage,
    ai_credits_per_month = EXCLUDED.ai_credits_per_month,
    ai_credits_per_event = EXCLUDED.ai_credits_per_event,
    unlimited_ai = EXCLUDED.unlimited_ai,
    event_duration_days = EXCLUDED.event_duration_days,
    extra_user_price_vnd = EXCLUDED.extra_user_price_vnd,
    priority_rank = EXCLUDED.priority_rank,
    features = EXCLUDED.features;
