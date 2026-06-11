# ScheduleCare - Digital Whiteboard Clinic Scheduler

ScheduleCare is a modern web application designed to replace a physiotherapy clinic's physical whiteboard scheduling system with a real-time, interactive dashboard. It replicates a weekly view (Monday to Saturday) divided into Morning and Evening batches, with focus on visual clarity, simple workflows, and live collaboration.

## Technical Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend & Database**: Supabase, PostgreSQL
- **Real-Time Sync**: Supabase Realtime Channels (WebSockets)
- **Deployment**: Vercel

---

## Getting Started

### 1. Local Development Setup
First, install all project dependencies:
```bash
npm install
```

Start the local Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

If you don't configure Supabase environment variables, the app will run in **offline-first Demo Mode** automatically. Any schedules created, moved, or deleted will persist in your local browser storage, and you can sign in with any mock credentials (e.g. `staff@clinic.com` / `password`).

---

### 2. Database Schema Setup
To connect to your live database, sign in to your [Supabase Dashboard](https://supabase.com) and create a new project. Open the **SQL Editor** and execute the queries inside `schema.sql` to initialize your database structure:

```sql
-- Create the appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name TEXT NOT NULL,
  patient_code TEXT NOT NULL,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY')),
  batch TEXT NOT NULL CHECK (batch IN ('MORNING', 'EVENING')),
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Allow read access to anyone (public and authenticated) for read-only displays
CREATE POLICY "Allow public read access" ON appointments FOR SELECT USING (true);

-- Allow full write actions only to authenticated staff users
CREATE POLICY "Allow authenticated insert" ON appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON appointments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete" ON appointments FOR DELETE TO authenticated USING (true);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime replication
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
```

---

### 3. Configure Credentials
Create a `.env.local` file in your root folder and add your project keys (found under **Project Settings > API** in your Supabase dashboard):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

### 4. Create User Accounts
Enable email/password logins in your Supabase dashboard under **Authentication > Providers > Email**. You can manually create staff accounts under **Authentication > Users** or register directly using the sign-up form in the app.

---

## TV / Waiting Room Mode
Open `/smartboard` on any smartboard, monitor, or TV browser to launch the dedicated display mode:
- Fully read-only dashboard.
- Extra-large high-contrast text visible from a distance.
- Integrated digital clock.
- Real-time updates automatically broadcast changes as they occur.
- Fullscreen mode support.

---

## Deployment Guide (Vercel)

Deploying Next.js to Vercel is quick and simple:

1. Push your code repository to GitHub, GitLab, or Bitbucket.
2. Log in to [Vercel](https://vercel.com) and click **Add New > Project**.
3. Import your repository.
4. Under **Environment Variables**, add the Supabase keys:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**. Vercel will build and host your application with automatic SSL and edge caching.
