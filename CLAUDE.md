# Deployment Conflict Manager — CLAUDE.md

## Product Overview
Web app untuk Project Manager melacak deployment tickets dan mendeteksi konflik
berdasarkan irisan modul + overlap deployment range + environment + arsitektur.
Semua user adalah PM, bisa akses dan manage semua project (tidak ada role lain).

Riwayat perubahan detail: lihat `updatelog.md`.

---

## Core Business Rules

### Conflict Detection
Conflict engine bekerja berdasarkan **deployment ranges per environment**, bukan
sekedar tanggal start/end tiket.

Tiap tiket di-expand jadi `DeploymentRange[]` (`getDeploymentRanges`):
- Belum ada deployments → satu range `[startDate, endDate ?? FAR_FUTURE]` di `environmentId`
- Ada deployments (terurut tanggal) → tiap entry jadi range `[dep.date, nextDep.date]`,
  entry terakhir `[dep.date, ticket.endDate ?? dep.date]`

Dua tiket dibandingkan HANYA jika:
1. `projectId` sama
2. **`ticketType` sama** — beda arsitektur (backend vs mobile vs frontend-web)
   TIDAK PERNAH conflict meskipun modul sama dan tanggal overlap
3. Minimal 1 modul yang sama

Lalu untuk tiap kombinasi range mereka:
- Range overlap: `rA.startDate <= rB.endDate AND rB.startDate <= rA.endDate`
- Same environment → **HARD** (badge merah ⚡) · Beda environment → **SOFT** (kuning ◎)

Tiket `done`/`cancelled` tidak ikut conflict-check.

### Dua bentuk output conflict engine (keduanya di `lib/conflict.ts`)
- **`detectConflicts(tickets): ConflictPair[]`** — SATU ringkasan per pasangan
  tiket (worst: hard > soft). Dipakai untuk badge, panel, counter.
- **`getConflictZones(tickets): ConflictZone[]`** — SEMUA jendela overlap,
  per environment. Dipakai untuk overlay timeline: hard → zona di env tempat
  bentrok; soft → zona di kedua env yang terlibat. Jangan gambar overlay dari
  `ConflictPair` — window-nya cuma satu dan tidak per-env.

### Conflict Resolution (kesepakatan hasil diskusi)
Konflik bisa ditandai "sudah didiskusikan" — link notulen + catatan cara resolve,
tersimpan di tabel `conflict_resolutions` per pasangan tiket (`ticket_a < ticket_b`,
unique). Konflik yang ada resolusinya TETAP dihitung konflik (hanya diberi
penanda hijau ✓). Helper: `sortedPair()`, `findResolution()` di `lib/conflict.ts`;
UI: `ResolutionEditor` (dipakai di ConflictPanel dan TicketModal).

### `endDate` derivation
`endDate` = tanggal deployment ke **env teratas (order 0, biasanya production)**;
`null` jika belum sampai sana. Tanpa deployment → pakai `endDate` asli.
- Semua path SAVE wajib `withDerivedEndDate(ticket, topEnvId)` (`lib/utils.ts`)
- Path FETCH (`db.ts:toTicket`) TIDAK men-derive ulang — nilai DB adalah hasil
  derive saat save; men-derive tanpa `topEnvId` menghasilkan aturan berbeda

### Saran tanggal bebas konflik
`findNearestFreeDate(others, draft)` — geser startDate per hari (maju
diprioritaskan, tanggal lampau dilewati, durasi dipertahankan, max 90 hari)
sampai `detectConflicts` bersih. Hanya untuk tiket tanpa deployment history.

---

## Tech Stack

- React 18 + Vite + TypeScript
- **react-router-dom** — `/` Landing, `/login`, `/register`, `/app` (AuthGuard)
- **@tanstack/react-query** — SEMUA data server (fetch/mutation, optimistic
  update + rollback + invalidate). Data TIDAK disimpan di Zustand.
- **Zustand v5** — `appStore` (murni UI state) + `authStore` (Supabase Auth)
- **Supabase** — Auth (email/password, confirm email aktif) + **PostgreSQL + RLS
  (LIVE, bukan mock)**. Mock data sudah dihapus.
- **date-fns v4** — semua operasi tanggal; parsing `YYYY-MM-DD` WAJIB `parseISO`
  (via helper `lib/utils.ts`), JANGAN `new Date('YYYY-MM-DD')` (bug timezone)
- Inline styles dengan token `C` dari `src/components/ui/tokens.ts`
- Supabase MCP tersedia untuk migration/query (`mcp__supabase__*`)

### Setup
`.env.local`: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
Verifikasi: `npx tsc --noEmit` dan `npx vite build`.

---

## Database (Supabase, schema live)

| Tabel | Isi penting |
| --- | --- |
| `projects` | name, description, created_by, **archived** (arsip = disembunyikan dari dashboard; delete project = hapus berurutan anak→induk di `deleteProjectById`, tanpa andalkan cascade) |
| `environments` | project_id, name, color, **sort_order** (0 = teratas/production) |
| `modules` | project_id, name, category |
| `tickets` | start_date, end_date, environment_id (env RUMAH), status, priority, **ticket_type**, **sow_link**, **jira_link**, created_by |
| `ticket_modules` | (ticket_id, module_id) — sync delete-all→insert saat save |
| `deployment_entries` | ticket_id, environment_id, date — id stabil dari client |
| `conflict_resolutions` | ticket_a < ticket_b (unique), link, note |

- RLS aktif semua tabel; policy permisif `for all to authenticated`
  (semua PM manage semua data). Helper SQL: `supabase/fix-rls.sql`.
- CHECK: `status in ('planned','in-progress','blocked','done','cancelled')`
  (hyphen!), `priority`, `ticket_type in ('backend','mobile','frontend-web')`.
- Schema berubah → pakai `mcp__supabase__apply_migration` + update `DbTicket`/
  transformer di `lib/db.ts` + `types.ts`.

---

## TypeScript Types (src/types.ts)

```typescript
type TicketStatus   = 'planned' | 'in-progress' | 'blocked' | 'done' | 'cancelled'
type TicketPriority = 'critical' | 'high' | 'medium' | 'low'
type TicketType     = 'backend' | 'mobile' | 'frontend-web'
type ConflictType   = 'hard' | 'soft'

interface Ticket {
  id: string; projectId: string
  title: string; description: string
  startDate: string               // YYYY-MM-DD
  endDate: string | null          // derived — lihat aturan endDate
  environmentId: string           // env RUMAH (selalu env terbawah saat create)
  status: TicketStatus
  assignee: string
  modules: string[]               // module IDs
  priority: TicketPriority
  ticketType: TicketType          // beda type = tidak pernah conflict
  sowLink: string                 // '' = kosong
  jiraLink: string
  deployments: DeploymentEntry[]  // riwayat deploy per env
}

interface ConflictPair { id, ticket1Id, ticket2Id, modules, type, projectId, overlapStart, overlapEnd }
interface ConflictResolution { id, projectId, ticketA, ticketB, link, note, createdAt }
// ConflictZone (di lib/conflict.ts): { id, projectId, environmentId, type, startDate, endDate }
```

---

## Folder Structure

```
src/
├── main.tsx                     # QueryClientProvider + BrowserRouter + routes
├── App.tsx                      # shell /app: nav + view router + modals
├── types.ts
├── pages/                       # LandingPage, LoginPage, RegisterPage (+ Login.tsx lama)
├── components/
│   ├── AuthGuard.tsx            # loading spinner / redirect /login / children
│   ├── timeline/TimelineView.tsx   # marker view + drag + connectors + zones
│   ├── board/BoardView.tsx         # kanban HTML5 DnD
│   ├── conflicts/
│   │   ├── ConflictPanel.tsx       # side panel daftar konflik
│   │   └── ResolutionEditor.tsx    # form kesepakatan (dipakai panel + modal)
│   ├── tickets/TicketModal.tsx     # create/edit/view + conflict preview + saran tanggal
│   ├── project/                    # DashboardView, ModuleRegistryModal, EnvManagerModal
│   └── ui/                         # tokens, Badge, Btn, FormControls, dll.
├── hooks/
│   ├── useProjects.ts / useTickets.ts / useConflictResolutions.ts   # React Query
│   └── useConflicts.ts          # useConflicts, useConflictZones, useDraftConflicts
├── stores/
│   ├── appStore.ts              # UI ONLY: view, selectedProjectId, modal/panel state
│   └── authStore.ts             # user, session, signIn/Up/Out, init
└── lib/
    ├── conflict.ts              # SEMUA conflict logic (pure functions)
    ├── db.ts                    # SEMUA akses Supabase DB + transformer
    ├── supabase.ts              # createClient (null-safe bila env kosong)
    └── utils.ts                 # date helpers (parseISO-based), generateId, deriveEndDate
```

---

## Data Flow

- Query keys: `['projects']`, `['tickets']`, `['conflict_resolutions']`
- Mutation: optimistic update di `onMutate`, rollback di `onError`,
  `invalidateQueries` di `onSettled`
- `upsertTicket` menyimpan tiket lalu sync `ticket_modules` dan
  `deployment_entries` dengan pola delete-all→insert (id entry stabil).
  SEMUA error termasuk delete WAJIB di-throw — jangan telan error.
- Error mutation harus tampil di UI (pola: box merah + tombol disabled/pending,
  lihat TicketModal footer & DashboardView)

---

## Timeline View (TimelineView.tsx)

Deployment marker view: kolom = hari, row = environment (sort by `order`, 0 di atas).

**Markers (`MarkerBox`):**
- `isPlanned` (dashed ◌) = marker di env RUMAH yang belum punya deployment,
  posisinya `startDate`. Actual (solid ●) = satu marker per deployment entry.
- Marker SELALU warna environment — konflik TIDAK mengubah warna marker;
  indikatornya zona overlay merah/kuning per env (`useConflictZones`).
- Multiple tiket di hari+env sama → digabung satu marker ber-badge count.

**Drag semantics (PENTING, sering jadi sumber bug):**
- Branch drop berdasarkan **`group.isPlanned`** — BUKAN `deployments.length`
  (tiket bisa punya deployment di env lain sementara marker rumahnya planned):
  - planned + horizontal → geser `startDate`
  - planned/actual + vertikal → tambah/update deployment di env target
    (JANGAN duplikat entry untuk env yang sama — update jika sudah ada)
  - actual + horizontal → update tanggal deployment entry tsb
- Geometri drag diukur dari **`rowsRef`** (kontainer rows), bukan offset
  scrollContainer + konstanta header — jangan kembalikan ke asumsi HDR_H.
- Drop tanpa pergeseran = klik (tidak ada save). Setelah drag, satu click
  di-suppress via `didDragRef`/`dragEndRef` (mencegah modal nyasar).
- Marker multi-tiket: tidak bisa di-drag langsung; klik → popup; TIAP BARIS
  popup draggable dengan threshold 5px (tekan+geser = drag tiket itu,
  tekan-lepas = buka detail). `userSelect: none` di popup.

**DeploymentConnectors:** garis bezier mengikuti **tangga environment**
(env terbawah → teratas via `env.order`, TANPA hardcode nama env; satu titik
per env = deployment terbaru, atau titik planned utk env rumah). BUKAN urutan
tanggal — tanggal hanya menentukan posisi horizontal.

**⚠ Hook order:** semua hook di `MarkerBox` harus dipanggil SEBELUM
early-return visibilitas (`xOff` di luar window) — memindahkan return itu ke
atas menyebabkan crash "Rendered fewer hooks" saat Prev/Next.

**Constants:** `LEFT_W=148, ROW_H=100, HDR_H=52, DEFAULT_DW=80, TOTAL_DAYS=35`,
zoom 80–180 px/day.

---

## TicketModal

- Create: `environmentId` DIPAKSA env terbawah, `endDate` null (abaikan defaults).
- Field: env/status/priority · **ticketType/sowLink/jiraLink** · dates/assignee ·
  description · modules · konflik.
- **Preview konflik live** saat edit/create (`useDraftConflicts` — draft
  menggantikan versi tersimpan) + **saran tanggal** (`findNearestFreeDate`)
  dengan tombol "Pakai tanggal ini".
- View mode: Active Conflicts + `ResolutionEditor` per konflik.
  (Saat create, resolusi read-only — tiket belum ada di DB, FK akan gagal.)
- Save: `withDerivedEndDate(form, topEnvId)`; error tampil di footer;
  Cancel membuang perubahan (reset form dari `existing`).

## Board View
Kanban 5 kolom by status, HTML5 DnD. Drop → `saveTicket({...t, status})`.

---

## Conventions

- **Tanggal:** string `YYYY-MM-DD`; manipulasi HANYA via helper `lib/utils.ts`
  (berbasis `parseISO`). `new Date()` dilarang di luar `lib/utils.ts`
  (kecuali timestamp `new Date().toISOString()` di db.ts).
- **Conflict logic HANYA di `lib/conflict.ts` + `hooks/useConflicts.ts`.**
- **Akses DB HANYA di `lib/db.ts`** (komponen lewat hooks React Query).
- Status enum pakai **hyphen** (`in-progress`) — konsisten sampai CHECK
  constraint di DB.
- Tidak ada TypeScript `any`.
- Inline styles + token `C`; teks UI campuran EN/ID mengikuti yang sudah ada.
- `generateId()` = `crypto.randomUUID()` (kolom DB bertipe uuid).
- Mutation baru wajib: optimistic update, rollback, invalidate, dan error
  yang terlihat user.
