create extension if not exists pgcrypto;

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whop_section_link text not null default '',
  whop_campaign_url text not null default '',
  requirements_text text not null,
  official_asset_link text not null default '',
  platform text not null,
  deadline date not null,
  status text not null default 'active',
  expected_payout numeric,
  ai_analysis jsonb,
  generated_captions jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists clips (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  clip_idea text not null default '',
  clip_title text not null default '',
  platform text not null default 'Cross-platform',
  caption text not null default '',
  opus_clip_status text not null default 'not-started',
  video_file_status text not null default 'not-started',
  posted_url text not null default '',
  views integer not null default 0,
  submission_status text not null default 'not-started',
  whop_submission_link text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table campaigns add column if not exists whop_section_link text not null default '';
alter table campaigns add column if not exists whop_campaign_url text not null default '';
alter table campaigns add column if not exists official_asset_link text not null default '';
alter table campaigns add column if not exists ai_analysis jsonb;
alter table campaigns add column if not exists generated_captions jsonb;

alter table clips add column if not exists clip_title text not null default '';
alter table clips add column if not exists platform text not null default 'Cross-platform';
alter table clips add column if not exists caption text not null default '';

create table if not exists app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into app_settings (key, value)
values ('global', '{"n8nWebhookUrl":"","defaultDisclosure":"#ad"}'::jsonb)
on conflict (key) do nothing;
