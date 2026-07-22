-- Brand CAC e-vetting dossier — unlocks cart when is_e_vetted after KYC minimums.

alter table creators add column if not exists cac_rc_number text;
alter table creators add column if not exists legal_name text;
alter table creators add column if not exists registered_address text;
alter table creators add column if not exists main_director text;
alter table creators add column if not exists contact_email text;
alter table creators add column if not exists contact_phone text;
alter table creators add column if not exists social_instagram text;
alter table creators add column if not exists social_whatsapp text;
alter table creators add column if not exists social_other text;
alter table creators add column if not exists tin text;
alter table creators add column if not exists id_shot_path text;
alter table creators add column if not exists id_shot_note text;
alter table creators add column if not exists scandals_notes text;
alter table creators add column if not exists scandals_cleared boolean not null default false;
alter table creators add column if not exists cac_verified boolean not null default false;
alter table creators add column if not exists cac_verified_at timestamptz;
alter table creators add column if not exists cac_snap_raw text;
alter table creators add column if not exists vetted_at timestamptz;

comment on column creators.cac_rc_number is 'CAC registration / RC number verified by admin with brand_e_vetting privilege';
comment on column creators.is_e_vetted is 'True only after CAC + KYC minimums; unlocks Add to Bag for brand pieces';

-- creators_admin (for all) already covers updates for is_admin() in 004.
