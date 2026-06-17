CREATE TABLE discount_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    description VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    discount_percent INT NOT NULL DEFAULT 100,
    target_plan_code VARCHAR(40) REFERENCES subscription_plans(code),
    max_redemptions INT,
    redeemed_count INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMP,
    created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_discount_codes_percent CHECK (discount_percent BETWEEN 1 AND 100)
);

CREATE INDEX idx_discount_codes_active_expires
    ON discount_codes(active, expires_at);

CREATE TABLE discount_code_redemptions (
    id BIGSERIAL PRIMARY KEY,
    discount_code_id BIGINT NOT NULL REFERENCES discount_codes(id) ON DELETE RESTRICT,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_transaction_id BIGINT REFERENCES payment_transactions(id) ON DELETE SET NULL,
    plan_code VARCHAR(40) NOT NULL REFERENCES subscription_plans(code),
    original_amount_vnd BIGINT NOT NULL,
    discount_amount_vnd BIGINT NOT NULL,
    final_amount_vnd BIGINT NOT NULL,
    redeemed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_discount_code_redemptions_code
    ON discount_code_redemptions(discount_code_id, redeemed_at);

CREATE INDEX idx_discount_code_redemptions_user
    ON discount_code_redemptions(user_id, redeemed_at);

ALTER TABLE payment_transactions
    ADD COLUMN discount_code_id BIGINT REFERENCES discount_codes(id) ON DELETE SET NULL,
    ADD COLUMN original_amount_vnd BIGINT,
    ADD COLUMN discount_amount_vnd BIGINT;
