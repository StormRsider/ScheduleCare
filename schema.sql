-- 1. Create the patients table (persistent patient registry)
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL, -- Token No. / Identifier
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create the appointments table (weekly whiteboard slots)
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY')),
  batch TEXT NOT NULL CHECK (batch IN ('MORNING', 'EVENING')),
  position INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'IN_SESSION', 'COMPLETED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Enable Row Level Security (RLS) on both tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Patients table
CREATE POLICY "Allow public read access on patients" ON patients
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on patients" ON patients
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update on patients" ON patients
  FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete on patients" ON patients
  FOR DELETE TO public USING (true);

-- RLS Policies for Appointments table
CREATE POLICY "Allow public read access on appointments" ON appointments
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on appointments" ON appointments
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update on appointments" ON appointments
  FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete on appointments" ON appointments
  FOR DELETE TO public USING (true);

-- 5. Trigger to automatically update updated_at timestamp on record updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Enable real-time updates for both tables
DO $$
BEGIN
  -- Enable for patients table
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'patients'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE patients;
  END IF;

  -- Enable for appointments table
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
