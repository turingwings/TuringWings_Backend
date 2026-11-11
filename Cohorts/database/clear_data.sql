-- ============================================================
-- TuringWings — Clear All Data (Except cohorts & cohort_pricing_tiers)
-- Run this in the Supabase SQL Editor.
-- ⚠️  This permanently deletes all rows. Schema is NOT touched.
-- ============================================================

BEGIN;

-- Disable triggers temporarily so updated_at triggers don't fire on empty tables
-- (not strictly necessary but keeps logs clean)

-- Order matters: child tables before parent tables to respect FK constraints.

TRUNCATE TABLE public.admin_audit_logs     RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.expenses             RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.payments             RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.referral_captures    RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.registrations        RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.creators             RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.admin_users          RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.students             RESTART IDENTITY CASCADE;

-- cohorts            ← NOT touched
-- cohort_pricing_tiers ← NOT touched

COMMIT;

-- Verify: these should all return 0
SELECT 'admin_audit_logs'   AS tbl, COUNT(*) FROM public.admin_audit_logs
UNION ALL
SELECT 'expenses',                   COUNT(*) FROM public.expenses
UNION ALL
SELECT 'payments',                   COUNT(*) FROM public.payments
UNION ALL
SELECT 'referral_captures',          COUNT(*) FROM public.referral_captures
UNION ALL
SELECT 'registrations',              COUNT(*) FROM public.registrations
UNION ALL
SELECT 'creators',                   COUNT(*) FROM public.creators
UNION ALL
SELECT 'admin_users',                COUNT(*) FROM public.admin_users
UNION ALL
SELECT 'students',                   COUNT(*) FROM public.students;

-- Verify: these should retain their rows
SELECT 'cohorts (kept)'              AS tbl, COUNT(*) FROM public.cohorts
UNION ALL
SELECT 'cohort_pricing_tiers (kept)',         COUNT(*) FROM public.cohort_pricing_tiers;
