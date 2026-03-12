# DockLog — Marina Service Tracker

Production-ready PWA for tracking marina service worker hours with voice memo transcription, auto-tagging by slip number and task type, photo attachments, and admin dashboard with Excel export.

## Stack

- **Next.js 14** (App Router)
- **PostgreSQL** + Prisma ORM
- **NextAuth.js** (PIN-based worker auth)
- **PWA** (installable on iPhone/Android via Add to Home Screen)
- **Tailwind CSS** (shadcn-inspired design)
- **SheetJS** (Excel export)
- **Web Speech API** (voice transcription)

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL running locally
- A database created for the app

### 2. Clone & Install

```bash
cd docklog-prod
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Postgres credentials:

```
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/docklog"
NEXTAUTH_SECRET="run-openssl-rand-base64-32-to-generate"
NEXTAUTH_URL="http://localhost:3000"
```

Generate the secret:
```bash
openssl rand -base64 32
```

### 4. Set Up Database

```bash
# Create tables
npx prisma db push

# Seed default workers (Steve, Peter, Rick)
npm run db:seed
```

Default PINs after seeding:
| Worker | PIN  | Role   |
|--------|------|--------|
| Steve  | 1111 | Worker |
| Peter  | 2222 | Admin  |
| Rick   | 3333 | Worker |

### 5. Run

```bash
npm run dev
```

Open `http://localhost:3000` on your phone (same network) or computer.

### 6. Install as PWA

On your iPhone/Android:
1. Open the URL in Safari/Chrome
2. Tap **Share → Add to Home Screen**
3. It launches full-screen like a native app

## App Features

### Worker Flow
1. Select your name → enter PIN
2. **Clock In** → work → **Clock Out**
3. Optional: Record voice memo ("Slip 42, cleaned the hull")
4. App auto-detects slip number and task type from speech
5. Optional: Attach a photo
6. Save session

### Admin Features (Peter's account)
- View all workers' sessions
- Filter by worker, slip number, task type
- See time breakdown by slip
- **Export to Excel** — downloads .xlsx with all session data
- **Manage roster** — add/remove workers with PINs

### Voice Parsing
Understands natural speech:
- Slip numbers as digits ("slip 42") or words ("slip forty-two")
- Task detection from natural language ("cleaned the hull" → cleaning, "fixed the wiring" → electrical)
- 18 task categories with 150+ word variants

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  — Auth handler
│   │   ├── sessions/route.ts            — Clock in/out, list, update
│   │   ├── users/route.ts               — Worker management
│   │   ├── photos/route.ts              — Photo upload
│   │   └── export/route.ts              — Excel export
│   ├── dashboard/
│   │   ├── layout.tsx                   — Nav + auth guard
│   │   ├── page.tsx                     — Timer + voice memo
│   │   ├── logs/page.tsx                — My sessions
│   │   └── admin/page.tsx               — Admin dashboard
│   ├── login/page.tsx                   — Worker select + PIN
│   ├── layout.tsx                       — Root layout + PWA meta
│   ├── providers.tsx                    — Session provider
│   ├── globals.css                      — Tailwind + animations
│   └── page.tsx                         — Root redirect
├── lib/
│   ├── auth.ts                          — NextAuth config
│   ├── db.ts                            — Prisma client
│   ├── parse-transcript.ts              — Voice transcript parser
│   └── utils.ts                         — cn() utility
└── types/
    └── next-auth.d.ts                   — Type augmentations
```

## Deployment

For production, deploy to **Vercel** (easiest with Next.js) or any Node.js host:

```bash
npm run build
npm start
```

Use a managed Postgres (Supabase, Neon, Railway) for the database.

For HTTPS (required for PWA + mic access), Vercel provides it automatically, or use Cloudflare Tunnel for local hosting.

## Next Steps

- [ ] Add PWA icon images (icon-192.png, icon-512.png) to `/public`
- [ ] Push notifications for clock-out reminders (VAPID keys in .env)
- [ ] Offline support with service worker caching
- [ ] Time period filters in admin (this week, this month)
- [ ] Per-session editing in admin view
