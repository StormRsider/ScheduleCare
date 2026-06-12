export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';

export type Batch = 'MORNING' | 'EVENING';

export interface Patient {
  id: string;
  name: string;
  code: string; // Token No.
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  day_of_week: DayOfWeek;
  batch: Batch;
  position: number;
  created_at?: string;
  updated_at?: string;
  // Joined fields from patient table for ease of rendering
  patient_name?: string;
  patient_code?: string;
  patient_phone?: string;
}

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY'
];

export const BATCHES: Batch[] = ['MORNING', 'EVENING'];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday'
};

export const BATCH_LABELS: Record<Batch, string> = {
  MORNING: 'Morning Batch',
  EVENING: 'Evening Batch'
};
