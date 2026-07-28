-- ============================================================================
-- Migration: kolom archived di projects (fitur archive/unarchive project)
-- Jalankan sekali di Supabase Dashboard → SQL Editor.
-- Idempotent: aman dijalankan berulang kali.
--
-- Catatan: delete project TIDAK butuh perubahan schema — aplikasi menghapus
-- anak-anaknya secara berurutan (tickets → modules → environments → project)
-- di lib/db.ts:deleteProjectById, tanpa bergantung pada ON DELETE CASCADE.
-- ============================================================================

alter table public.projects
  add column if not exists archived boolean not null default false;

-- Verifikasi
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'projects'
order by ordinal_position;
