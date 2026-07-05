# Deployment Conflict Manager

Web app untuk Project Manager melacak deployment tickets dan mendeteksi konflik
berdasarkan irisan modul + overlap deployment range + environment.

## Tech Stack

- React 18 + Vite + TypeScript
- TailwindCSS v3 (styling utama pakai inline styles)
- Zustand v5 (state management)
- date-fns v4
- Supabase (Auth — data masih mock, belum terhubung ke DB)

## Prasyarat

- Node.js 18+
- Akun [Supabase](https://supabase.com) (untuk Auth)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Buat file `.env.local` di root project (copy dari `.env.example`) dan isi
   dengan kredensial project Supabase kamu:

   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=xxx
   ```

   Kredensial ini bisa didapat dari dashboard Supabase project kamu, di
   **Project Settings → API**.

3. Jalankan development server:

   ```bash
   npm run dev
   ```

   App akan jalan di `http://localhost:5173`.

## Scripts

| Command              | Keterangan                                  |
| --------------------- | -------------------------------------------- |
| `npm run dev`         | Jalankan dev server (Vite)                   |
| `npm run build`       | Type-check + build production bundle         |
| `npm run preview`     | Preview hasil build secara lokal             |
| `npm run type-check`  | Jalankan TypeScript compiler tanpa emit      |
| `npm run stop`        | Kill proses yang listen di port 5173         |

## Catatan

- Login memerlukan akun Supabase Auth (email/password). Bisa sign up langsung
  dari halaman login.
- Data project & ticket tersimpan di Supabase (PostgreSQL + RLS) dan persist
  antar reload/browser.
