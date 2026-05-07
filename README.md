# Kezkam Homes — Rent Management System

A full-featured property and rent management web app built with Next.js 14, Supabase, and Africa's Talking SMS.

---

## Tech Stack

| Layer       | Tech                          |
|-------------|-------------------------------|
| Frontend    | Next.js 14 (App Router)       |
| Database    | Supabase (Postgres)           |
| SMS         | Africa's Talking              |
| Hosting     | Vercel (frontend + cron)      |
| Fonts       | Playfair Display + DM Sans    |

---

## Features

- 🏠 Manage unlimited apartments with per-unit rent, water & garbage bills
- 👤 Add/remove tenants — move-outs preserve full history
- 💳 Record payments (M-Pesa, bank, cash, cheque) with reference numbers
- 📱 Automatic SMS confirmation on every payment (Africa's Talking)
- ⏰ Monthly SMS reminders on the 28th (Vercel Cron)
- 📊 Dashboard overview with collection rate and unpaid alerts
- 📋 SMS logs for full audit trail

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to the **SQL Editor** and run the file at:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
3. From **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Africa's Talking Setup

1. Register at [africastalking.com](https://africastalking.com)
2. Create an app and go to **Sandbox** first for testing
3. Copy your **API Key** and **Username**
4. Optionally register a **Sender ID** (e.g. "KezKam") — takes a few days to approve

### 4. Environment variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
AT_API_KEY=your_at_api_key
AT_USERNAME=your_at_username
AT_SENDER_ID=KezKam
CRON_SECRET=replace_with_random_32_char_string
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment (Vercel)

1. Push this repo to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add all environment variables in **Vercel → Project → Settings → Environment Variables**
4. Deploy — Vercel automatically picks up `vercel.json` for the cron job

### Cron Job

The monthly reminder cron runs on the **28th of every month at 08:00 EAT** (05:00 UTC).
It sends SMS to all active tenants with their upcoming month's bill.

To test the cron manually:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-app.vercel.app/api/reminders
```

---

## Project Structure

```
app/
├── (dashboard)/
│   ├── page.tsx              # Overview dashboard
│   ├── apartments/           # Apartment CRUD + detail
│   ├── tenants/              # Tenant list + detail + history
│   ├── payments/             # Monthly payment tracker
│   └── sms/                  # SMS log viewer
├── api/
│   ├── payments/             # Record payment + send SMS
│   ├── reminders/            # Cron — monthly reminders
│   └── sms/move-out/         # Move-out notification SMS
components/
├── apartments/               # Edit form
├── tenants/                  # Add modal, move-out button
├── payments/                 # Record payment modal
└── ui/                       # Sidebar
lib/
├── supabase/                 # Client, server, types
├── africas-talking.ts        # SMS utility + templates
└── utils.ts                  # Formatting helpers
supabase/
└── migrations/               # SQL schema
```

---

## Adding More Apartments

There is no limit. Just click **Add Apartment** in the UI.
The Supabase free tier supports well over 41 apartments with hundreds of tenants and years of payment history.

---

## Going Live with SMS

1. In Africa's Talking dashboard, go live from Sandbox
2. Add credit to your AT account (very affordable Kenya rates)
3. If using a Sender ID, ensure it's approved before going live
4. Update `AT_USERNAME` from `sandbox` to your live username in Vercel env vars
