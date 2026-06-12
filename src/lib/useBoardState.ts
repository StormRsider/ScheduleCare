import { useState, useEffect, useCallback, useRef } from 'react';
import { Appointment, Patient, DayOfWeek, Batch } from './types';
import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';

export function useBoardState() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [user] = useState<User | null>({ id: 'public-user', email: 'public@clinic.com' } as any);
  const [role] = useState<'admin' | 'staff' | null>('admin');

  // Keep references to state arrays for safe access inside realtime WebSocket closure listeners
  const patientsRef = useRef<Patient[]>([]);
  const appointmentsRef = useRef<Appointment[]>([]);

  useEffect(() => {
    patientsRef.current = patients;
  }, [patients]);

  useEffect(() => {
    appointmentsRef.current = appointments;
  }, [appointments]);

  // Fetch Patients Registry
  const fetchPatients = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setPatients(data || []);
    } catch (err: any) {
      console.error('Error fetching patients from Supabase:', err?.message || err);
    }
  }, []);

  // Fetch Initial Appointments Data directly from Supabase (with joined patient details)
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    if (!supabase) {
      console.warn('Supabase client is not initialized.');
      setLoading(false);
      return;
    }
    try {
      // Fetch patients first to ensure registry is loaded
      await fetchPatients();

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_id,
          day_of_week,
          batch,
          position,
          created_at,
          updated_at,
          patients (
            name,
            code,
            phone
          )
        `)
        .order('position', { ascending: true });

      if (error) throw error;

      // Flatten nested joint query format to flat Appointment format
      const formatted: Appointment[] = (data || []).map((item: any) => ({
        id: item.id,
        patient_id: item.patient_id,
        day_of_week: item.day_of_week,
        batch: item.batch,
        position: item.position,
        created_at: item.created_at,
        updated_at: item.updated_at,
        patient_name: item.patients?.name || 'Unknown',
        patient_code: item.patients?.code || '',
        patient_phone: item.patients?.phone || ''
      }));

      setAppointments(formatted);
    } catch (err: any) {
      console.error(
        'Error fetching appointments from Supabase:', 
        err?.message || err, 
        err?.details || '', 
        err?.hint || ''
      );
    } finally {
      setLoading(false);
    }
  }, [fetchPatients]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Supabase Realtime Subscription for both tables
  useEffect(() => {
    if (!supabase) return;

    const appointmentsChannel = supabase
      .channel('appointments-realtime-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRecord = payload.new as any;
            const pat = patientsRef.current.find((p) => p.id === newRecord.patient_id);
            const formatted: Appointment = {
              ...newRecord,
              patient_name: pat?.name || 'Unknown',
              patient_code: pat?.code || '',
              patient_phone: pat?.phone || ''
            };
            setAppointments((prev) => {
              if (prev.some((app) => app.id === formatted.id)) return prev;
              return [...prev, formatted].sort((a, b) => a.position - b.position);
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedRecord = payload.new as any;
            const pat = patientsRef.current.find((p) => p.id === updatedRecord.patient_id);
            const formatted: Appointment = {
              ...updatedRecord,
              patient_name: pat?.name || 'Unknown',
              patient_code: pat?.code || '',
              patient_phone: pat?.phone || ''
            };
            setAppointments((prev) =>
              prev
                .map((app) => (app.id === formatted.id ? formatted : app))
                .sort((a, b) => a.position - b.position)
            );
          } else if (payload.eventType === 'DELETE') {
            const oldRecord = payload.old as { id: string };
            setAppointments((prev) => prev.filter((app) => app.id !== oldRecord.id));
          }
        }
      )
      .subscribe();

    const patientsChannel = supabase
      .channel('patients-realtime-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newPat = payload.new as Patient;
            setPatients((prev) => {
              if (prev.some((p) => p.id === newPat.id)) return prev;
              return [...prev, newPat].sort((a, b) => a.name.localeCompare(b.name));
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedPat = payload.new as Patient;
            setPatients((prev) =>
              prev.map((p) => (p.id === updatedPat.id ? updatedPat : p))
            );
            // Sync updated patient details in the appointments list state
            setAppointments((prev) =>
              prev.map((app) => {
                if (app.patient_id === updatedPat.id) {
                  return {
                    ...app,
                    patient_name: updatedPat.name,
                    patient_code: updatedPat.code,
                    patient_phone: updatedPat.phone
                  };
                }
                return app;
              })
            );
          } else if (payload.eventType === 'DELETE') {
            const oldPat = payload.old as { id: string };
            setPatients((prev) => prev.filter((p) => p.id !== oldPat.id));
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(appointmentsChannel);
        supabase.removeChannel(patientsChannel);
      }
    };
  }, []);

  // Create Patient helper (Persistent Directory)
  const createPatient = async (name: string, code: string, phone?: string): Promise<Patient | null> => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('patients')
        .insert({ name, code, phone })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Failed to create patient:', err?.message || err);
      return null;
    }
  };

  // Update Patient helper (Persistent Directory)
  const updatePatientDetails = async (id: string, name: string, code: string, phone?: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('patients')
        .update({ name, code, phone })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Failed to update patient details:', err?.message || err);
    }
  };

  // CRUD Actions
  // Add Appointment
  const addAppointment = async (patientId: string, day: DayOfWeek, batch: Batch) => {
    if (!supabase) {
      alert("Error: Database connection is not configured.");
      return;
    }

    const currentBatchApps = appointments.filter(
      (app) => app.day_of_week === day && app.batch === batch
    );
    const nextPos = currentBatchApps.length > 0 
      ? Math.max(...currentBatchApps.map((a) => a.position)) + 1 
      : 0;

    const newApp = {
      patient_id: patientId,
      day_of_week: day,
      batch: batch,
      position: nextPos,
    };

    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert(newApp)
        .select()
        .single();

      if (error) throw error;

      // Optimistically update appointments in state
      const pat = patientsRef.current.find((p) => p.id === patientId);
      const formatted: Appointment = {
        ...data,
        patient_name: pat?.name || 'Unknown',
        patient_code: pat?.code || '',
        patient_phone: pat?.phone || ''
      };
      setAppointments((prev) => [...prev, formatted].sort((a, b) => a.position - b.position));
    } catch (err: any) {
      console.error(
        'Failed to add appointment:', 
        err?.message || err, 
        err?.details || '', 
        err?.hint || ''
      );
    }
  };

  // Update Appointment (Updates details in the persistent patients directory)
  const updateAppointment = async (
    id: string, 
    updates: Partial<Pick<Appointment, 'patient_name' | 'patient_code' | 'patient_phone'>>
  ) => {
    const app = appointments.find((a) => a.id === id);
    if (!app) return;

    const patientId = app.patient_id;
    const name = updates.patient_name !== undefined ? updates.patient_name : app.patient_name || '';
    const code = updates.patient_code !== undefined ? updates.patient_code : app.patient_code || '';
    const phone = updates.patient_phone !== undefined ? updates.patient_phone : app.patient_phone || '';

    // Optimistically update locally
    setAppointments((prev) =>
      prev.map((a) => {
        if (a.patient_id === patientId) {
          return {
            ...a,
            patient_name: name,
            patient_code: code,
            patient_phone: phone
          };
        }
        return a;
      })
    );

    await updatePatientDetails(patientId, name, code, phone);
  };

  // Delete Appointment (Deletes only the schedule slot, leaves the patient registry untouched)
  const deleteAppointment = async (id: string) => {
    if (!supabase) {
      alert("Error: Database connection is not configured.");
      return;
    }

    const target = appointments.find((a) => a.id === id);
    if (!target) return;

    // Optimistic Update
    setAppointments((prev) => prev.filter((app) => app.id !== id));

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Clean up positions in the day/batch column
      const currentBatch = appointments
        .filter((a) => a.day_of_week === target.day_of_week && a.batch === target.batch && a.id !== id)
        .sort((a, b) => a.position - b.position);
      
      for (let i = 0; i < currentBatch.length; i++) {
        if (currentBatch[i].position !== i) {
          await supabase
            .from('appointments')
            .update({ position: i })
            .eq('id', currentBatch[i].id);
        }
      }
    } catch (err: any) {
      console.error(
        'Failed to delete appointment:', 
        err?.message || err, 
        err?.details || '', 
        err?.hint || ''
      );
      fetchAppointments();
    }
  };

  // Move / Reorder Appointment (Drag & Drop)
  const moveAppointment = async (
    id: string,
    targetDay: DayOfWeek,
    targetBatch: Batch,
    targetIdx?: number
  ) => {
    if (!supabase) {
      alert("Error: Database connection is not configured.");
      return;
    }

    const target = appointments.find((a) => a.id === id);
    if (!target) return;

    const sourceDay = target.day_of_week;
    const sourceBatch = target.batch;

    // 1. Get current lists for source and target
    const sourceList = appointments
      .filter((a) => a.day_of_week === sourceDay && a.batch === sourceBatch && a.id !== id)
      .sort((a, b) => a.position - b.position);

    let targetList = appointments
      .filter((a) => a.day_of_week === targetDay && a.batch === targetBatch && a.id !== id)
      .sort((a, b) => a.position - b.position);

    // 2. Insert dragged appointment into target list at specified index
    const movingApp = { ...target, day_of_week: targetDay, batch: targetBatch };
    
    if (targetIdx === undefined || targetIdx >= targetList.length) {
      targetList.push(movingApp);
    } else {
      targetList.splice(targetIdx, 0, movingApp);
    }

    // 3. Re-assign positions for target list (0, 1, 2...)
    const newTargetList = targetList.map((app, idx) => ({ ...app, position: idx }));

    // 4. If target and source day/batch are different, also re-assign source list positions
    let newSourceList: Appointment[] = [];
    const isSameColumn = sourceDay === targetDay && sourceBatch === targetBatch;
    if (!isSameColumn) {
      newSourceList = sourceList.map((app, idx) => ({ ...app, position: idx }));
    }

    // 5. Update local state optimistically
    const updatedLocalApps = appointments.map((app) => {
      if (app.id === id) {
        return { ...app, day_of_week: targetDay, batch: targetBatch, position: newTargetList.find((t) => t.id === id)!.position };
      }
      
      const inTarget = newTargetList.find((t) => t.id === app.id);
      if (inTarget) {
        return { ...app, position: inTarget.position };
      }

      if (!isSameColumn) {
        const inSource = newSourceList.find((s) => s.id === app.id);
        if (inSource) {
          return { ...app, position: inSource.position };
        }
      }

      return app;
    }).sort((a, b) => a.position - b.position);

    setAppointments(updatedLocalApps);

    // 6. Write changes to backend database
    const client = supabase;
    try {
      // Update the dragged item day/batch/position
      const { error: primaryError } = await client
        .from('appointments')
        .update({
          day_of_week: targetDay,
          batch: targetBatch,
          position: newTargetList.find((t) => t.id === id)!.position
        })
        .eq('id', id);

      if (primaryError) throw primaryError;

      // Batch update target list positions (except the dragged item which we just updated)
      const targetUpdates = newTargetList
        .filter((a) => a.id !== id)
        .map((a) =>
          client
            .from('appointments')
            .update({ position: a.position })
            .eq('id', a.id)
        );

      // Batch update source list positions if day/batch changed
      let sourceUpdates: any[] = [];
      if (!isSameColumn) {
        sourceUpdates = newSourceList.map((a) =>
          client
            .from('appointments')
            .update({ position: a.position })
            .eq('id', a.id)
        );
      }

      await Promise.all([...targetUpdates, ...sourceUpdates]);
    } catch (err: any) {
      console.error(
        'Failed to sync drag reorder to Supabase:', 
        err?.message || err, 
        err?.details || '', 
        err?.hint || ''
      );
      fetchAppointments(); // Revert to database state on error
    }
  };

  // Reset Board (Clear all weekly appointments, leaves patient registry intact)
  const resetBoard = async () => {
    if (!supabase) {
      alert("Error: Database connection is not configured.");
      return;
    }
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;
      setAppointments([]);
    } catch (err: any) {
      console.error(
        'Failed to reset board:', 
        err?.message || err, 
        err?.details || '', 
        err?.hint || ''
      );
    }
  };

  return {
    appointments,
    patients,
    loading,
    user,
    role,
    isSupabaseConnected: !!supabase,
    createPatient,
    updatePatientDetails,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    moveAppointment,
    refreshBoard: fetchAppointments,
    resetBoard
  };
}
