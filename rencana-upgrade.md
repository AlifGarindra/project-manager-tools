# Rencana Upgrade — Deployment Conflict Manager

Daftar kekurangan produk dari sudut pandang Project Manager yang memakai app ini
sehari-hari, beserta status pengerjaannya.

Dibuat: 2026-07-28 · Terakhir diperbarui: 2026-07-28

**Ringkasan penilaian:** inti produk sudah kuat — deteksi konflik per-environment,
timeline drag & drop, resolusi hasil diskusi; itu bagian tersulit dan sudah jadi.
Yang kurang adalah lapisan di sekelilingnya: app ini baru bisa **menampilkan**
konflik ke orang yang sedang membukanya, padahal pekerjaan PM sesungguhnya adalah
**tahu lebih dulu, menelusuri kenapa, dan mengomunikasikan ke orang lain**.

| # | Item | Status |
| --- | --- | --- |
| 1 | Notifikasi konflik baru | ⬜ Belum |
| 2 | Search & filter tiket | ✅ Selesai |
| 3 | Assignee terstruktur | 🟡 Sebagian |
| 4 | Audit trail | ⬜ Belum |
| 5 | Kolaborasi multi-PM (realtime / anti-timpa) | ⬜ Belum |
| 6 | Export & berbagi jadwal keluar | ⬜ Belum |
| 7 | Freeze window / blackout period | ⬜ Belum |
| 8 | Lifecycle project (archive + delete) | ✅ Selesai |
| 9 | Granularitas waktu (jam, bukan hanya tanggal) | ⬜ Belum |
| 10 | Semantik resolusi konflik (stale resolution) | ⬜ Belum |
| E1 | Unit test conflict engine | ⬜ Belum |
| E2 | CI | ⬜ Belum |
| E3 | Dead code `pages/Login.tsx` | ⬜ Belum |
| E4 | `minWidth: 1024` — tidak bisa dibuka dari HP | ⬜ Belum |
| E5 | Single-tenant (semua user lihat semua data) | ⬜ Belum — batasan yang disadari |

---

## ✅ 2. Search & filter tiket — SELESAI

**Masalah:** tidak ada satu pun input pencarian atau kontrol filter di Timeline,
Board, maupun Dashboard. Dengan 10 tiket masih nyaman; dengan 60 tiket lintas 3
arsitektur, timeline jadi tidak terbaca.

**Yang dikerjakan:**
- `src/lib/ticketFilters.ts` (baru) — `filterTickets()`, `EMPTY_FILTERS`,
  `countActiveFilters()`. Logika filter murni, terpisah dari komponen.
- `src/components/ui/FilterBar.tsx` (baru) — bar filter di bawah toolbar
  Timeline & Board: search + multi-select **Type / Status / Module / Assignee**,
  penghitung "x of y tickets", tombol Clear filters.
- Search mencocokkan judul, deskripsi, assignee, dan **nama modul**.
- State filter di `appStore` (sesuai konvensi: Zustand khusus UI state),
  otomatis reset saat pindah project karena modul & assignee scoped per project.

**Keputusan desain penting:** filter hanya mempersempit **apa yang digambar**
(marker, connector, card, hitungan per-env). **Konflik & zona merah/kuning tetap
dihitung dari SEMUA tiket project** — filter tidak boleh bisa menyembunyikan
konflik hard. Konsekuensinya kadang ada zona merah tanpa marker di dalamnya
(markernya sedang terfilter). Kalau mau zona ikut terfilter, itu perubahan satu
baris di `TimelineView`.

## ✅ 8. Lifecycle project (archive + delete) — SELESAI

**Masalah:** ada create & update project, tapi tidak ada archive/delete. Project
selesai menumpuk selamanya di dashboard, dan query `['tickets']` yang mem-fetch
semua tiket global ikut membengkak.

**Yang dikerjakan:**
- `supabase/add-project-archive.sql` (baru) — kolom `projects.archived`.
- **Archive/Unarchive** via menu ⋯ di kartu project. Project arsip pindah ke
  seksi "Archived (n)" yang terlipat, tampil redup dengan badge. Rekap header
  dashboard hanya menghitung project aktif.
- **Delete permanen** dengan modal konfirmasi: menyebut apa saja yang ikut
  terhapus (jumlah tiket/modul/env), menyarankan Archive sebagai alternatif, dan
  mewajibkan **mengetik nama project** sebelum tombol merah aktif.
- `deleteProjectById()` di `lib/db.ts` menghapus berurutan
  conflict_resolutions → tickets → modules → environments → project, melempar
  error di tiap langkah — **tidak bergantung pada `ON DELETE CASCADE`** karena
  konfigurasi FK di DB tidak diverifikasi.
- `useDeleteProject()` di `hooks/useProjects.ts`: optimistic + rollback +
  invalidate `['projects']`, `['tickets']`, `['conflict_resolutions']`.

> ⚠ **Langkah wajib:** jalankan `supabase/add-project-archive.sql` sekali di
> Supabase Dashboard → SQL Editor. Tanpa itu `fetchProjects` error karena
> men-select kolom `archived`.

**Sisa yang sengaja dibiarkan:** tiket di project arsip masih ikut dihitung
conflict engine kalau project-nya dibuka langsung. Arsip hanya menyembunyikan
dari rekap dashboard. Kalau mau dikecualikan total, filter tiket sebelum
`detectConflicts`.

## 🟡 3. Assignee terstruktur — SEBAGIAN

**Masalah:** assignee cuma string bebas. "Budi", "budi", dan "B. Santoso" adalah
tiga orang berbeda bagi sistem. Akibatnya tidak mungkin ada view beban kerja per
orang ("minggu ini siapa deploy apa") — padahal itu pertanyaan yang paling sering
sampai ke PM.

**Sudah dikerjakan (bareng poin 2):** autocomplete `<datalist>` di field Assignee
`TicketModal`, berisi semua nama yang pernah dipakai. Mengurangi variasi ejaan
tanpa perlu migrasi DB.

**Belum:** tabel `members` (atau relasi ke `auth.users`), `tickets.assignee_id`,
migrasi data string → id, dan view beban kerja per orang.

---

## ⬜ Belum dikerjakan

### 1. Notifikasi konflik baru
Konflik hanya ketahuan kalau kebetulan membuka app. Skenario nyata: PM lain
menggeser deployment, tiket saya jadi bentrok, saya baru tahu besok. Butuh
minimal notifikasi email/Slack saat **konflik hard baru muncul** atau saat
resolusi yang sudah disepakati jadi tidak relevan lagi.
Ini yang mengubah alat dari pasif jadi proaktif — nilai jual utamanya.

### 4. Audit trail
Semua PM boleh mengubah semua data (RLS permisif), tapi tidak ada catatan siapa
mengubah apa dan kapan. Saat jadwal bergeser dan terjadi konflik, pertanyaan
pertama di meeting adalah "siapa yang geser dan kenapa" — sistem tidak bisa
menjawabnya. Kolom `created_by` ada, tapi tidak ada `updated_by`/history.
Usulan: kolom `updated_by` + tabel history per tiket.

### 5. Kolaborasi multi-PM
Tidak ada Supabase realtime subscription maupun pengecekan versi. Dua PM yang
mengedit tiket yang sama akan **last-write-wins tanpa peringatan**, dan perubahan
orang lain baru terlihat setelah refetch.
Usulan: realtime subscription pada `tickets` + kolom versi/`updated_at` check.

### 6. Export & berbagi jadwal keluar
Deliverable PM ke stakeholder biasanya kalender deployment. Export CSV/ICS atau
sekadar view read-only yang bisa dibagikan belum ada. Integrasi JIRA juga baru
berupa link manual satu arah; sinkronisasi status saja sudah sangat membantu.

### 7. Freeze window / blackout period
Konflik di dunia nyata bukan hanya antar tiket — ada periode terlarang deploy
(tutup buku, hari besar, freeze release). Konsep **blackout range per
environment** yang otomatis memicu konflik akan sangat berguna dan cocok dengan
`DeploymentRange` yang sudah ada di `lib/conflict.ts`.

### 9. Granularitas waktu
Deployment sering diatur per jam ("mobile jam 10, backend jam 14 di hari yang
sama"). Sekarang dua deploy di hari yang sama otomatis **hard conflict** — bisa
jadi false positive yang lama-lama membuat PM mengabaikan badge merah.

### 10. Semantik resolusi konflik
Resolusi tersimpan per **pasangan tiket**, bukan per situasi konflik. Kalau tiket
digeser dan bentrok lagi di window/environment yang sama sekali berbeda, tanda
hijau ✓ dari kesepakatan lama tetap muncul — padahal kesepakatan itu untuk
kondisi yang sudah tidak ada. Minimal: simpan snapshot window saat disepakati,
tandai **stale** jika konfliknya berubah.

### E1–E5. Engineering
- **E1 Unit test conflict engine.** `lib/conflict.ts` adalah pure function —
  core business logic paling kritis sekaligus paling mudah di-unit-test, tapi
  belum ada satu pun test. Setiap perubahan aturan konflik sekarang hanya
  diverifikasi manual. **Ini yang paling layak dikerjakan sebelum menambah fitur
  apa pun.**
- **E2 CI.** Hanya ada script `build`/`type-check` lokal.
- **E3** `src/pages/Login.tsx` lama masih ada sebagai dead code.
- **E4** `minWidth: 1024` hard-coded di `App.tsx` — tidak bisa dicek dari HP,
  padahal PM justru sering butuh melihat jadwal saat tidak di depan laptop.
- **E5** Satu instance = satu "perusahaan": siapa pun yang berhasil register
  melihat & bisa mengubah semua data. Aman selama internal, tapi perlu disadari
  sebagai batasan sebelum dipakai lebih luas.

---

## Urutan pengerjaan yang disarankan

1. ~~Search & filter~~ ✅ (poin 2 — dampak harian terbesar, effort kecil)
2. ~~Lifecycle project~~ ✅ (poin 8)
3. **Unit test conflict engine** (E1) — pengaman sebelum menyentuh aturan konflik
4. **Notifikasi konflik baru** (poin 1) — nilai jual utama produk
5. **Audit trail** (poin 4) — `updated_by` + history per tiket
6. **Freeze window** (poin 7) & **export kalender** (poin 6)
7. Assignee terstruktur penuh (poin 3), realtime (poin 5), granularitas jam
   (poin 9), stale resolution (poin 10)

---

## Catatan environment

Shell default memuat **Node v14.5.0** dari nvm — terlalu tua untuk Vite. Build
diverifikasi memakai Node v22.21.1 yang sudah terpasang di nvm. Node tersebut
build x64 (Rosetta) sementara `node_modules` berisi binary rollup arm64, jadi
`@rollup/rollup-darwin-x64` dipasang dengan `--no-save`.
Disarankan: `nvm alias default 22`.

Verifikasi build: `npx tsc --noEmit` dan `npx vite build`.
