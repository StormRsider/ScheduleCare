-- 1. Create the appointments table
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

-- 2. Enable Row Level Security (RLS) on the table
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Policy: Allow read access to anyone (public/anonymous and authenticated) for the read-only TV mode
CREATE POLICY "Allow public read access" ON appointments
  FOR SELECT USING (true);

-- Policy: Allow full write access (insert/update/delete) to everyone (public/anonymous)
CREATE POLICY "Allow public insert" ON appointments
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update" ON appointments
  FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete" ON appointments
  FOR DELETE TO public USING (true);

-- 4. Trigger to automatically update updated_at timestamp on record updates
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

-- 5. Enable real-time updates for the appointments table
-- Check if the publication already exists (usually 'supabase_realtime' is default in Supabase)
-- If not, you might need to create it. In Supabase, the publication exists, so we just add the table to it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'appointments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
  END IF;
END $$;
