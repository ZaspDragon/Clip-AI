create extension if not exists pgcrypto;

create or replace function public.jsonb_to_uuid_array(input jsonb)
returns uuid[]
language sql
immutable
as $$
  select coalesce(array_agg(value::uuid), '{}'::uuid[])
  from jsonb_array_elements_text(coalesce(input, '[]'::jsonb)) as value
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  agency_id uuid references public.agencies(id) on delete set null,
  role text not null check (role in ('platform_owner', 'agency_admin', 'client_manager', 'worker')),
  first_name text not null default '',
  last_name text not null default '',
  email text not null unique,
  phone text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  assigned_client_ids uuid[] not null default '{}'::uuid[],
  assigned_site_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  contact_name text,
  contact_email text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  address_line_1 text,
  city text,
  state text,
  postal_code text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text,
  phone_last4 text,
  worker_pin text,
  email text,
  pay_rate numeric(10, 2),
  status text not null default 'active' check (status in ('active', 'inactive')),
  assigned_client_id uuid references public.clients(id) on delete set null,
  assigned_site_id uuid references public.sites(id) on delete set null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  job_title text,
  start_date date,
  end_date date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(worker_id, site_id, status)
);

create table if not exists public.punches (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  worker_id uuid references public.workers(id) on delete set null,
  worker_name text not null,
  worker_matched boolean not null default false,
  punch_type text not null check (punch_type in ('clock_in', 'start_lunch', 'end_lunch', 'clock_out')),
  punched_at timestamptz not null,
  local_date date not null default current_date,
  source text not null default 'qr_clock' check (source in ('qr_clock', 'manual_admin_edit')),
  device_info jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  is_manual boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.timesheets (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  worker_name text not null,
  week_start date not null,
  week_end date not null,
  regular_hours numeric(10, 2) not null default 0,
  overtime_hours numeric(10, 2) not null default 0,
  total_hours numeric(10, 2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  client_notes text,
  agency_notes text,
  client_approved_at timestamptz,
  client_approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(worker_id, site_id, week_start)
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  approver_user_id uuid not null references auth.users(id) on delete cascade,
  approver_role text not null check (approver_role in ('platform_owner', 'agency_admin', 'client_manager')),
  status text not null check (status in ('approved', 'rejected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payroll_exports (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  exported_by uuid references auth.users(id) on delete set null,
  week_start date not null,
  week_end date not null,
  row_count integer not null default 0,
  file_name text not null,
  export_format text not null default 'csv' check (export_format in ('csv')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete cascade,
  submitted_by uuid references auth.users(id) on delete set null,
  category text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  message text not null,
  screenshot_url text,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null unique references public.agencies(id) on delete cascade,
  plan_id text not null default 'starter' check (plan_id in ('starter', 'growth', 'pro')),
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'canceled')),
  worker_limit integer not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at_agencies on public.agencies;
create trigger set_updated_at_agencies before update on public.agencies for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_users on public.users;
create trigger set_updated_at_users before update on public.users for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_clients on public.clients;
create trigger set_updated_at_clients before update on public.clients for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_sites on public.sites;
create trigger set_updated_at_sites before update on public.sites for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_workers on public.workers;
create trigger set_updated_at_workers before update on public.workers for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_assignments on public.assignments;
create trigger set_updated_at_assignments before update on public.assignments for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_punches on public.punches;
create trigger set_updated_at_punches before update on public.punches for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_timesheets on public.timesheets;
create trigger set_updated_at_timesheets before update on public.timesheets for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_approvals on public.approvals;
create trigger set_updated_at_approvals before update on public.approvals for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_payroll_exports on public.payroll_exports;
create trigger set_updated_at_payroll_exports before update on public.payroll_exports for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_support_tickets on public.support_tickets;
create trigger set_updated_at_support_tickets before update on public.support_tickets for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_subscriptions on public.subscriptions;
create trigger set_updated_at_subscriptions before update on public.subscriptions for each row execute function public.set_updated_at();

create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.current_agency_id()
returns uuid
language sql
stable
as $$
  select agency_id from public.users where id = auth.uid()
$$;

create or replace function public.is_platform_owner()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_user_role() = 'platform_owner', false)
$$;

create or replace function public.is_agency_admin()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_user_role() = 'agency_admin', false)
$$;

create or replace function public.is_client_manager()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_user_role() = 'client_manager', false)
$$;

create or replace function public.has_client_or_site_scope(target_client_id uuid, target_site_id uuid)
returns boolean
language sql
stable
as $$
  select coalesce(
    exists (
      select 1
      from public.users
      where id = auth.uid()
        and (
          (target_client_id is not null and assigned_client_ids @> array[target_client_id]::uuid[])
          or
          (target_site_id is not null and assigned_site_ids @> array[target_site_id]::uuid[])
        )
    ),
    false
  )
$$;

create or replace function public.current_email()
returns text
language sql
stable
as $$
  select email from auth.users where id = auth.uid()
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_role text := coalesce(metadata->>'role', 'agency_admin');
  agency_name text;
  agency_slug text;
  new_agency_id uuid;
  plan_id text := coalesce(metadata->>'plan_id', 'starter');
begin
  if requested_role = 'platform_owner' then
    insert into public.users (
      id,
      agency_id,
      role,
      first_name,
      last_name,
      email,
      phone,
      status,
      assigned_client_ids,
      assigned_site_ids
    )
    values (
      new.id,
      null,
      'platform_owner',
      coalesce(metadata->>'first_name', ''),
      coalesce(metadata->>'last_name', ''),
      new.email,
      nullif(metadata->>'phone', ''),
      'active',
      '{}'::uuid[],
      '{}'::uuid[]
    )
    on conflict (id) do update
      set role = excluded.role,
          email = excluded.email,
          first_name = excluded.first_name,
          last_name = excluded.last_name,
          phone = excluded.phone,
          status = 'active';

    return new;
  end if;

  if requested_role = 'client_manager' then
    insert into public.users (
      id,
      agency_id,
      role,
      first_name,
      last_name,
      email,
      phone,
      status,
      assigned_client_ids,
      assigned_site_ids
    )
    values (
      new.id,
      nullif(metadata->>'agency_id', '')::uuid,
      'client_manager',
      coalesce(metadata->>'first_name', ''),
      coalesce(metadata->>'last_name', ''),
      new.email,
      nullif(metadata->>'phone', ''),
      'active',
      public.jsonb_to_uuid_array(metadata->'assigned_client_ids'),
      public.jsonb_to_uuid_array(metadata->'assigned_site_ids')
    )
    on conflict (id) do update
      set agency_id = excluded.agency_id,
          role = excluded.role,
          email = excluded.email,
          first_name = excluded.first_name,
          last_name = excluded.last_name,
          phone = excluded.phone,
          status = 'active',
          assigned_client_ids = excluded.assigned_client_ids,
          assigned_site_ids = excluded.assigned_site_ids;

    return new;
  end if;

  agency_name := coalesce(metadata->>'agency_name', split_part(new.email, '@', 1) || ' Staffing');
  agency_slug := trim(both '-' from regexp_replace(lower(agency_name), '[^a-z0-9]+', '-', 'g'));
  if exists (select 1 from public.agencies where slug = agency_slug) then
    agency_slug := agency_slug || '-' || substr(new.id::text, 1, 6);
  end if;

  insert into public.agencies (name, slug, created_by)
  values (agency_name, agency_slug, new.id)
  returning id into new_agency_id;

  insert into public.users (
    id,
    agency_id,
    role,
    first_name,
    last_name,
    email,
    phone,
    status,
    assigned_client_ids,
    assigned_site_ids
  )
  values (
    new.id,
    new_agency_id,
    'agency_admin',
    coalesce(metadata->>'first_name', ''),
    coalesce(metadata->>'last_name', ''),
    new.email,
    nullif(metadata->>'phone', ''),
    'active',
    '{}'::uuid[],
    '{}'::uuid[]
  );

  insert into public.subscriptions (agency_id, plan_id, status, worker_limit)
  values (
    new_agency_id,
    case when plan_id in ('starter', 'growth', 'pro') then plan_id else 'starter' end,
    'trialing',
    case
      when plan_id = 'growth' then 150
      when plan_id = 'pro' then 500
      else 50
    end
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

create or replace function public.log_audit_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  record_data jsonb;
  old_record_data jsonb;
  agency_uuid uuid;
  entity_uuid uuid;
begin
  if tg_op = 'DELETE' then
    record_data := null;
    old_record_data := to_jsonb(old);
    agency_uuid := nullif(old_record_data->>'agency_id', '')::uuid;
    entity_uuid := nullif(old_record_data->>'id', '')::uuid;
  else
    record_data := to_jsonb(new);
    old_record_data := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
    agency_uuid := nullif(record_data->>'agency_id', '')::uuid;
    entity_uuid := nullif(record_data->>'id', '')::uuid;
  end if;

  insert into public.audit_logs (
    agency_id,
    actor_user_id,
    entity_type,
    entity_id,
    action,
    old_data,
    new_data
  )
  values (
    agency_uuid,
    auth.uid(),
    tg_table_name,
    coalesce(entity_uuid, gen_random_uuid()),
    lower(tg_op),
    old_record_data,
    record_data
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_clients on public.clients;
create trigger audit_clients after insert or update or delete on public.clients for each row execute function public.log_audit_row();
drop trigger if exists audit_sites on public.sites;
create trigger audit_sites after insert or update or delete on public.sites for each row execute function public.log_audit_row();
drop trigger if exists audit_workers on public.workers;
create trigger audit_workers after insert or update or delete on public.workers for each row execute function public.log_audit_row();
drop trigger if exists audit_assignments on public.assignments;
create trigger audit_assignments after insert or update or delete on public.assignments for each row execute function public.log_audit_row();
drop trigger if exists audit_punches on public.punches;
create trigger audit_punches after insert or update or delete on public.punches for each row execute function public.log_audit_row();
drop trigger if exists audit_timesheets on public.timesheets;
create trigger audit_timesheets after insert or update or delete on public.timesheets for each row execute function public.log_audit_row();
drop trigger if exists audit_approvals on public.approvals;
create trigger audit_approvals after insert or update or delete on public.approvals for each row execute function public.log_audit_row();
drop trigger if exists audit_support_tickets on public.support_tickets;
create trigger audit_support_tickets after insert or update or delete on public.support_tickets for each row execute function public.log_audit_row();
drop trigger if exists audit_payroll_exports on public.payroll_exports;
create trigger audit_payroll_exports after insert or update or delete on public.payroll_exports for each row execute function public.log_audit_row();

create or replace function public.rebuild_timesheet_for_scope(
  p_agency_id uuid,
  p_client_id uuid,
  p_site_id uuid,
  p_worker_id uuid,
  p_week_start date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  punch_record record;
  shift_start timestamptz;
  lunch_start timestamptz;
  lunch_total interval := interval '0';
  total_interval interval := interval '0';
  total_hours numeric(10, 2);
  regular_hours numeric(10, 2);
  overtime_hours numeric(10, 2);
  worker_record public.workers%rowtype;
  existing_record public.timesheets%rowtype;
  week_end date := p_week_start + 6;
  next_status text := 'pending';
begin
  if p_worker_id is null then
    return;
  end if;

  select * into worker_record from public.workers where id = p_worker_id;

  for punch_record in
    select *
    from public.punches
    where agency_id = p_agency_id
      and client_id = p_client_id
      and site_id = p_site_id
      and worker_id = p_worker_id
      and punched_at >= p_week_start::timestamptz
      and punched_at < (p_week_start + 7)::timestamptz
    order by punched_at asc
  loop
    if punch_record.punch_type = 'clock_in' then
      shift_start := punch_record.punched_at;
      lunch_start := null;
      lunch_total := interval '0';
    elsif punch_record.punch_type = 'start_lunch' then
      if shift_start is not null and lunch_start is null then
        lunch_start := punch_record.punched_at;
      end if;
    elsif punch_record.punch_type = 'end_lunch' then
      if lunch_start is not null then
        lunch_total := lunch_total + (punch_record.punched_at - lunch_start);
        lunch_start := null;
      end if;
    elsif punch_record.punch_type = 'clock_out' then
      if shift_start is not null then
        if lunch_start is not null then
          lunch_total := lunch_total + (punch_record.punched_at - lunch_start);
          lunch_start := null;
        end if;
        total_interval := total_interval + greatest((punch_record.punched_at - shift_start) - lunch_total, interval '0');
        shift_start := null;
        lunch_total := interval '0';
      end if;
    end if;
  end loop;

  total_hours := round((extract(epoch from total_interval) / 3600)::numeric, 2);
  regular_hours := least(total_hours, 40);
  overtime_hours := greatest(total_hours - 40, 0);

  if total_hours <= 0 then
    delete from public.timesheets
    where agency_id = p_agency_id
      and client_id = p_client_id
      and site_id = p_site_id
      and worker_id = p_worker_id
      and week_start = p_week_start;
    return;
  end if;

  select * into existing_record
  from public.timesheets
  where agency_id = p_agency_id
    and client_id = p_client_id
    and site_id = p_site_id
    and worker_id = p_worker_id
    and week_start = p_week_start;

  if existing_record.id is not null then
    if existing_record.total_hours = total_hours
      and existing_record.regular_hours = regular_hours
      and existing_record.overtime_hours = overtime_hours then
      next_status := existing_record.status;
    else
      next_status := 'pending';
    end if;
  end if;

  insert into public.timesheets (
    agency_id,
    client_id,
    site_id,
    worker_id,
    worker_name,
    week_start,
    week_end,
    regular_hours,
    overtime_hours,
    total_hours,
    status,
    client_notes,
    agency_notes,
    client_approved_at,
    client_approved_by
  )
  values (
    p_agency_id,
    p_client_id,
    p_site_id,
    p_worker_id,
    trim(both ' ' from coalesce(worker_record.first_name, '') || ' ' || coalesce(worker_record.last_name, '')),
    p_week_start,
    week_end,
    regular_hours,
    overtime_hours,
    total_hours,
    next_status,
    existing_record.client_notes,
    existing_record.agency_notes,
    case when next_status = existing_record.status then existing_record.client_approved_at else null end,
    case when next_status = existing_record.status then existing_record.client_approved_by else null end
  )
  on conflict (worker_id, site_id, week_start)
  do update set
    regular_hours = excluded.regular_hours,
    overtime_hours = excluded.overtime_hours,
    total_hours = excluded.total_hours,
    worker_name = excluded.worker_name,
    status = excluded.status,
    client_notes = excluded.client_notes,
    agency_notes = excluded.agency_notes,
    client_approved_at = excluded.client_approved_at,
    client_approved_by = excluded.client_approved_by,
    updated_at = now();
end;
$$;

create or replace function public.sync_timesheet_from_punch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_week_start date;
begin
  if tg_op = 'DELETE' then
    if old.worker_id is not null then
      target_week_start := date_trunc('week', old.punched_at)::date;
      perform public.rebuild_timesheet_for_scope(old.agency_id, old.client_id, old.site_id, old.worker_id, target_week_start);
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.worker_id is not null then
      perform public.rebuild_timesheet_for_scope(old.agency_id, old.client_id, old.site_id, old.worker_id, date_trunc('week', old.punched_at)::date);
    end if;
  end if;

  if new.worker_id is not null then
    perform public.rebuild_timesheet_for_scope(new.agency_id, new.client_id, new.site_id, new.worker_id, date_trunc('week', new.punched_at)::date);
  end if;

  return new;
end;
$$;

drop trigger if exists sync_timesheets_after_punch on public.punches;
create trigger sync_timesheets_after_punch
after insert or update or delete on public.punches
for each row execute function public.sync_timesheet_from_punch();

create or replace function public.resolve_clock_state(
  p_agency_id uuid,
  p_site_id uuid,
  p_worker_id uuid,
  p_worker_name text
)
returns table (
  state text,
  last_action text,
  last_punched_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  latest_punch public.punches%rowtype;
begin
  select *
  into latest_punch
  from public.punches
  where agency_id = p_agency_id
    and site_id = p_site_id
    and (
      (p_worker_id is not null and worker_id = p_worker_id)
      or
      (p_worker_id is null and worker_id is null and lower(worker_name) = lower(coalesce(p_worker_name, '')))
    )
  order by punched_at desc
  limit 1;

  if latest_punch.id is null then
    return query select 'clocked_out', null::text, null::timestamptz;
    return;
  end if;

  return query select
    case
      when latest_punch.punch_type = 'clock_in' then 'clocked_in'
      when latest_punch.punch_type = 'start_lunch' then 'on_lunch'
      when latest_punch.punch_type = 'end_lunch' then 'clocked_in'
      when latest_punch.punch_type = 'clock_out' then 'clocked_out'
      else 'unknown'
    end,
    latest_punch.punch_type,
    latest_punch.punched_at;
end;
$$;

create or replace function public.list_clock_agencies()
returns table (
  id uuid,
  name text
)
language sql
security definer
stable
set search_path = public
as $$
  select id, name
  from public.agencies
  where status = 'active'
  order by name
$$;

create or replace function public.list_clock_clients(p_agency_id uuid)
returns table (
  id uuid,
  agency_id uuid,
  name text
)
language sql
security definer
stable
set search_path = public
as $$
  select id, agency_id, name
  from public.clients
  where agency_id = p_agency_id
    and status = 'active'
  order by name
$$;

create or replace function public.list_clock_sites(p_agency_id uuid, p_client_id uuid)
returns table (
  id uuid,
  agency_id uuid,
  client_id uuid,
  name text,
  address_line_1 text
)
language sql
security definer
stable
set search_path = public
as $$
  select id, agency_id, client_id, name, address_line_1
  from public.sites
  where agency_id = p_agency_id
    and client_id = p_client_id
    and status = 'active'
  order by name
$$;

create or replace function public.list_clock_workers(
  p_agency_id uuid,
  p_client_id uuid,
  p_site_id uuid
)
returns table (
  id uuid,
  first_name text,
  last_name text,
  display_name text
)
language sql
security definer
stable
set search_path = public
as $$
  with active_assignments as (
    select distinct worker_id
    from public.assignments
    where agency_id = p_agency_id
      and client_id = p_client_id
      and site_id = p_site_id
      and status = 'active'
  )
  select distinct on (w.id)
    w.id,
    w.first_name,
    w.last_name,
    trim(both ' ' from w.first_name || ' ' || w.last_name) as display_name
  from public.workers w
  left join active_assignments a on a.worker_id = w.id
  where w.agency_id = p_agency_id
    and w.status = 'active'
    and (
      w.assigned_site_id = p_site_id
      or w.assigned_client_id = p_client_id
      or a.worker_id is not null
    )
  order by w.id, w.last_name, w.first_name
$$;

create or replace function public.get_clock_worker_status(
  p_agency_id uuid,
  p_client_id uuid,
  p_site_id uuid,
  p_worker_id uuid default null,
  p_worker_name text default null
)
returns table (
  state text,
  last_action text,
  last_punched_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select *
  from public.resolve_clock_state(p_agency_id, p_site_id, p_worker_id, p_worker_name)
$$;

create or replace function public.submit_public_punch(
  p_agency_id uuid,
  p_client_id uuid,
  p_site_id uuid,
  p_worker_id uuid,
  p_worker_name text,
  p_phone_or_pin text,
  p_punch_type text,
  p_device_info jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  agency_record public.agencies%rowtype;
  client_record public.clients%rowtype;
  site_record public.sites%rowtype;
  worker_record public.workers%rowtype;
  resolved_worker_id uuid := p_worker_id;
  resolved_worker_name text := trim(coalesce(p_worker_name, ''));
  matched boolean := false;
  current_state text := 'clocked_out';
  last_action text;
  last_punched_at timestamptz;
  now_utc timestamptz := now();
  inserted_punch public.punches%rowtype;
begin
  if p_punch_type not in ('clock_in', 'start_lunch', 'end_lunch', 'clock_out') then
    raise exception 'Invalid punch action.';
  end if;

  select * into agency_record from public.agencies where id = p_agency_id and status = 'active';
  if agency_record.id is null then
    raise exception 'This agency is not available for punching.';
  end if;

  select * into client_record
  from public.clients
  where id = p_client_id
    and agency_id = p_agency_id
    and status = 'active';
  if client_record.id is null then
    raise exception 'This client is not available for punching.';
  end if;

  select * into site_record
  from public.sites
  where id = p_site_id
    and agency_id = p_agency_id
    and client_id = p_client_id
    and status = 'active';
  if site_record.id is null then
    raise exception 'This job site is not available for punching.';
  end if;

  if resolved_worker_id is null and resolved_worker_name <> '' then
    select w.*
    into worker_record
    from public.workers w
    where w.agency_id = p_agency_id
      and w.status = 'active'
      and lower(trim(both ' ' from w.first_name || ' ' || w.last_name)) = lower(resolved_worker_name)
      and (
        w.assigned_site_id = p_site_id
        or w.assigned_client_id = p_client_id
        or exists (
          select 1
          from public.assignments a
          where a.worker_id = w.id
            and a.site_id = p_site_id
            and a.status = 'active'
        )
      )
    order by w.created_at desc
    limit 1;

    if worker_record.id is not null then
      resolved_worker_id := worker_record.id;
    end if;
  elsif resolved_worker_id is not null then
    select *
    into worker_record
    from public.workers
    where id = resolved_worker_id
      and agency_id = p_agency_id
      and status = 'active'
    limit 1;
  end if;

  if worker_record.id is not null then
    matched := true;
    resolved_worker_name := trim(both ' ' from worker_record.first_name || ' ' || worker_record.last_name);
    if coalesce(worker_record.phone_last4, '') <> '' or coalesce(worker_record.worker_pin, '') <> '' then
      if trim(coalesce(p_phone_or_pin, '')) = '' then
        raise exception 'Enter the last four digits of the worker phone number or the worker PIN.';
      end if;

      if trim(coalesce(p_phone_or_pin, '')) <> coalesce(worker_record.phone_last4, '')
         and trim(coalesce(p_phone_or_pin, '')) <> coalesce(worker_record.worker_pin, '') then
        raise exception 'The worker verification did not match.';
      end if;
    end if;
  end if;

  select state, last_action, last_punched_at
  into current_state, last_action, last_punched_at
  from public.resolve_clock_state(p_agency_id, p_site_id, resolved_worker_id, resolved_worker_name);

  if p_punch_type = 'clock_in' and current_state in ('clocked_in', 'on_lunch') then
    raise exception 'This worker is already clocked in.';
  end if;

  if p_punch_type = 'start_lunch' and current_state <> 'clocked_in' then
    raise exception 'The worker must be clocked in before lunch can start.';
  end if;

  if p_punch_type = 'end_lunch' and current_state <> 'on_lunch' then
    raise exception 'The worker is not currently on lunch.';
  end if;

  if p_punch_type = 'clock_out' and current_state = 'clocked_out' then
    raise exception 'This worker is already clocked out.';
  end if;

  insert into public.punches (
    agency_id,
    client_id,
    site_id,
    worker_id,
    worker_name,
    worker_matched,
    punch_type,
    punched_at,
    local_date,
    source,
    device_info,
    notes,
    created_by,
    is_manual
  )
  values (
    p_agency_id,
    p_client_id,
    p_site_id,
    resolved_worker_id,
    resolved_worker_name,
    matched,
    p_punch_type,
    now_utc,
    now_utc::date,
    'qr_clock',
    coalesce(p_device_info, '{}'::jsonb),
    null,
    auth.uid(),
    false
  )
  returning * into inserted_punch;

  current_state := case
    when p_punch_type = 'clock_in' then 'clocked_in'
    when p_punch_type = 'start_lunch' then 'on_lunch'
    when p_punch_type = 'end_lunch' then 'clocked_in'
    when p_punch_type = 'clock_out' then 'clocked_out'
    else 'unknown'
  end;

  return jsonb_build_object(
    'ok', true,
    'message', initcap(replace(p_punch_type, '_', ' ')) || ' saved for ' || resolved_worker_name || '.',
    'punch_id', inserted_punch.id,
    'worker_name', resolved_worker_name,
    'punch_type', inserted_punch.punch_type,
    'punched_at', inserted_punch.punched_at,
    'current_state', current_state
  );
end;
$$;

grant execute on function public.list_clock_agencies() to anon, authenticated;
grant execute on function public.list_clock_clients(uuid) to anon, authenticated;
grant execute on function public.list_clock_sites(uuid, uuid) to anon, authenticated;
grant execute on function public.list_clock_workers(uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.get_clock_worker_status(uuid, uuid, uuid, uuid, text) to anon, authenticated;
grant execute on function public.submit_public_punch(uuid, uuid, uuid, uuid, text, text, text, jsonb) to anon, authenticated;

alter table public.agencies enable row level security;
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.sites enable row level security;
alter table public.workers enable row level security;
alter table public.assignments enable row level security;
alter table public.punches enable row level security;
alter table public.timesheets enable row level security;
alter table public.approvals enable row level security;
alter table public.payroll_exports enable row level security;
alter table public.support_tickets enable row level security;
alter table public.audit_logs enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "agencies_select" on public.agencies;
create policy "agencies_select"
on public.agencies
for select
using (
  public.is_platform_owner()
  or id = public.current_agency_id()
);

drop policy if exists "agencies_update" on public.agencies;
create policy "agencies_update"
on public.agencies
for update
using (
  public.is_platform_owner()
  or (public.is_agency_admin() and id = public.current_agency_id())
)
with check (
  public.is_platform_owner()
  or (public.is_agency_admin() and id = public.current_agency_id())
);

drop policy if exists "users_select" on public.users;
create policy "users_select"
on public.users
for select
using (
  public.is_platform_owner()
  or id = auth.uid()
  or (public.is_agency_admin() and agency_id = public.current_agency_id())
);

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self"
on public.users
for update
using (
  id = auth.uid()
  or public.is_platform_owner()
  or (public.is_agency_admin() and agency_id = public.current_agency_id())
)
with check (
  id = auth.uid()
  or public.is_platform_owner()
  or (public.is_agency_admin() and agency_id = public.current_agency_id())
);

drop policy if exists "clients_manage" on public.clients;
create policy "clients_manage"
on public.clients
for all
using (
  public.is_platform_owner()
  or (agency_id = public.current_agency_id() and public.is_agency_admin())
  or (agency_id = public.current_agency_id() and public.is_client_manager() and public.has_client_or_site_scope(id, null))
)
with check (
  public.is_platform_owner()
  or (agency_id = public.current_agency_id() and public.is_agency_admin())
);

drop policy if exists "sites_manage" on public.sites;
create policy "sites_manage"
on public.sites
for all
using (
  public.is_platform_owner()
  or (agency_id = public.current_agency_id() and public.is_agency_admin())
  or (agency_id = public.current_agency_id() and public.is_client_manager() and public.has_client_or_site_scope(client_id, id))
)
with check (
  public.is_platform_owner()
  or (agency_id = public.current_agency_id() and public.is_agency_admin())
);

drop policy if exists "workers_manage" on public.workers;
create policy "workers_manage"
on public.workers
for all
using (
  public.is_platform_owner()
  or (agency_id = public.current_agency_id() and public.is_agency_admin())
  or (
    agency_id = public.current_agency_id()
    and public.is_client_manager()
    and public.has_client_or_site_scope(assigned_client_id, assigned_site_id)
  )
)
with check (
  public.is_platform_owner()
  or (agency_id = public.current_agency_id() and public.is_agency_admin())
);

drop policy if exists "assignments_manage" on public.assignments;
create policy "assignments_manage"
on public.assignments
for all
using (
  public.is_platform_owner()
  or (agency_id = public.current_agency_id() and public.is_agency_admin())
  or (agency_id = public.current_agency_id() and public.is_client_manager() and public.has_client_or_site_scope(client_id, site_id))
)
with check (
  public.is_platform_owner()
  or (agency_id = public.current_agency_id() and public.is_agency_admin())
);

drop policy if exists "punches_manage" on public.punches;
create policy "punches_manage"
on public.punches
for all
using (
  public.is_platform_owner()
  or (agency_id = public.current_agency_id() and public.is_agency_admin())
  or (agency_id = public.current_agency_id() and public.is_client_manager() and public.has_client_or_site_scope(client_id, site_id))
)
with check (
  public.is_platform_owner()
  or (agency_id = public.current_agency_id() and public.is_agency_admin())
);

drop policy if exists "timesheets_manage" on public.timesheets;
create policy "timesheets_manage"
on public.timesheets
for all
using (
  public.is_platform_owner()
  or (agency_id = public.current_agency_id() and public.is_agency_admin())
  or (agency_id = public.current_agency_id() and public.is_client_manager() and public.has_client_or_site_scope(client_id, site_id))
)
with check (
  public.is_platform_owner()
  or (agency_id = public.current_agency_id() and public.is_agency_admin())
  or (agency_id = public.current_agency_id() and public.is_client_manager() and public.has_client_or_site_scope(client_id, site_id))
);

drop policy if exists "approvals_manage" on public.approvals;
create policy "approvals_manage"
on public.approvals
for all
using (
  public.is_platform_owner()
  or (agency_id = public.current_agency_id() and public.is_agency_admin())
  or (agency_id = public.current_agency_id() and public.is_client_manager() and public.has_client_or_site_scope(
    (select client_id from public.timesheets where id = timesheet_id),
    (select site_id from public.timesheets where id = timesheet_id)
  ))
)
with check (
  public.is_platform_owner()
  or (agency_id = public.current_agency_id() and public.is_agency_admin())
  or (agency_id = public.current_agency_id() and public.is_client_manager())
);

drop policy if exists "payroll_exports_manage" on public.payroll_exports;
create policy "payroll_exports_manage"
on public.payroll_exports
for all
using (
  public.is_platform_owner()
  or (agency_id = public.current_agency_id() and public.is_agency_admin())
)
with check (
  public.is_platform_owner()
  or (agency_id = public.current_agency_id() and public.is_agency_admin())
);

drop policy if exists "support_tickets_manage" on public.support_tickets;
create policy "support_tickets_manage"
on public.support_tickets
for all
using (
  public.is_platform_owner()
  or agency_id = public.current_agency_id()
)
with check (
  public.is_platform_owner()
  or agency_id = public.current_agency_id()
);

drop policy if exists "audit_logs_select" on public.audit_logs;
create policy "audit_logs_select"
on public.audit_logs
for select
using (
  public.is_platform_owner()
  or agency_id = public.current_agency_id()
);

drop policy if exists "subscriptions_manage" on public.subscriptions;
create policy "subscriptions_manage"
on public.subscriptions
for all
using (
  public.is_platform_owner()
  or (agency_id = public.current_agency_id() and public.is_agency_admin())
)
with check (
  public.is_platform_owner()
  or (agency_id = public.current_agency_id() and public.is_agency_admin())
);
