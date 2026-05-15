# Deployment Conflict Manager — CLAUDE.md

## Product Overview
Web app untuk Project Manager melacak deployment tickets dan mendeteksi
konflik berdasarkan irisan modul + overlap deployment range + environment.
Semua user adalah PM, bisa akses dan manage semua project.

---

## Core Business Rules

### Conflict Detection
Conflict engine bekerja berdasarkan **deployment ranges per environment**, bukan sekedar
tanggal start/end tiket.

Tiap tiket di-expand jadi `DeploymentRange[]`:
- Jika belum ada deployments: satu range `[startDate, endDate ?? FAR_FUTURE]` di `environmentId`
- Jika ada deployments: tiap entry jadi range `[dep.date, nextDep.date)`, entry terakhir
  `[dep.date, ticket.endDate ?? dep.date]`

Dua tiket CONFLICT jika salah satu pasangan range mereka memenuhi SEMUA kondisi:
1. Minimal 1 modul yang sama
2. Range overlap: `rA.startDate <= rB.endDate AND rB.startDate <= rA.endDate`
3. Same environment → **HARD CONFLICT** (badge merah)
   Beda environment → **SOFT WARNING** (badge kuning)

Tiket dengan status `done` atau `cancelled` **tidak** ikut conflict-check.

### Conflict Types
- **HARD** → same environment + same module + date overlap → badge merah `⚡`
- **SOFT** → different environment + same module + date overlap → badge kuning `◎`
- **SAFE** → tidak ada irisan → tidak ada badge

### `endDate` derivation (appStore)
`ticket.endDate` di-derive otomatis dari deployment history:
- Tidak ada deployment → pakai `endDate` asli
- Ada deployment → ambil tanggal deployment **terbaru ke `ticket.environmentId`**
  (environment saat ini)

---

## Tech Stack

### Frontend (aktif dipakai)
- React 18 + Vite
- TailwindCSS v3 (diinstall, tapi styling pakai **inline styles** dengan `C` tokens)
- **Zustand v5** — satu store utama (`appStore`) + satu store auth (`authStore`)
- **date-fns v4** — semua operasi tanggal
- `@dnd-kit/core + sortable` — installed, **belum dipakai** (Board pakai HTML5 DnD)
- Framer Motion — installed, **belum dipakai**
- `@supabase/supabase-js` — dipakai untuk Auth; data masih mock (belum Supabase DB)

### Backend (Supabase)
- **Auth** — email/password, sudah terintegrasi
- **PostgreSQL + RLS** — schema sudah dirancang, **belum diimplementasi** (masih mock data)
- **Realtime** — belum diimplementasi

### Design System
Semua komponen pakai inline styles dengan token dari `src/components/ui/tokens.ts`:
```typescript
// C = color tokens
C.bg, C.surface, C.surfaceEl, C.border, C.borderEl
C.text, C.textSec, C.textMut
C.accent, C.accentHov, C.hard, C.soft, C.green, C.blue
```

---

## TypeScript Types (src/types.ts — aktual)

```typescript
export type TicketStatus   = 'planned' | 'in-progress' | 'blocked' | 'done' | 'cancelled'
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low'
export type ConflictType   = 'hard' | 'soft'
export type AppView        = 'dashboard' | 'timeline' | 'board'

export interface Environment {
  id: string; name: string; color: string; order: number
}

export interface Module {
  id: string; name: string; category: string
}

export interface Project {
  id: string; name: string; description: string
  createdAt: string
  environments: Environment[]   // embedded, bukan join table
  modules: Module[]             // embedded, bukan join table
}

export interface DeploymentEntry {
  id: string
  environmentId: string
  date: string          // YYYY-MM-DD — tanggal deploy ke env ini
}

export interface Ticket {
  id: string; projectId: string
  title: string; description: string
  startDate: string               // YYYY-MM-DD
  endDate: string | null          // null = ongoing (derived, lihat appStore)
  environmentId: string           // target environment saat ini
  status: TicketStatus
  assignee: string                // free text, nullable via ''
  modules: string[]               // array of module IDs
  priority: TicketPriority
  deployments: DeploymentEntry[]  // riwayat deploy ke setiap env, terurut
}

export interface ConflictPair {
  id: string            // `c-${ticketAId}-${ticketBId}`
  ticket1Id: string
  ticket2Id: string
  modules: string[]     // shared module IDs
  type: ConflictType
  projectId: string
  overlapStart: string  // YYYY-MM-DD
  overlapEnd: string    // YYYY-MM-DD
}
```

**Catatan:** `status` menggunakan **hyphen** (`in-progress`), bukan underscore.

---

## Folder Structure (aktual)

```
src/
├── App.tsx                           # root: auth guard + nav + view router
├── main.tsx                          # QueryClientProvider + auth init listener
├── index.css
├── types.ts                          # semua TypeScript interfaces & enums
│
├── pages/
│   └── Login.tsx                     # email/password login + sign up
│
├── components/
│   ├── timeline/
│   │   └── TimelineView.tsx          # semua logic timeline dalam satu file
│   │       # includes: DeploymentConnectors, MarkerBox, ConflictZoneOverlay
│   ├── board/
│   │   └── BoardView.tsx             # kanban — includes BoardColumn, BoardCard
│   ├── conflicts/
│   │   └── ConflictPanel.tsx         # side panel — includes ConflictItem
│   ├── tickets/
│   │   └── TicketModal.tsx           # create/edit/view modal (centered overlay)
│   ├── project/
│   │   ├── DashboardView.tsx         # list projects + create project modal
│   │   ├── ModuleRegistryModal.tsx   # CRUD modules per project
│   │   └── EnvManagerModal.tsx       # CRUD environments per project
│   └── ui/
│       ├── tokens.ts                 # C color tokens + STATUS_CFG + PRIORITY_COLORS
│       ├── Badge.tsx                 # conflict badge (hard/soft/default, size xs|sm)
│       ├── Btn.tsx                   # Button (variant: primary|default|ghost|danger)
│       ├── FormControls.tsx          # Input, Sel, Textarea, Field, Hr
│       ├── ModuleChip.tsx            # module tag dengan conflict highlight
│       ├── PriorityDot.tsx           # colored dot per priority
│       └── StatusBadge.tsx           # status label dengan warna
│
├── hooks/
│   └── useConflicts.ts               # useMemo wrapper atas detectConflicts
│
├── stores/
│   ├── appStore.ts                   # SATU store: projects, tickets, UI state
│   └── authStore.ts                  # auth: user, session, signIn/Up/Out, init
│
└── lib/
    ├── conflict.ts                   # PURE FUNCTIONS: detectConflicts, helpers
    ├── supabase.ts                   # createClient (VITE_SUPABASE_URL + ANON_KEY)
    ├── data.ts                       # INIT_PROJECTS + INIT_TICKETS (mock data)
    └── utils.ts                      # date helpers, generateId (date-fns only)
```

---

## State Management (src/stores/appStore.ts)

Satu Zustand store untuk semua app state:

```typescript
interface AppState {
  // Data
  projects: Project[]
  tickets: Ticket[]

  // Navigation
  selectedProjectId: string
  view: AppView                        // 'dashboard' | 'timeline' | 'board'

  // Ticket modal
  activeTicketId: string | null
  ticketMode: 'view' | 'edit' | 'create' | null
  newTicketDefaults: Partial<Ticket>

  // Panel visibility
  conflictPanelOpen: boolean
  registryOpen: boolean
  envManagerOpen: boolean

  // Actions
  setView / setProject / openTicket / closeTicket / newTicket
  saveTicket / deleteTicket / moveTicket / removeDeploymentEntry
  toggleConflicts / openRegistry / closeRegistry / openEnvManager / closeEnvManager
  saveProject / createProject
}
```

**`deriveEndDate(ticket)`** — dipanggil setiap kali ticket disave/dimove. Mengambil
tanggal deployment terbaru ke `ticket.environmentId`; jika tidak ada, pakai `endDate` asli.

---

## Auth (src/stores/authStore.ts)

```typescript
interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  signIn(email, password): Promise<string | null>  // returns error message or null
  signUp(email, password): Promise<string | null>
  signOut(): Promise<void>
  init(): () => void   // panggil di main.tsx useEffect; returns unsubscribe
}
```

**Auth guard di App.tsx:**
- `loading` → spinner
- `!user` → `<Login />`
- `user` → main app

**Setup:** buat file `.env.local` dengan:
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

---

## Core Logic: lib/conflict.ts

Pure functions, tidak ada side effect, tidak ada API call.
**Semua conflict logic HANYA boleh ada di file ini dan `useConflicts.ts`.**

```typescript
// Internal helper
interface DeploymentRange {
  ticketId: string; projectId: string
  environmentId: string; modules: string[]
  startDate: string; endDate: string
}

// Expand ticket ke array of deployment ranges per env
function getDeploymentRanges(ticket: Ticket): DeploymentRange[]

// Main export — O(n²) per pair, O(r²) per range combination
export function detectConflicts(tickets: Ticket[]): ConflictPair[]

// Legacy helpers (dipakai beberapa komponen)
export function isCheckable(ticket: Ticket): boolean
export function datesOverlap(a: Ticket, b: Ticket): boolean
export function modulesOverlap(a: Ticket, b: Ticket): string[]
```

`useConflicts.ts` memanggil `detectConflicts` via `useMemo`,
re-compute hanya kalau `tickets` array berubah.

---

## Timeline View (TimelineView.tsx)

Timeline bukan Gantt bar — ini adalah **deployment marker view**:
- Tiap kolom = satu hari
- Tiap row = satu environment
- **MarkerBox** = compact box di kolom hari deployment, bukan bar horizontal
  - `isPlanned: true` → border dashed, icon `◌`, tiket belum punya deployment
  - `isPlanned: false` → border solid, icon `●`, ada actual deployment entry
  - Multiple tiket di hari/env yang sama → digabung dalam satu MarkerBox
- **DeploymentConnectors** = bezier SVG lines antara deployment markers satu tiket lintas env
- **ConflictZoneOverlay** = background merah/kuning transparan di tanggal overlap

**Constants:**
```typescript
const LEFT_W     = 148   // lebar kolom env label (px)
const ROW_H      = 100   // tinggi tiap env row (px)
const HDR_H      = 52    // tinggi date header (px)
const DEFAULT_DW = 80    // default px per day (zoom)
const TOTAL_DAYS = 35    // total hari yang tampil sekaligus
```

**Drag behavior (MarkerBox):**
- Solo marker (1 tiket): draggable horizontal (geser tanggal) + vertical (ganti env)
- Jika planned → update `startDate` + optionally `environmentId` via `moveTicket()`
- Jika actual deployment → update `deployments` entry via `saveTicket()`
- Multi-ticket marker: tidak bisa di-drag, klik untuk popup list

**Zoom:** tombol +/−, range 80–180 px/day

---

## Board View (BoardView.tsx)

- 5 kolom: Planned → In Progress → Blocked → Done → Cancelled
- Drag card antar kolom: **HTML5 drag-and-drop** (bukan @dnd-kit)
  `draggable` + `onDragStart` + `onDrop` per kolom
- Drop → `saveTicket({ ...ticket, status: newStatus })`
- BoardCard tampilkan: priority dot, title, module chips (max 3), env dot, conflict badge

---

## Conventions

- **Semua date:** ISO string `YYYY-MM-DD`, manipulasi HANYA via `date-fns`
- **Tidak ada** `new Date()` langsung di luar `lib/utils.ts`
- **Tidak ada** conflict logic di luar `lib/conflict.ts` dan `useConflicts.ts`
- **Status enum pakai hyphen:** `'in-progress'` bukan `'in_progress'`
- **Tidak ada TypeScript `any`**, semua harus typed
- **Inline styles** menggunakan token dari `C` (`tokens.ts`), bukan Tailwind classes
- Data masih **mock** (`lib/data.ts`) — belum terhubung ke Supabase DB
- Warna tiket/marker default dari environment color (`env.color`)
