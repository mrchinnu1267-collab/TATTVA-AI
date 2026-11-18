-- TATTVA AI — Go Subscription & UPI Payment System Database Schema (Migration 004)
-- Enforces UPI payment records, subscription lifecycles, and webhook idempotency logs.
-- Conceptualized & Engineered by kotapati Gowtham Chowdary

-- 1. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS tattva_subscriptions (
    subscription_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    plan_id VARCHAR(32) NOT NULL DEFAULT 'plan_go',
    tier VARCHAR(16) NOT NULL DEFAULT 'go',
    provider VARCHAR(32) NOT NULL DEFAULT 'razorpay',
    provider_subscription_id VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'active', 'pending', 'payment_failed', 'expired', 'canceled', 'renewal_pending'
    amount NUMERIC(10, 2) NOT NULL DEFAULT 40.00,
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    billing_interval VARCHAR(16) NOT NULL DEFAULT 'monthly',
    current_period_start BIGINT NOT NULL,
    current_period_end BIGINT NOT NULL,
    auto_renew_enabled BOOLEAN NOT NULL DEFAULT true,
    cancellation_status VARCHAR(32) DEFAULT 'none', -- 'none', 'scheduled', 'cancelled'
    cancelled_at BIGINT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tattva_subs_user_id ON tattva_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_tattva_subs_status ON tattva_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_tattva_subs_prov_sub ON tattva_subscriptions(provider_subscription_id);

-- 2. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS tattva_payments (
    payment_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    subscription_id VARCHAR(64) REFERENCES tattva_subscriptions(subscription_id) ON DELETE SET NULL,
    provider_payment_id VARCHAR(128),
    provider_order_id VARCHAR(128) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 40.00,
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    payment_method VARCHAR(32) NOT NULL DEFAULT 'upi',
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'success', 'failed', 'pending', 'refunded'
    upi_vpa VARCHAR(128),
    upi_transaction_id VARCHAR(128),
    error_code VARCHAR(64),
    error_description TEXT,
    verified_at BIGINT,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tattva_pay_user_id ON tattva_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_tattva_pay_order_id ON tattva_payments(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_tattva_pay_prov_pay ON tattva_payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_tattva_pay_status ON tattva_payments(status);

-- 3. WEBHOOK EVENTS TABLE (Idempotency and Audit Log)
CREATE TABLE IF NOT EXISTS tattva_webhook_events (
    provider_event_id VARCHAR(128) PRIMARY KEY,
    provider VARCHAR(32) NOT NULL DEFAULT 'razorpay',
    event_type VARCHAR(64) NOT NULL,
    processing_status VARCHAR(32) NOT NULL DEFAULT 'received', -- 'received', 'processed', 'failed', 'ignored'
    payload JSONB NOT NULL,
    error_message TEXT,
    received_at BIGINT NOT NULL,
    processed_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_tattva_webhook_event_type ON tattva_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tattva_webhook_status ON tattva_webhook_events(processing_status);

-- 4. REFUNDS TABLE
CREATE TABLE IF NOT EXISTS tattva_refunds (
    refund_id VARCHAR(64) PRIMARY KEY,
    payment_id VARCHAR(64) NOT NULL REFERENCES tattva_payments(payment_id),
    user_id VARCHAR(128) NOT NULL,
    provider_refund_id VARCHAR(128),
    amount NUMERIC(10, 2) NOT NULL DEFAULT 40.00,
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    reason TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending', 'processed', 'failed'
    created_at BIGINT NOT NULL,
    processed_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_tattva_refunds_user_id ON tattva_refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_tattva_refunds_pay_id ON tattva_refunds(payment_id);

-- Enable Row Level Security (RLS)
ALTER TABLE tattva_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tattva_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tattva_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tattva_refunds ENABLE ROW LEVEL SECURITY;

-- Note: In production Supabase environment, create policies so users only read their own records,
-- and administrative webhooks use service_role key to manage state.
