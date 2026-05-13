# Deployment Conflict Manager — claude.md

## Product Overview
Web app untuk Project Manager melacak deployment tickets dan mendeteksi
konflik berdasarkan irisan modul + overlap tanggal + environment.
Semua user adalah PM, bisa akses dan manage semua project.

---

## Core Business Rules

### Conflict Detection
Dua tiket dinyatakan CONFLICT jika memenuhi SEMUA kondisi berikut:
1. Minimal 1 modul yang sama (irisan module_ids tidak kosong)
2. Tanggal overlap: start_A <= end_B AND start_B <= end_A
3. Environment sama → HARD CONFLICT
   Environment beda → SOFT WARNING

Tiket tanpa end_date = ongoing, TIDAK di-conflict-check.
Tiket dengan status "done" atau "cancelled" TIDAK ikut conflict-check.

### Conflict Types
- HARD CONFLICT → same environment + same module + date overlap → badge merah
- SOFT WARNING  → different environment + same module + date overlap → badge kuning
- SAFE          → tidak ada irisan → tidak ada badge

---

## Tech Stack

Frontend:
- React 18 + Vite
- TailwindCSS v3
- TanStack Query v5       # server state, caching, optimistic updates
- Zustand v4              # client state (active view, filters)
- @dnd-kit/core + sortable # drag and drop tiket di timeline & board
- date-fns v3             # semua operasi tanggal
- Framer Motion           # animasi transisi, drag preview

Backend:
- Supabase
  - PostgreSQL            # primary database
  - Realtime              # subscribe perubahan tiket antar PM
  - Auth                  # email/password
  - RLS                   # hanya authenticated user yang bisa akses

---

## Database Schema

### projects
| column      | type      | notes            |
|-------------|-----------|------------------|
| id          | uuid PK   |                  |
| name        | text      |                  |
| description | text      | nullable         |
| created_by  | uuid FK   | → auth.users     |
| created_at  | timestamp |                  |

### modules
| column     | type    | notes                        |
|------------|---------|------------------------------|
| id         | uuid PK |                              |
| project_id | uuid FK |                              |
| name       | text    | e.g. "Sales Order"           |
| category   | text    | nullable, e.g. "Finance"     |
| color      | text    | hex color untuk visual di UI |

### environments
| column     | type    | notes                     |
|------------|---------|---------------------------|
| id         | uuid PK |                           |
| project_id | uuid FK |                           |
| name       | text    | e.g. "production"         |
| order      | int     | urutan tampil di timeline |

### tickets
| column         | type      | notes                                       |
|----------------|-----------|---------------------------------------------|
| id             | uuid PK   |                                             |
| project_id     | uuid FK   |                                             |
| title          | text      |                                             |
| description    | text      | nullable, markdown supported                |
| start_date     | date      |                                             |
| end_date       | date      | nullable = ongoing                          |
| environment_id | uuid FK   |                                             |
| status         | enum      | planned/in_progress/blocked/done/cancelled  |
| assignee_name  | text      | nullable, free text nama assignee           |
| color          | text      | nullable, override warna bar di timeline    |
| created_by     | uuid FK   | → auth.users                                |
| created_at     | timestamp |                                             |
| updated_at     | timestamp |                                             |

### ticket_modules
| column    | type    |
|-----------|---------|
| ticket_id | uuid FK |
| module_id | uuid FK |

---

## RLS Policy (Supabase)
Simpel: semua authenticated user bisa SELECT/INSERT/UPDATE/DELETE semua tabel.
Unauthenticated request ditolak di semua tabel.

---

## Folder Structure

src/
├── components/
│   ├── timeline/
│   │   ├── TimelineView.tsx        # main gantt container
│   │   ├── TimelineHeader.tsx      # tanggal/bulan header
│   │   ├── TimelineRow.tsx         # satu row = satu environment
│   │   ├── TicketBar.tsx           # bar draggable di timeline
│   │   ├── ConflictLine.tsx        # highlight zona konflik
│   │   └── TimelineControls.tsx    # zoom, scroll, filter
│   ├── board/
│   │   ├── BoardView.tsx           # kanban container
│   │   ├── BoardColumn.tsx         # kolom per status
│   │   └── BoardCard.tsx           # card draggable
│   ├── tickets/
│   │   ├── TicketModal.tsx         # create/edit (slide-over panel)
│   │   ├── TicketForm.tsx          # form fields
│   │   ├── ModuleSelector.tsx      # multi-select dari registry
│   │   └── TicketBadge.tsx         # conflict badge
│   ├── conflicts/
│   │   ├── ConflictPanel.tsx       # side panel list konflik aktif
│   │   ├── ConflictCard.tsx        # tiket A vs B + shared modules
│   │   └── ConflictToast.tsx       # notif realtime konflik baru
│   ├── project/
│   │   ├── ProjectSettings.tsx     # manage modules & environments
│   │   ├── ModuleRegistry.tsx      # CRUD modul
│   │   └── EnvironmentManager.tsx  # CRUD + reorder environment
│   └── ui/                         # shared: Button, Modal, Badge, Input dll
│
├── hooks/
│   ├── useConflicts.ts             # derive conflicts dari tickets (memoized)
│   ├── useTickets.ts               # CRUD + optimistic update
│   ├── useModules.ts               # fetch & cache modules per project
│   ├── useEnvironments.ts          # fetch environments
│   ├── useRealtimeTickets.ts       # subscribe supabase realtime
│   └── useTimeline.ts              # zoom level, scroll position, px-per-day
│
├── stores/
│   ├── viewStore.ts                # activeView: timeline|board|conflicts
│   ├── filterStore.ts              # filter by env, status, module
│   └── timelineStore.ts            # zoom, visible date range
│
├── lib/
│   ├── conflict.ts                 # PURE FUNCTIONS conflict detection
│   ├── timeline.ts                 # kalkulasi posisi pixel dari tanggal
│   ├── supabase.ts                 # supabase client instance
│   └── utils.ts                    # helpers umum
│
└── pages/
    ├── Dashboard.tsx               # list semua projects
    ├── Project.tsx                 # main project view
    └── Login.tsx

---

## Core Logic: lib/conflict.ts

File ini PURE FUNCTIONS, tidak ada side effect, tidak ada API call.
Semua conflict logic HANYA boleh ada di file ini dan hook useConflicts.ts.

```typescript
type Ticket = {
  id: string
  start_date: string        // YYYY-MM-DD
  end_date: string | null
  environment_id: string
  status: 'planned' | 'in_progress' | 'blocked' | 'done' | 'cancelled'
  module_ids: string[]
}

type ConflictPair = {
  ticketA: Ticket
  ticketB: Ticket
  sharedModules: string[]
  type: 'hard' | 'soft'
}

function detectConflicts(tickets: Ticket[]): ConflictPair[]
function datesOverlap(a: Ticket, b: Ticket): boolean
function modulesOverlap(a: Ticket, b: Ticket): string[]
function isCheckable(ticket: Ticket): boolean
// → false jika status done/cancelled atau end_date null
```

useConflicts.ts memanggil detectConflicts via useMemo,
re-compute hanya kalau tickets array berubah.

---

## UX Principles

### Timeline View
- Default zoom: 1 cell = 1 hari
- Zoom in/out: scroll wheel + tombol +/−
- Drag tiket horizontal → geser tanggal
  saat drag, conflict highlight update realtime
- Klik area kosong di row → buka create ticket
  prefill environment & tanggal dari posisi klik
- Drag di area kosong → set range tanggal langsung
- Klik tiket → slide-over panel detail dari kanan
- Today marker: garis vertikal
- Zona konflik: background merah/kuning transparan

### Conflict Feedback
- Badge merah/kuning langsung di TicketBar dan BoardCard
- ConflictPanel sidebar kanan: list semua konflik aktif
  format: "Tiket A ↔ Tiket B — Sales Order, Payment"
- Toast notif kalau PM lain tambah tiket yang konflik

### Board View
- Drag card antar kolom status
- Card tampilkan module badges
- Conflict badge tetap tampil

### General UX
- Semua CRUD pakai optimistic update
- Skeleton loader, bukan spinner
- Semua destructive action bisa di-undo 5 detik via snackbar
- Empty state informatif dan actionable
- Keyboard shortcut: N = new ticket, F = filter, Esc = close panel

---

## Realtime
- Subscribe tabel tickets per project_id via Supabase Realtime
- INSERT/UPDATE/DELETE → invalidate TanStack Query cache
- Conflict re-compute otomatis karena useConflicts reaktif ke tickets

---

## Conventions
- Semua date: ISO string YYYY-MM-DD, manipulasi HANYA via date-fns
- Tidak ada new Date() langsung di luar lib/utils.ts
- Tidak ada conflict logic di luar lib/conflict.ts dan useConflicts.ts
- Optimistic update: update cache dulu → API call → rollback on error
- Tidak ada TypeScript any, semua harus typed
- Warna tiket default dari environment color, bisa di-override per tiket