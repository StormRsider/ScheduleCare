import { useState, useEffect, useCallback } from 'react';
import { Appointment, DayOfWeek, Batch } from './types';
import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';

export function useBoardState() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [user] = useState<User | null>({ id: 'public-user', email: 'public@clinic.com' } as any);
  const [role] = useState<'admin' | 'staff' | null>('admin');

  // Fetch Initial Appointments Data directly from Supabase
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    if (!supabase) {
      console.warn('Supabase client is not initialized.');
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
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
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Supabase Realtime Subscription
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('appointments-realtime-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRecord = payload.new as Appointment;
            setAppointments((prev) => {
              if (prev.some((app) => app.id === newRecord.id)) return prev;
              return [...prev, newRecord].sort((a, b) => a.position - b.position);
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedRecord = payload.new as Appointment;
            setAppointments((prev) =>
              prev
                .map((app) => (app.id === updatedRecord.id ? updatedRecord : app))
                .sort((a, b) => a.position - b.position)
            );
          } else if (payload.eventType === 'DELETE') {
            const oldRecord = payload.old as { id: string };
            setAppointments((prev) => prev.filter((app) => app.id !== oldRecord.id));
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // CRUD Actions
  // Add Appointment
  const addAppointment = async (patientName: string, patientCode: string, day: DayOfWeek, batch: Batch) => {
    if (!supabase) {
      alert("Error: Database connection is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your Vercel Environment Variables, then redeploy.");
      return;
    }

    const currentBatchApps = appointments.filter(
      (app) => app.day_of_week === day && app.batch === batch
    );
    const nextPos = currentBatchApps.length > 0 
      ? Math.max(...currentBatchApps.map((a) => a.position)) + 1 
      : 0;

    const newApp: Omit<Appointment, 'id' | 'created_at' | 'updated_at'> = {
      patient_name: patientName,
      patient_code: patientCode,
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
      setAppointments((prev) => [...prev, data].sort((a, b) => a.position - b.position));
    } catch (err: any) {
      console.error(
        'Failed to add appointment:', 
        err?.message || err, 
        err?.details || '', 
        err?.hint || ''
      );
    }
  };

  // Update Appointment (Name and Code)
  const updateAppointment = async (id: string, updates: Partial<Pick<Appointment, 'patient_name' | 'patient_code'>>) => {
    if (!supabase) {
      alert("Error: Database connection is not configured.");
      return;
    }

    // Optimistic Update
    setAppointments((prev) =>
      prev.map((app) => (app.id === id ? { ...app, ...updates } : app))
    );

    try {
      const { error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (err: any) {
      console.error(
        'Failed to update appointment:', 
        err?.message || err, 
        err?.details || '', 
        err?.hint || ''
      );
      fetchAppointments();
    }
  };

  // Delete Appointment
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

  // Reset Board (Clear all appointments)
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
    loading,
    user,
    role,
    isSupabaseConnected: !!supabase,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    moveAppointment,
    refreshBoard: fetchAppointments,
    resetBoard
  };
}
