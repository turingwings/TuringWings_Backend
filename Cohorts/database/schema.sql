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
    id         uuid primary key default gen_random_uuid(),
    student_id uuid not null references public.students (id) on delete cascade,
    cohort_id  uuid not null references public.cohorts (id)   on delete cascade,
    status     registration_status not null default 'INITIATED',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (student_id, cohort_id)
);

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

commit;