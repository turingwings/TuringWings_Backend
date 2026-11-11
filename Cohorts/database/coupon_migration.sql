-- ============================================================
-- TuringWings — Coupon System Migration
-- Run this in the Supabase SQL Editor.
-- Replaces the referral/creator system with a simple coupon gate.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- coupons table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
    id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    code             text           NOT NULL UNIQUE,          -- e.g. EARLYBIRD
    cohort_id        uuid           REFERENCES public.cohorts (id) ON DELETE CASCADE,
    -- NULL cohort_id = valid for any cohort
    unlocks_tier_id  uuid           NOT NULL REFERENCES public.cohort_pricing_tiers (id) ON DELETE CASCADE,
    -- The pricing tier this coupon unlocks (e.g. Founding Seats @ ₹499)
    is_active        boolean        NOT NULL DEFAULT true,
    max_uses         integer,                                 -- NULL = unlimited
    uses_count       integer        NOT NULL DEFAULT 0,
    created_at       timestamptz    NOT NULL DEFAULT now(),
    updated_at       timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code     ON public.coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_cohort   ON public.coupons (cohort_id);

DROP TRIGGER IF EXISTS trg_coupons_updated ON public.coupons;
CREATE TRIGGER trg_coupons_updated
    BEFORE UPDATE ON public.coupons
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- Seed EARLYBIRD coupons for both cohorts
-- (unlocks the Founding Seats tier = ₹499)
-- ------------------------------------------------------------

-- EARLYBIRDW — unlocks Founding Seats (₹499) for webdevxai, limited to 30 uses
INSERT INTO public.coupons (code, cohort_id, unlocks_tier_id, is_active, max_uses)
VALUES (
    'EARLYBIRDW',
    '9e08dfe7-e9b3-4434-be0f-19708719e0a3',   -- webdevxai cohort
    '11111111-1111-4111-a111-111111111111',    -- Founding Seats tier @ ₹499
    true,
    30  -- matches Founding Seats capacity
)
ON CONFLICT (code) DO UPDATE
    SET is_active  = true,
        max_uses   = 30,
        cohort_id  = excluded.cohort_id,
        unlocks_tier_id = excluded.unlocks_tier_id;

-- EARLYBIRDC — unlocks Founding Seats (₹499) for cyberxai, limited to 30 uses
INSERT INTO public.coupons (code, cohort_id, unlocks_tier_id, is_active, max_uses)
VALUES (
    'EARLYBIRDC',
    'd01b1a76-905d-4f27-bc5e-8848f95c4793',   -- cyberxai cohort
    '33333333-3333-4333-a333-333333333333',    -- Founding Seats tier @ ₹499
    true,
    30  -- matches Founding Seats capacity
)
ON CONFLICT (code) DO UPDATE
    SET is_active  = true,
        max_uses   = 30,
        cohort_id  = excluded.cohort_id,
        unlocks_tier_id = excluded.unlocks_tier_id;

COMMIT;

-- Verify
SELECT id, code, cohort_id, unlocks_tier_id, is_active, max_uses, uses_count
FROM public.coupons
ORDER BY created_at;
