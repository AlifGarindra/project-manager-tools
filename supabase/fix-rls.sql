-- ============================================================================
-- Fix: create ticket gagal diam-diam (RLS / CHECK constraint)
-- Jalankan SELURUH file ini sekali di Supabase Dashboard → SQL Editor.
-- Idempotent: aman dijalankan berulang kali.
--
-- Model akses produk: semua user adalah PM dan boleh manage semua project,
-- jadi semua tabel dapat policy permisif untuk role `authenticated`.
-- ============================================================================

-- ── 1. RLS: enable + policy untuk semua tabel aplikasi ──────────────────────

alter table public.projects           enable row level security;
alter table public.environments       enable row level security;
alter table public.modules            enable row level security;
alter table public.tickets            enable row level security;
alter table public.ticket_modules     enable row level security;
alter table public.deployment_entries enable row level security;

drop policy if exists "authenticated_all" on public.projects;
create policy "authenticated_all" on public.projects
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all" on public.environments;
create policy "authenticated_all" on public.environments
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all" on public.modules;
create policy "authenticated_all" on public.modules
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all" on public.tickets;
create policy "authenticated_all" on public.tickets
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all" on public.ticket_modules;
create policy "authenticated_all" on public.ticket_modules
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all" on public.deployment_entries;
create policy "authenticated_all" on public.deployment_entries
  for all to authenticated using (true) with check (true);

-- ── 2. CHECK constraints: samakan dengan enum TypeScript (src/types.ts) ─────
-- Drop semua check constraint lama di kolom status/priority (apapun namanya),
-- lalu buat ulang dengan nilai hyphen yang dipakai aplikasi ('in-progress').

do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_attribute att
      on att.attrelid = con.conrelid
     and att.attnum   = any(con.conkey)
    where con.conrelid = 'public.tickets'::regclass
      and con.contype  = 'c'
      and att.attname in ('status', 'priority')
  loop
    execute format('alter table public.tickets drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.tickets add constraint tickets_status_check
  check (status in ('planned', 'in-progress', 'blocked', 'done', 'cancelled'));

alter table public.tickets add constraint tickets_priority_check
  check (priority in ('critical', 'high', 'medium', 'low'));

-- ── 3. Verifikasi (hasilnya harus menampilkan 6 tabel ber-policy) ───────────

select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('projects','environments','modules','tickets','ticket_modules','deployment_entries')
order by tablename;
