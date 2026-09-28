-- SI-INUK Supabase schema
-- Jalankan pada project Supabase baru / project SI-INUK yang sedang digunakan.
-- Script ini idempotent dan tidak menghapus data/object yang sudah ada.

create extension if not exists pgcrypto;

-- =========================================================
-- ENUM
-- =========================================================

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'app_role'
  ) then
    create type public.app_role as enum ('admin', 'lks', 'viewer');
  elsif exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'app_role'
      and e.enumlabel = 'operator'
  ) and not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'app_role'
      and e.enumlabel = 'lks'
  ) then
    alter type public.app_role rename value 'operator' to 'lks';
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'lks_workflow_status'
  ) then
    create type public.lks_workflow_status as enum (
      'draft',
      'menunggu_verifikasi',
      'disetujui',
      'ditolak',
      'tidak_aktif'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'registration_section'
  ) then
    create type public.registration_section as enum (
      'identitas',
      'legalitas',
      'sdm',
      'layanan',
      'pm',
      'sarpras',
      'tanda_daftar'
    );
  end if;
end
$$;


-- =========================================================
-- PROFILES
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.app_role not null default 'lks',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Penting untuk database yang sudah ada:
-- ubah default lama 'operator' menjadi 'lks'.
alter table public.profiles
  alter column role set default 'lks';


-- =========================================================
-- LKS
-- =========================================================

create table if not exists public.lks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nama_lks text not null,
  status_lks text not null default 'Aktif',
  status_akreditasi text,
  workflow_status public.lks_workflow_status not null default 'draft',
  kecamatan text,
  desa text,
  alamat text,
  latitude double precision,
  longitude double precision,
  email text,
  telepon text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180)
);


-- =========================================================
-- REGISTRATION SNAPSHOT
-- =========================================================

create table if not exists public.lks_registration_snapshot (
  id uuid primary key default gen_random_uuid(),
  lks_id uuid not null references public.lks(id) on delete cascade,
  section_name public.registration_section not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lks_id, section_name)
);


-- =========================================================
-- DOCUMENTS
-- =========================================================

create table if not exists public.lks_documents (
  id uuid primary key default gen_random_uuid(),
  lks_id uuid not null references public.lks(id) on delete cascade,
  document_type text not null,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  metadata jsonb not null default '{}'::jsonb,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- The upload helper uses storage_path as its upsert conflict target.
create unique index if not exists lks_documents_storage_path_uidx
on public.lks_documents(storage_path);

-- Composite target ties Legalitas attachment paths to the same LKS.
create unique index if not exists lks_documents_lks_storage_path_uidx
on public.lks_documents(lks_id, storage_path);


-- =========================================================
-- STATUS HISTORY
-- =========================================================

create table if not exists public.lks_status_history (
  id uuid primary key default gen_random_uuid(),
  lks_id uuid not null references public.lks(id) on delete cascade,
  from_status public.lks_workflow_status,
  to_status public.lks_workflow_status not null,
  note text,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);


-- =========================================================
-- LEGALITAS
-- =========================================================

create table if not exists public.lks_legalitas (
  id uuid primary key default gen_random_uuid(),
  lks_id uuid not null unique references public.lks(id) on delete cascade,
  nomor_akta_pendirian text,
  tanggal_akta_pendirian date,
  akta_notaris_file_name text,
  akta_notaris_storage_path text,
  status_badan_hukum text check (
    status_badan_hukum is null
    or status_badan_hukum in (
      'Berbadan Hukum',
      'Tidak Berbadan Hukum'
    )
  ),
  nomor_pengesahan_kemenkumham text,
  sk_pengesahan_kemenkumham_file_name text,
  sk_pengesahan_kemenkumham_storage_path text,
  ad_art_file_name text,
  ad_art_storage_path text,
  npwp_lks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    (akta_notaris_file_name is null)
    = (akta_notaris_storage_path is null)
  ),

  check (
    (sk_pengesahan_kemenkumham_file_name is null)
    = (sk_pengesahan_kemenkumham_storage_path is null)
  ),

  check (
    (ad_art_file_name is null)
    = (ad_art_storage_path is null)
  ),

  check (
    status_badan_hukum <> 'Berbadan Hukum'
    or (
      nullif(trim(nomor_pengesahan_kemenkumham), '') is not null
      and sk_pengesahan_kemenkumham_storage_path is not null
    )
  )
);

-- Enforce that each Legalitas attachment references document metadata
-- belonging to the same LKS. NOT VALID preserves existing legacy rows;
-- new and updated rows are still checked.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'lks_legalitas_akta_document_fk'
      and conrelid = 'public.lks_legalitas'::regclass
  ) then
    alter table public.lks_legalitas
      add constraint lks_legalitas_akta_document_fk
      foreign key (lks_id, akta_notaris_storage_path)
      references public.lks_documents (lks_id, storage_path)
      on update cascade
      deferrable initially deferred
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'lks_legalitas_sk_document_fk'
      and conrelid = 'public.lks_legalitas'::regclass
  ) then
    alter table public.lks_legalitas
      add constraint lks_legalitas_sk_document_fk
      foreign key (lks_id, sk_pengesahan_kemenkumham_storage_path)
      references public.lks_documents (lks_id, storage_path)
      on update cascade
      deferrable initially deferred
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'lks_legalitas_ad_art_document_fk'
      and conrelid = 'public.lks_legalitas'::regclass
  ) then
    alter table public.lks_legalitas
      add constraint lks_legalitas_ad_art_document_fk
      foreign key (lks_id, ad_art_storage_path)
      references public.lks_documents (lks_id, storage_path)
      on update cascade
      deferrable initially deferred
      not valid;
  end if;
end
$$;


-- =========================================================
-- SDM
-- =========================================================

create table if not exists public.lks_sdm (
  id uuid primary key default gen_random_uuid(),
  lks_id uuid not null unique references public.lks(id) on delete cascade,
  nama_pimpinan text,
  email text,
  data_sdm_file_name text,
  data_sdm_storage_path text,
  sertifikasi_file_name text,
  sertifikasi_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    (data_sdm_file_name is null)
    = (data_sdm_storage_path is null)
  ),

  check (
    (sertifikasi_file_name is null)
    = (sertifikasi_storage_path is null)
  )
);


-- =========================================================
-- LAYANAN
-- =========================================================

create table if not exists public.lks_layanan (
  id uuid primary key default gen_random_uuid(),
  lks_id uuid not null unique references public.lks(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lks_layanan_jenis (
  id uuid primary key default gen_random_uuid(),
  layanan_id uuid not null references public.lks_layanan(id) on delete cascade,
  jenis_pelayanan text not null,
  created_at timestamptz not null default now(),
  unique (layanan_id, jenis_pelayanan)
);

create table if not exists public.lks_layanan_sasaran (
  id uuid primary key default gen_random_uuid(),
  layanan_id uuid not null references public.lks_layanan(id) on delete cascade,
  sasaran_pelayanan text not null,
  created_at timestamptz not null default now(),
  unique (layanan_id, sasaran_pelayanan)
);

create table if not exists public.lks_layanan_permasalahan (
  id uuid primary key default gen_random_uuid(),
  layanan_id uuid not null references public.lks_layanan(id) on delete cascade,
  permasalahan_sosial text not null,
  created_at timestamptz not null default now(),
  unique (layanan_id, permasalahan_sosial)
);

create table if not exists public.lks_layanan_sistem (
  id uuid primary key default gen_random_uuid(),
  layanan_id uuid not null references public.lks_layanan(id) on delete cascade,
  sistem_pelayanan text not null,
  created_at timestamptz not null default now(),
  unique (layanan_id, sistem_pelayanan)
);

create table if not exists public.lks_layanan_wilayah (
  id uuid primary key default gen_random_uuid(),
  layanan_id uuid not null references public.lks_layanan(id) on delete cascade,
  kecamatan text not null,
  desa text not null,
  created_at timestamptz not null default now(),
  unique (layanan_id, kecamatan, desa)
);


-- =========================================================
-- PM
-- =========================================================

create table if not exists public.lks_pm (
  id uuid primary key default gen_random_uuid(),
  lks_id uuid not null unique references public.lks(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lks_pm_penerima_manfaat (
  id uuid primary key default gen_random_uuid(),
  pm_id uuid not null references public.lks_pm(id) on delete cascade,
  tahun_data text not null,
  pm_perempuan integer not null default 0 check (pm_perempuan >= 0),
  pm_laki_laki integer not null default 0 check (pm_laki_laki >= 0),
  bnba_file_name text,
  bnba_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pm_id, tahun_data),
  check (
    (bnba_file_name is null)
    = (bnba_storage_path is null)
  )
);

create table if not exists public.lks_pm_pembinaan (
  id uuid primary key default gen_random_uuid(),
  pm_id uuid not null references public.lks_pm(id) on delete cascade,
  tahun text not null,
  status text not null check (
    status in ('YA', 'TIDAK_ADA')
  ),
  jenis_kegiatan_pembinaan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    status = 'TIDAK_ADA'
    or nullif(trim(jenis_kegiatan_pembinaan), '') is not null
  )
);

create table if not exists public.lks_pm_bantuan (
  id uuid primary key default gen_random_uuid(),
  pm_id uuid not null references public.lks_pm(id) on delete cascade,
  tahun text not null,
  status text not null check (
    status in ('ADA', 'TIDAK_ADA')
  ),
  pemberi_bantuan text,
  jenis_bantuan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    status = 'TIDAK_ADA'
    or (
      nullif(trim(pemberi_bantuan), '') is not null
      and nullif(trim(jenis_bantuan), '') is not null
    )
  )
);


-- =========================================================
-- SARPRAS
-- =========================================================

create table if not exists public.lks_sarpras (
  id uuid primary key default gen_random_uuid(),
  lks_id uuid not null references public.lks(id) on delete cascade,
  item text not null,
  nama text not null,
  status text check (
    status is null
    or status in ('ADA', 'TIDAK ADA')
  ),
  file_name text,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lks_id, item),

  check (
    (file_name is null)
    = (storage_path is null)
  ),

  check (
    status <> 'ADA'
    or storage_path is not null
  )
);


-- =========================================================
-- TANDA DAFTAR
-- =========================================================

create table if not exists public.lks_tanda_daftar (
  id uuid primary key default gen_random_uuid(),
  lks_id uuid not null unique references public.lks(id) on delete cascade,
  status_pengajuan text not null default 'DRAFT' check (
    status_pengajuan in (
      'DRAFT',
      'DIAJUKAN',
      'PERLU_PERBAIKAN'
    )
  ),

  surat_permohonan_file_name text,
  surat_permohonan_storage_path text,

  kerjasama_dinas_file_name text,
  kerjasama_dinas_storage_path text,

  surat_keterangan_domisili_file_name text,
  surat_keterangan_domisili_storage_path text,

  catatan_verifikasi text,
  diverifikasi_at timestamptz,
  diverifikasi_by uuid references public.profiles(id) on delete set null,

  dokumen_tdd_file_name text,
  dokumen_tdd_storage_path text,
  dokumen_tdd_uploaded_at timestamptz,
  dokumen_tdd_uploaded_by uuid references public.profiles(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    (surat_permohonan_file_name is null)
    = (surat_permohonan_storage_path is null)
  ),

  check (
    (kerjasama_dinas_file_name is null)
    = (kerjasama_dinas_storage_path is null)
  ),

  check (
    (surat_keterangan_domisili_file_name is null)
    = (surat_keterangan_domisili_storage_path is null)
  ),

  check (
    (dokumen_tdd_file_name is null)
    = (dokumen_tdd_storage_path is null)
  )
);


-- =========================================================
-- WILAYAH
-- =========================================================

create table if not exists public.wilayah (
  id uuid primary key default gen_random_uuid(),
  kode text unique,
  nama_kecamatan text not null,
  nama_desa text not null,
  created_at timestamptz not null default now(),
  unique (nama_kecamatan, nama_desa)
);


-- =========================================================
-- FUNCTIONS
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


create or replace function public.set_lks_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or trim(new.slug) = '' then
    new.slug = new.nama_lks;
  end if;

  new.slug = lower(
    regexp_replace(
      regexp_replace(
        new.slug,
        '[^a-zA-Z0-9[:space:]-]+',
        '',
        'g'
      ),
      '[[:space:]]+',
      '-',
      'g'
    )
  );

  new.slug = trim(
    both '-'
    from regexp_replace(new.slug, '-+', '-', 'g')
  );

  if new.slug = '' then
    new.slug = 'lks-' ||
      replace(gen_random_uuid()::text, '-', '');
  end if;

  return new;
end;
$$;


create or replace function public.set_lks_created_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.created_by := auth.uid();
  end if;

  return new;
end;
$$;


create or replace function public.validate_lks_tdd_submission()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status_pengajuan = 'DIAJUKAN' and (
    new.surat_permohonan_file_name is null
    or new.surat_permohonan_storage_path is null
    or not exists (
      select 1
      from public.lks_documents d
      where d.lks_id = new.lks_id
        and d.storage_path = new.surat_permohonan_storage_path
        and d.file_name = new.surat_permohonan_file_name
        and d.document_type = 'tanda-daftar'
        and d.metadata ->> 'field_name' = 'surat_permohonan'
    )
  ) then
    raise exception 'TDD tidak dapat diajukan sebelum Surat Permohonan tersimpan pada dokumen LKS.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;


create or replace function public.validate_lks_legalitas_documents()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.akta_notaris_storage_path is not null and not exists (
    select 1
    from public.lks_documents d
    where d.lks_id = new.lks_id
      and d.storage_path = new.akta_notaris_storage_path
      and d.file_name = new.akta_notaris_file_name
      and d.document_type = 'legalitas'
      and d.metadata ->> 'field_name' = 'akta_notaris'
  ) then
    raise exception 'Path Akta Notaris harus merujuk metadata dokumen Legalitas pada LKS yang sama.'
      using errcode = '23514';
  end if;

  if new.sk_pengesahan_kemenkumham_storage_path is not null and not exists (
    select 1
    from public.lks_documents d
    where d.lks_id = new.lks_id
      and d.storage_path = new.sk_pengesahan_kemenkumham_storage_path
      and d.file_name = new.sk_pengesahan_kemenkumham_file_name
      and d.document_type = 'legalitas'
      and d.metadata ->> 'field_name' = 'sk_pengesahan_kemenkumham'
  ) then
    raise exception 'Path SK Kemenkumham harus merujuk metadata dokumen Legalitas pada LKS yang sama.'
      using errcode = '23514';
  end if;

  if new.ad_art_storage_path is not null and not exists (
    select 1
    from public.lks_documents d
    where d.lks_id = new.lks_id
      and d.storage_path = new.ad_art_storage_path
      and d.file_name = new.ad_art_file_name
      and d.document_type = 'legalitas'
      and d.metadata ->> 'field_name' = 'ad_art'
  ) then
    raise exception 'Path AD/ART harus merujuk metadata dokumen Legalitas pada LKS yang sama.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;


-- =========================================================
-- AUTH USER -> PROFILE
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role
  )
  values (
    new.id,
    coalesce(
      new.email,
      new.id::text || '@unknown.local'
    ),
    new.raw_user_meta_data ->> 'full_name',
    'lks'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(
          excluded.full_name,
          profiles.full_name
        );

  return new;
end;
$$;


-- =========================================================
-- TRIGGER CLEANUP
-- =========================================================

drop trigger if exists trg_profiles_updated_at
on public.profiles;

drop trigger if exists trg_lks_updated_at
on public.lks;

drop trigger if exists trg_lks_registration_snapshot_updated_at
on public.lks_registration_snapshot;

drop trigger if exists trg_lks_legalitas_updated_at
on public.lks_legalitas;

drop trigger if exists trg_lks_sdm_updated_at
on public.lks_sdm;

drop trigger if exists trg_lks_layanan_updated_at
on public.lks_layanan;

drop trigger if exists trg_lks_pm_updated_at
on public.lks_pm;

drop trigger if exists trg_lks_pm_penerima_manfaat_updated_at
on public.lks_pm_penerima_manfaat;

drop trigger if exists trg_lks_pm_pembinaan_updated_at
on public.lks_pm_pembinaan;

drop trigger if exists trg_lks_pm_bantuan_updated_at
on public.lks_pm_bantuan;

drop trigger if exists trg_lks_sarpras_updated_at
on public.lks_sarpras;

drop trigger if exists trg_lks_tanda_daftar_updated_at
on public.lks_tanda_daftar;

drop trigger if exists trg_lks_set_slug
on public.lks;

drop trigger if exists trg_lks_set_created_by
on public.lks;

drop trigger if exists trg_lks_tdd_submission_documents
on public.lks_tanda_daftar;

drop trigger if exists trg_lks_legalitas_documents
on public.lks_legalitas;

drop trigger if exists on_auth_user_created
on auth.users;


-- =========================================================
-- TRIGGERS
-- =========================================================

create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger trg_lks_updated_at
before update on public.lks
for each row
execute function public.set_updated_at();

create trigger trg_lks_registration_snapshot_updated_at
before update on public.lks_registration_snapshot
for each row
execute function public.set_updated_at();

create trigger trg_lks_legalitas_updated_at
before update on public.lks_legalitas
for each row
execute function public.set_updated_at();

create trigger trg_lks_sdm_updated_at
before update on public.lks_sdm
for each row
execute function public.set_updated_at();

create trigger trg_lks_layanan_updated_at
before update on public.lks_layanan
for each row
execute function public.set_updated_at();

create trigger trg_lks_pm_updated_at
before update on public.lks_pm
for each row
execute function public.set_updated_at();

create trigger trg_lks_pm_penerima_manfaat_updated_at
before update on public.lks_pm_penerima_manfaat
for each row
execute function public.set_updated_at();

create trigger trg_lks_pm_pembinaan_updated_at
before update on public.lks_pm_pembinaan
for each row
execute function public.set_updated_at();

create trigger trg_lks_pm_bantuan_updated_at
before update on public.lks_pm_bantuan
for each row
execute function public.set_updated_at();

create trigger trg_lks_sarpras_updated_at
before update on public.lks_sarpras
for each row
execute function public.set_updated_at();

create trigger trg_lks_tanda_daftar_updated_at
before update on public.lks_tanda_daftar
for each row
execute function public.set_updated_at();

create trigger trg_lks_set_slug
before insert or update on public.lks
for each row
execute function public.set_lks_slug();

create trigger trg_lks_set_created_by
before insert on public.lks
for each row
execute function public.set_lks_created_by();

create trigger trg_lks_tdd_submission_documents
before insert or update on public.lks_tanda_daftar
for each row
execute function public.validate_lks_tdd_submission();

create trigger trg_lks_legalitas_documents
before insert or update on public.lks_legalitas
for each row
execute function public.validate_lks_legalitas_documents();

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();


-- =========================================================
-- RLS ENABLE
-- =========================================================

alter table public.profiles enable row level security;
alter table public.lks enable row level security;
alter table public.lks_registration_snapshot enable row level security;
alter table public.lks_documents enable row level security;
alter table public.lks_status_history enable row level security;
alter table public.lks_legalitas enable row level security;
alter table public.lks_sdm enable row level security;
alter table public.lks_layanan enable row level security;
alter table public.lks_layanan_jenis enable row level security;
alter table public.lks_layanan_sasaran enable row level security;
alter table public.lks_layanan_permasalahan enable row level security;
alter table public.lks_layanan_sistem enable row level security;
alter table public.lks_layanan_wilayah enable row level security;
alter table public.lks_pm enable row level security;
alter table public.lks_pm_penerima_manfaat enable row level security;
alter table public.lks_pm_pembinaan enable row level security;
alter table public.lks_pm_bantuan enable row level security;
alter table public.lks_sarpras enable row level security;
alter table public.lks_tanda_daftar enable row level security;
alter table public.wilayah enable row level security;


-- =========================================================
-- GRANTS
-- =========================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete
on all tables in schema public
to authenticated;

grant usage, select
on all sequences in schema public
to authenticated;

grant execute
on function public.set_updated_at()
to authenticated;

grant execute
on function public.set_lks_slug()
to authenticated;

revoke all on function public.set_lks_created_by() from public, anon;
grant execute on function public.set_lks_created_by() to authenticated;

revoke all on function public.validate_lks_tdd_submission() from public, anon;
grant execute on function public.validate_lks_tdd_submission() to authenticated;

revoke all on function public.validate_lks_legalitas_documents() from public, anon;
grant execute on function public.validate_lks_legalitas_documents() to authenticated;

do $$
begin
  execute
    'grant execute on function public.handle_new_user() to service_role';
exception
  when undefined_object then
    null;
end
$$;


-- =========================================================
-- ROLE FUNCTIONS
-- =========================================================

-- Fungsi baru: admin atau LKS.
create or replace function public.is_admin_or_lks()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'lks')
  );
$$;

grant execute
on function public.is_admin_or_lks()
to authenticated;


-- Fungsi lama dipertahankan sementara sebagai kompatibilitas.
-- Ia sekarang memeriksa admin + lks, bukan operator.
create or replace function public.is_admin_or_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'lks')
  );
$$;

grant execute
on function public.is_admin_or_operator()
to authenticated;


create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

grant execute
on function public.is_admin()
to authenticated;


create or replace function public.can_access_lks(target_lks_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'admin'
        or (
          p.role = 'lks'
          and exists (
            select 1
            from public.lks l
            where l.id = target_lks_id
              and l.created_by = p.id
          )
        )
      )
  );
$$;

revoke all on function public.can_access_lks(uuid) from public, anon;
grant execute on function public.can_access_lks(uuid) to authenticated;


create or replace function public.can_access_lks_storage_path(target_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    array_length(string_to_array(target_path, '/'), 1) = 4
    and exists (
      select 1
      from public.profiles p
      join public.lks l on l.id::text = split_part(target_path, '/', 1)
      where p.id = auth.uid()
        and (
          p.role = 'admin'
          or (p.role = 'lks' and l.created_by = p.id)
        )
    ),
    false
  );
$$;

revoke all on function public.can_access_lks_storage_path(text) from public, anon;
grant execute on function public.can_access_lks_storage_path(text) to authenticated;


-- =========================================================
-- PRIVATE DOCUMENT STORAGE
-- =========================================================

insert into storage.buckets (id, name, public)
values ('lks-documents', 'lks-documents', false)
on conflict (id) do update
set public = false;

drop policy if exists lks_documents_storage_select
on storage.objects;

drop policy if exists lks_documents_storage_insert
on storage.objects;

drop policy if exists lks_documents_storage_update
on storage.objects;

drop policy if exists lks_documents_storage_delete
on storage.objects;

create policy lks_documents_storage_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lks-documents'
  and public.can_access_lks_storage_path(name)
);

create policy lks_documents_storage_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lks-documents'
  and public.can_access_lks_storage_path(name)
);

create policy lks_documents_storage_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'lks-documents'
  and public.can_access_lks_storage_path(name)
)
with check (
  bucket_id = 'lks-documents'
  and public.can_access_lks_storage_path(name)
);

create policy lks_documents_storage_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'lks-documents'
  and public.can_access_lks_storage_path(name)
);


-- =========================================================
-- PROFILES POLICIES
-- =========================================================

drop policy if exists profiles_select_own
on public.profiles;

drop policy if exists profiles_admin_all
on public.profiles;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
);

create policy profiles_admin_all
on public.profiles
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


-- =========================================================
-- LKS POLICIES
-- =========================================================

drop policy if exists lks_admin_operator_all
on public.lks;

drop policy if exists lks_admin_lks_all
on public.lks;

drop policy if exists lks_owner_access
on public.lks;

create policy lks_owner_access
on public.lks
for all
to authenticated
using (
  public.is_admin()
  or created_by = auth.uid()
)
with check (
  public.is_admin()
  or created_by = auth.uid()
);


-- =========================================================
-- SNAPSHOT
-- =========================================================

drop policy if exists snapshot_admin_operator_all
on public.lks_registration_snapshot;

drop policy if exists snapshot_admin_lks_all
on public.lks_registration_snapshot;

drop policy if exists snapshot_owner_access
on public.lks_registration_snapshot;

create policy snapshot_owner_access
on public.lks_registration_snapshot
for all
to authenticated
using (
  public.can_access_lks(lks_id)
)
with check (
  public.can_access_lks(lks_id)
);


-- =========================================================
-- DOCUMENTS
-- =========================================================

drop policy if exists documents_admin_operator_all
on public.lks_documents;

drop policy if exists documents_admin_lks_all
on public.lks_documents;

drop policy if exists documents_owner_access
on public.lks_documents;

create policy documents_owner_access
on public.lks_documents
for all
to authenticated
using (
  public.can_access_lks(lks_id)
)
with check (
  public.can_access_lks(lks_id)
  and (
    uploaded_by is null
    or uploaded_by = auth.uid()
    or public.is_admin()
  )
);


-- =========================================================
-- HISTORY
-- =========================================================

drop policy if exists history_admin_operator_all
on public.lks_status_history;

drop policy if exists history_admin_lks_all
on public.lks_status_history;

drop policy if exists history_owner_access
on public.lks_status_history;

create policy history_owner_access
on public.lks_status_history
for all
to authenticated
using (
  public.can_access_lks(lks_id)
)
with check (
  public.can_access_lks(lks_id)
);


-- =========================================================
-- WILAYAH
-- =========================================================

drop policy if exists wilayah_authenticated_select
on public.wilayah;

drop policy if exists wilayah_admin_operator_all
on public.wilayah;

drop policy if exists wilayah_admin_lks_all
on public.wilayah;

drop policy if exists wilayah_admin_write
on public.wilayah;

create policy wilayah_authenticated_select
on public.wilayah
for select
to authenticated
using (true);

create policy wilayah_admin_write
on public.wilayah
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


-- =========================================================
-- REGISTRATION SECTION POLICIES
-- =========================================================

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'lks_legalitas',
    'lks_sdm',
    'lks_layanan',
    'lks_pm',
    'lks_sarpras',
    'lks_tanda_daftar'
  ]
  loop

    execute format(
      'drop policy if exists %I on public.%I',
      table_name || '_admin_operator_all',
      table_name
    );

    execute format(
      'drop policy if exists %I on public.%I',
      table_name || '_admin_lks_all',
      table_name
    );

    execute format(
      'drop policy if exists %I on public.%I',
      table_name || '_owner_access',
      table_name
    );

    execute format(
      'create policy %I on public.%I
       for all
       to authenticated
       using (public.can_access_lks(lks_id))
       with check (public.can_access_lks(lks_id))',
      table_name || '_owner_access',
      table_name
    );

  end loop;

  foreach table_name in array array[
    'lks_layanan_jenis',
    'lks_layanan_sasaran',
    'lks_layanan_permasalahan',
    'lks_layanan_sistem',
    'lks_layanan_wilayah'
  ]
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      table_name || '_admin_operator_all',
      table_name
    );
    execute format(
      'drop policy if exists %I on public.%I',
      table_name || '_admin_lks_all',
      table_name
    );
    execute format(
      'drop policy if exists %I on public.%I',
      table_name || '_owner_access',
      table_name
    );
    execute format(
      'create policy %I on public.%I
       for all to authenticated
       using (exists (
         select 1 from public.lks_layanan parent
         where parent.id = %I.layanan_id
           and public.can_access_lks(parent.lks_id)
       ))
       with check (exists (
         select 1 from public.lks_layanan parent
         where parent.id = %I.layanan_id
           and public.can_access_lks(parent.lks_id)
       ))',
      table_name || '_owner_access',
      table_name,
      table_name,
      table_name
    );
  end loop;

  foreach table_name in array array[
    'lks_pm_penerima_manfaat',
    'lks_pm_pembinaan',
    'lks_pm_bantuan'
  ]
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      table_name || '_admin_operator_all',
      table_name
    );
    execute format(
      'drop policy if exists %I on public.%I',
      table_name || '_admin_lks_all',
      table_name
    );
    execute format(
      'drop policy if exists %I on public.%I',
      table_name || '_owner_access',
      table_name
    );
    execute format(
      'create policy %I on public.%I
       for all to authenticated
       using (exists (
         select 1 from public.lks_pm parent
         where parent.id = %I.pm_id
           and public.can_access_lks(parent.lks_id)
       ))
       with check (exists (
         select 1 from public.lks_pm parent
         where parent.id = %I.pm_id
           and public.can_access_lks(parent.lks_id)
       ))',
      table_name || '_owner_access',
      table_name,
      table_name,
      table_name
    );
  end loop;
end
$$;


-- =========================================================
-- INDEXES
-- =========================================================

create index if not exists idx_lks_slug
on public.lks(slug);

create index if not exists idx_lks_kecamatan
on public.lks(kecamatan);

create index if not exists idx_lks_desa
on public.lks(desa);

create index if not exists idx_lks_workflow_status
on public.lks(workflow_status);

create index if not exists idx_snapshot_lks_section
on public.lks_registration_snapshot(lks_id, section_name);

create index if not exists idx_documents_lks
on public.lks_documents(lks_id);

create index if not exists idx_status_history_lks
on public.lks_status_history(lks_id, created_at desc);

create index if not exists idx_layanan_jenis_layanan
on public.lks_layanan_jenis(layanan_id);

create index if not exists idx_layanan_sasaran_layanan
on public.lks_layanan_sasaran(layanan_id);

create index if not exists idx_layanan_permasalahan_layanan
on public.lks_layanan_permasalahan(layanan_id);

create index if not exists idx_layanan_sistem_layanan
on public.lks_layanan_sistem(layanan_id);

create index if not exists idx_layanan_wilayah_layanan
on public.lks_layanan_wilayah(layanan_id);

create index if not exists idx_pm_penerima_pm
on public.lks_pm_penerima_manfaat(pm_id);

create index if not exists idx_pm_pembinaan_pm
on public.lks_pm_pembinaan(pm_id);

create index if not exists idx_pm_bantuan_pm
on public.lks_pm_bantuan(pm_id);

create index if not exists idx_sarpras_lks
on public.lks_sarpras(lks_id);

create index if not exists idx_tdd_lks
on public.lks_tanda_daftar(lks_id);


-- =========================================================
-- VERIFIKASI PASCA-EKSEKUSI
-- =========================================================

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'lks',
    'lks_registration_snapshot',
    'lks_legalitas',
    'lks_sdm',
    'lks_layanan',
    'lks_pm',
    'lks_sarpras',
    'lks_tanda_daftar'
  )
order by table_name;