-- ============================================================
-- Turing Wings Cohort Registration System
-- Supabase / PostgreSQL Schema
-- Run this in the Supabase SQL Editor.
-- ============================================================

begin;

-- Enable pgcrypto for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- students
-- ------------------------------------------------------------
create table if not exists public.students (
    id            uuid primary key default gen_random_uuid(),
    full_name     text        not null,
    mobile_number text        not null unique,
    email         text        not null unique,
    college_name  text        not null,
    stream        text        not null,
    branch        text,
    current_year  text        not null,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

comment on table public.students is 'Registered students';
comment on column public.students.email is 'Stored in lowercase';

create index if not exists idx_students_email on public.students (email);
create index if not exists idx_students_mobile on public.students (mobile_number);

-- ------------------------------------------------------------
-- cohorts
-- ------------------------------------------------------------
create table if not exists public.cohorts (
    id          uuid primary key default gen_random_uuid(),
    slug        text        not null unique,
    title       text        not null,
    description text,
    price       numeric(10, 2) not null default 0,
    status      text        not null default 'ACTIVE'
                check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- registrations
-- ------------------------------------------------------------
create type registration_status as enum (
    'INITIATED',
    'PAID',
    'FAILED',
    'ASSIGNED',
    'ACTIVE',
    'COMPLETED'
);

create table if not exists public.registrations (
    id              uuid primary key default gen_random_uuid(),
    student_id      uuid not null references public.students (id) on delete cascade,
    cohort_id       uuid not null references public.cohorts (id)   on delete cascade,
    status          registration_status not null default 'INITIATED',
    registration_no integer,
    username        text unique,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (student_id, cohort_id)
);

alter table public.registrations add column if not exists registration_no integer;
alter table public.registrations add column if not exists username text unique;

comment on table public.registrations is 'A student registration for a cohort';

create index if not exists idx_registrations_student on public.registrations (student_id);
create index if not exists idx_registrations_cohort  on public.registrations (cohort_id);

-- ------------------------------------------------------------
-- shared triggers to keep updated_at fresh
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at := now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_students_updated on public.students;
create trigger trg_students_updated
    before update on public.students
    for each row execute function public.set_updated_at();

drop trigger if exists trg_cohorts_updated on public.cohorts;
create trigger trg_cohorts_updated
    before update on public.cohorts
    for each row execute function public.set_updated_at();

drop trigger if exists trg_registrations_updated on public.registrations;
create trigger trg_registrations_updated
    before update on public.registrations
    for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Row Level Security
-- By default RLS is disabled. Enable + policies as needed for
-- your application/service role usage. The service role key bypasses RLS.
-- ------------------------------------------------------------
alter table public.students enable row level security;
alter table public.cohorts enable row level security;
alter table public.registrations enable row level security;

-- ------------------------------------------------------------
-- payments
-- ------------------------------------------------------------
create table if not exists public.payments (
    id                  uuid primary key default gen_random_uuid(),
    registration_id     uuid not null references public.registrations (id) on delete cascade,
    amount              numeric(10, 2) not null,
    currency            text not null default 'INR',
    razorpay_order_id   text not null,
    razorpay_payment_id text not null unique,
    razorpay_signature  text not null,
    invoice_url         text,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

comment on table public.payments is 'Stores payment details for registrations';

create index if not exists idx_payments_registration on public.payments (registration_id);
create index if not exists idx_payments_razorpay_payment on public.payments (razorpay_payment_id);

-- Trigger to keep updated_at fresh
drop trigger if exists trg_payments_updated on public.payments;
create trigger trg_payments_updated
    before update on public.payments
    for each row execute function public.set_updated_at();

-- Enable Row Level Security
alter table public.payments enable row level security;

-- ------------------------------------------------------------
-- Supabase Storage Buckets
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', true)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- creators
-- ------------------------------------------------------------
create table if not exists public.creators (
    id           uuid primary key default gen_random_uuid(),
    name         text        not null,
    email        text        not null unique,
    code         text        not null unique,
    is_active    boolean     not null default true,
    total_clicks integer     not null default 0,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create index if not exists idx_creators_code on public.creators (code);
create index if not exists idx_creators_email on public.creators (email);

drop trigger if exists trg_creators_updated on public.creators;
create trigger trg_creators_updated
    before update on public.creators
    for each row execute function public.set_updated_at();

alter table public.creators enable row level security;

-- ------------------------------------------------------------
-- referral_captures
-- ------------------------------------------------------------
create table if not exists public.referral_captures (
    id         uuid primary key default gen_random_uuid(),
    creator_id uuid        not null references public.creators (id) on delete cascade,
    email      text        not null,
    status     text        not null default 'CAPTURED'
               check (status in ('CAPTURED', 'EXISTING_STUDENT', 'ENROLLED')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (creator_id, email)
);

create index if not exists idx_referral_captures_creator on public.referral_captures (creator_id);
create index if not exists idx_referral_captures_email   on public.referral_captures (email);

drop trigger if exists trg_referral_captures_updated on public.referral_captures;
create trigger trg_referral_captures_updated
    before update on public.referral_captures
    for each row execute function public.set_updated_at();

alter table public.referral_captures enable row level security;

-- Add creator_id & commission_earned to registrations & payments
alter table public.registrations add column if not exists creator_id uuid references public.creators (id) on delete set null;
alter table public.registrations add column if not exists commission_earned numeric(10, 2) default 0;

alter table public.payments add column if not exists creator_id uuid references public.creators (id) on delete set null;

-- ------------------------------------------------------------
-- admin_users
-- ------------------------------------------------------------
create table if not exists public.admin_users (
    id            uuid primary key default gen_random_uuid(),
    name          text        not null,
    email         text        not null unique,
    password_hash text        not null,
    role          text        not null default 'ADMIN',
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index if not exists idx_admin_users_email on public.admin_users (email);

drop trigger if exists trg_admin_users_updated on public.admin_users;
create trigger trg_admin_users_updated
    before update on public.admin_users
    for each row execute function public.set_updated_at();

alter table public.admin_users enable row level security;

-- ------------------------------------------------------------
-- expenses
-- ------------------------------------------------------------
create table if not exists public.expenses (
    id             uuid primary key default gen_random_uuid(),
    name           text           not null,
    category       text           not null,
    amount         numeric(10, 2) not null,
    date           date           not null default current_date,
    description    text,
    vendor         text,
    payment_method text,
    receipt_url    text,
    created_by     uuid references public.admin_users (id) on delete set null,
    created_at     timestamptz    not null default now(),
    updated_at     timestamptz    not null default now()
);

create index if not exists idx_expenses_category on public.expenses (category);
create index if not exists idx_expenses_date     on public.expenses (date);

drop trigger if exists trg_expenses_updated on public.expenses;
create trigger trg_expenses_updated
    before update on public.expenses
    for each row execute function public.set_updated_at();

alter table public.expenses enable row level security;

-- ------------------------------------------------------------
-- admin_audit_logs
-- ------------------------------------------------------------
create table if not exists public.admin_audit_logs (
    id          uuid primary key default gen_random_uuid(),
    admin_id    uuid references public.admin_users (id) on delete set null,
    admin_email text,
    action      text        not null,
    entity      text        not null,
    entity_id   text,
    metadata    jsonb,
    created_at  timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_action on public.admin_audit_logs (action);
create index if not exists idx_admin_audit_logs_date   on public.admin_audit_logs (created_at);

alter table public.admin_audit_logs enable row level security;

-- ------------------------------------------------------------
-- Seed Cohorts
-- ------------------------------------------------------------
alter table public.cohorts add column if not exists total_seats integer not null default 70;

-- ------------------------------------------------------------
-- cohort_pricing_tiers
-- ------------------------------------------------------------
create table if not exists public.cohort_pricing_tiers (
    id            uuid primary key default gen_random_uuid(),
    cohort_id     uuid not null references public.cohorts (id) on delete cascade,
    tier_name     text not null,
    capacity      integer not null,
    price         numeric(10, 2) not null,
    tier_order    integer not null default 1,
    currency      text not null default 'INR',
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index if not exists idx_cohort_pricing_tiers_cohort on public.cohort_pricing_tiers (cohort_id);
create index if not exists idx_cohort_pricing_tiers_order on public.cohort_pricing_tiers (cohort_id, tier_order);

drop trigger if exists trg_cohort_pricing_tiers_updated on public.cohort_pricing_tiers;
create trigger trg_cohort_pricing_tiers_updated
    before update on public.cohort_pricing_tiers
    for each row execute function public.set_updated_at();

alter table public.cohort_pricing_tiers enable row level security;

insert into public.cohorts (id, slug, title, description, price, total_seats, status)
values
  ('9e08dfe7-e9b3-4434-be0f-19708719e0a3', 'full-stack-batch-1', 'Full Stack Batch 1', 'Our inaugural Full Stack Web Development cohort.', 1.00, 70, 'ACTIVE'),
  ('d01b1a76-905d-4f27-bc5e-8848f95c4793', 'ai-engineering', 'AI Engineering Cohort', 'Master AI Engineering, LLMs, Vector Databases, Agents, and RAG architectures.', 499.00, 70, 'ACTIVE'),
  ('e239615a-cb28-4ad0-b8d6-4fe48705f134', 'ai-cybersecurity', 'AI Cybersecurity Cohort', 'Learn to secure AI systems and apply AI to detect and prevent cyber threats.', 499.00, 70, 'ACTIVE')
on conflict (id) do nothing;

-- Seed Pricing Tiers for Cohort 01 (ai-engineering) and Cohort 02 (ai-cybersecurity)
insert into public.cohort_pricing_tiers (id, cohort_id, tier_name, capacity, price, tier_order, currency)
values
  ('11111111-1111-4111-a111-111111111111', 'd01b1a76-905d-4f27-bc5e-8848f95c4793', 'Founding Seats', 30, 499.00, 1, 'INR'),
  ('22222222-2222-4222-a222-222222222222', 'd01b1a76-905d-4f27-bc5e-8848f95c4793', 'Regular Registration', 40, 599.00, 2, 'INR'),
  ('33333333-3333-4333-a333-333333333333', 'e239615a-cb28-4ad0-b8d6-4fe48705f134', 'Founding Seats', 30, 499.00, 1, 'INR'),
  ('44444444-4444-4444-a444-444444444444', 'e239615a-cb28-4ad0-b8d6-4fe48705f134', 'Regular Registration', 40, 599.00, 2, 'INR')
on conflict (id) do nothing;

commit;