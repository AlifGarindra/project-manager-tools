# Update Log

Catatan perubahan yang **belum tercermin di CLAUDE.md**. CLAUDE.md masih
mendeskripsikan versi mock-data dengan satu Zustand store — banyak yang sudah
berubah sejak itu.

Terakhir diperbarui: 2026-07-05

---

## 1. Arsitektur & Data Layer (perubahan terbesar vs CLAUDE.md)

- **Data sudah pindah dari mock ke Supabase DB.** `src/lib/data.ts`
  (INIT_PROJECTS/INIT_TICKETS) sudah **dihapus** — CLAUDE.md masih menyebutnya.
- **`appStore` tidak lagi menyimpan `projects`/`tickets`** — sekarang murni UI
  state (navigasi, modal, panel). Data di-fetch via **React Query**:
  - `src/lib/db.ts` — semua akses Supabase (fetch/upsert/delete + transformer
    snake_case ↔ camelCase)
  - `src/hooks/useProjects.ts`, `useTickets.ts`, `useConflictResolutions.ts` —
    query + mutation dengan optimistic update & rollback
- **Routing pakai react-router**: `/` (LandingPage), `/login`, `/register`,
  `/app` (dibungkus `AuthGuard`). CLAUDE.md masih mendeskripsikan auth guard
  sederhana di App.tsx tanpa router.
- Halaman baru: `src/pages/LandingPage.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`,
  `src/components/AuthGuard.tsx`.

## 2. Skema Database (Supabase, sudah live via migration MCP)

- Tabel: `projects`, `environments`, `modules`, `tickets`, `ticket_modules`,
  `deployment_entries`, `conflict_resolutions` — semua RLS aktif dengan policy
  permisif untuk role `authenticated` (semua PM boleh manage semua data).
- Migration `add_ticket_type_and_links`: kolom `tickets.ticket_type`
  (default `'backend'`, CHECK `backend|mobile|frontend-web`), `sow_link`,
  `jira_link`.
- Migration `add_conflict_resolutions`: tabel kesepakatan konflik per pasangan
  tiket (`ticket_a < ticket_b`, unique per pasangan, cascade delete).
- CHECK constraint `tickets_status_check` & `tickets_priority_check` sesuai enum
  TypeScript (status pakai hyphen: `in-progress`).
- Helper SQL manual tersedia di `supabase/fix-rls.sql`.

## 3. Fitur Baru

### Tiket
- **Jenis tiket / arsitektur** (`ticketType`): Backend / Mobile / Frontend Web.
- **Link SOW** dan **link tiket JIRA** — input URL di form, link klik-able di
  view mode.
- Tiket baru selalu dibuat di **env paling bawah** (order terbesar), `endDate`
  null sampai deploy ke env teratas.

### Conflict engine (`src/lib/conflict.ts`)
- **Aturan baru:** dua tiket dengan `ticketType` berbeda **tidak pernah**
  conflict meskipun modul sama & tanggal overlap.
- **`getConflictZones()`** — zona overlap per-environment untuk overlay
  timeline (menggantikan penggambaran dari `ConflictPair` yang hanya punya satu
  window per pasangan). Hard = zona di env tempat bentrok; soft = zona di kedua
  env yang terlibat.
- **`findNearestFreeDate()`** — cari tanggal start bebas konflik terdekat
  (maju diprioritaskan, tanggal lampau dilewati, durasi dipertahankan).
- `sortedPair()` / `findResolution()` — helper pasangan tiket terurut.

### Preview konflik & saran tanggal (TicketModal)
- Saat mengisi/mengedit form, section **"⚠ Konflik Terdeteksi (belum
  disimpan)"** muncul live via `useDraftConflicts` — sebelum tiket disimpan.
- Box saran **"Slot bebas konflik terdekat: <tanggal>"** + tombol
  **"Pakai tanggal ini"**.

### Resolusi konflik (kesepakatan hasil diskusi)
- Konflik bisa ditandai **"✓ Sudah didiskusikan"** dengan link notulen +
  catatan cara resolve. Tersimpan di tabel `conflict_resolutions`.
- Editor (`src/components/conflicts/ResolutionEditor.tsx`) tersedia di **panel
  Conflicts** dan di **detail tiket** (section Active Conflicts) — tambah,
  edit, hapus, tersinkron dua arah.
- Konflik yang sudah didiskusikan tetap dihitung; hanya diberi penanda hijau.
  Kesepakatan otomatis muncul lagi jika pasangan tiket yang sama bentrok lagi.

## 4. Perubahan Perilaku / Business Rules

- **Derivasi `endDate` berubah** (CLAUDE.md usang): sekarang `endDate` =
  tanggal deploy ke **env teratas (order 0 / production)**; null jika belum
  sampai sana. Semua path save memanggil `withDerivedEndDate(ticket, topEnvId)`.
  Fetch **tidak** men-derive ulang (nilai DB adalah hasil derive saat save).
- Drag lintas env **menjaga home env + startDate** tiket; hanya menambah/
  meng-update entry `deployment_entries` di env target (tidak pernah duplikat
  entry untuk env yang sama).

## 5. Perbaikan Bug

### Crash & data
- **Blank screen saat Prev/Next berkali-kali** — early return di `MarkerBox`
  sebelum `useEffect` mengubah jumlah hook antar render ("Rendered fewer
  hooks"). Pengecekan visibilitas dipindah ke setelah semua hook.
- **Timezone off-by-one** — semua parsing `YYYY-MM-DD` pakai `parseISO`
  (bukan `new Date()` yang parse sebagai UTC midnight).
- **`endDate` berubah-ubah antara save vs refetch** — `toTicket` tidak lagi
  men-derive ulang dengan aturan fallback yang berbeda.
- **Error save ditelan** — `upsertTicket` kini mengecek error `delete`
  `ticket_modules`/`deployment_entries`; TicketModal menampilkan box merah
  "Failed to save: …", tombol Saving…/disabled, hint "Title is required".
- **`order` environment duplikat** — EnvManagerModal me-reindex `order = index`
  saat save (order menentukan env production/topEnvId).
- **Cancel edit tiket** kini membuang perubahan yang belum disimpan.

### Drag & drop timeline
- **Marker planned tidak bisa digeser horizontal** jika tiketnya sudah punya
  deployment di env lain — branch drop kini pakai `group.isPlanned`, bukan
  `deployments.length === 0`.
- **Geometri drag** diukur dari kontainer rows (`rowsRef`), bukan
  `scrollRect.top + HDR_H` — tidak ada lagi asumsi tinggi header/toolbar.
- **Klik marker tidak lagi memicu save diam-diam**; klik setelah drag tidak
  membuka modal tiket / modal create (guard `didDragRef` + `dragEndRef`).

### Grafik timeline
- **Marker tidak berubah warna saat konflik** — selalu warna environment;
  indikator konflik hanya dari zona merah/kuning di rentang tanggal overlap.
- **Zona konflik per environment & per window** — dev bentrok tgl 6–7 hanya
  merah di row dev, staging bentrok 8–9 hanya di row staging (sebelumnya satu
  window digambar di semua row dan window lain hilang).
- **Garis konektor mengikuti tangga environment** (env bawah → env di atasnya,
  berdasar `env.order`, tanpa hardcode nama env) — bukan urutan tanggal, jadi
  tidak ada lagi garis yang menyelam balik atau melompati env.

### UX marker bertumpuk (multiple tiket, env+tanggal sama)
- Marker gabungan tidak bisa di-drag langsung (ambigu); klik → popup daftar.
- **Seluruh baris tiket di popup bisa ditarik** (threshold 5px: tekan+geser =
  drag tiket itu, tekan-lepas = buka detail). Text selection dimatikan.
- Ghost drag menampilkan judul tiket yang sedang ditarik.

## 6. File Baru / Dihapus / Diubah Signifikan

| Status | File |
| --- | --- |
| Baru | `src/hooks/useConflictResolutions.ts` |
| Baru | `src/components/conflicts/ResolutionEditor.tsx` |
| Baru | `supabase/fix-rls.sql` |
| Baru | `updatelog.md` (file ini) |
| Dihapus | `src/lib/data.ts` (mock data, tidak dipakai) |
| Diubah besar | `src/lib/conflict.ts`, `src/lib/db.ts`, `src/lib/utils.ts`, `src/types.ts` |
| Diubah besar | `src/components/timeline/TimelineView.tsx`, `src/components/tickets/TicketModal.tsx`, `src/components/conflicts/ConflictPanel.tsx` |

> **TODO:** CLAUDE.md perlu ditulis ulang agar mencerminkan arsitektur saat ini
> (React Query + Supabase DB, router, ticket type, conflict zones, resolutions).
