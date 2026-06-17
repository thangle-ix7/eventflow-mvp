CREATE UNIQUE INDEX IF NOT EXISTS uk_payment_transactions_provider_order
    ON payment_transactions(provider, provider_order_id)
    WHERE provider_order_id IS NOT NULL;
