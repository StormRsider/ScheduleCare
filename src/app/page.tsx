"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBoardState } from '@/lib/useBoardState';
import { DayColumn } from '@/components/DayColumn';
import { PatientModal } from '@/components/PatientModal';
import { Appointment, DayOfWeek, Batch, DAYS_OF_WEEK } from '@/lib/types';
import { 
  Heart, 
  Search, 
  Plus, 
  Tv, 
  RefreshCw, 
  Calendar, 
  Users, 
  Grid3X3
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const {
    appointments,
    loading,
    user,
    role,
    isSupabaseConnected,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    moveAppointment,
    refreshBoard,
    resetBoard
  } = useBoardState();

  // 1. Search filter state
  const [searchQuery, setSearchQuery] = useState('');

  // 2. Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Appointment | null>(null);
  const [duplicateFromApp, setDuplicateFromApp] = useState<Appointment | null>(null);
  const [modalDefaultDay, setModalDefaultDay] = useState<DayOfWeek>('MONDAY');
  const [modalDefaultBatch, setModalDefaultBatch] = useState<Batch>('MORNING');

  // Authentication check and logout handlers removed

  // 5. Open Add Modal
  const handleOpenAddModal = (day: DayOfWeek, batch: Batch) => {
    setEditingApp(null);
    setDuplicateFromApp(null);
    setModalDefaultDay(day);
    setModalDefaultBatch(batch);
    setIsModalOpen(true);
  };

  // 6. Open Edit Modal
  const handleOpenEditModal = (app: Appointment) => {
    setEditingApp(app);
    setDuplicateFromApp(null);
    setIsModalOpen(true);
  };

  // 6b. Open Duplicate Modal
  const handleDuplicatePatient = (app: Appointment) => {
    setEditingApp(null);
    setDuplicateFromApp(app);
    setIsModalOpen(true);
  };

  // 7. Save Patient Callback
  const handleSavePatient = async (
    name: string,
    code: string,
    slots: Array<{ day: DayOfWeek; batch: Batch }>
  ) => {
    if (editingApp) {
      await updateAppointment(editingApp.id, {
        patient_name: name,
        patient_code: code
      });
      const newSlot = slots[0];
      if (newSlot && (editingApp.day_of_week !== newSlot.day || editingApp.batch !== newSlot.batch)) {
        await moveAppointment(editingApp.id, newSlot.day, newSlot.batch);
      }
    } else {
      // Create separate records for each selected day/batch combination
      for (const slot of slots) {
        await addAppointment(name, code, slot.day, slot.batch);
      }
    }
  };

  // 8. Delete Patient confirmation
  const handleDeletePatient = async (id: string) => {
    const app = appointments.find((a) => a.id === id);
    if (app && confirm(`Are you sure you want to remove ${app.patient_name} (${app.patient_code})?`)) {
      await deleteAppointment(id);
    }
  };

  // 8b. Weekly Reset
  const handleWeeklyReset = async () => {
    if (confirm('WARNING: Are you sure you want to clear the entire whiteboard? This will permanently delete all patient scheduling entries for the week.')) {
      await resetBoard();
    }
  };

  // 9. Filtered appointments based on search query
  const filteredAppointments = appointments.filter((app) => {
    const nameMatch = app.patient_name.toLowerCase().includes(searchQuery.toLowerCase());
    const codeMatch = app.patient_code.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || codeMatch;
  });

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-clinic-cream text-black">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-clinic-blue/20 border-t-clinic-blue"></div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-black/60 animate-pulse">
          Loading whiteboard...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-clinic-lightblue/40 via-clinic-beige/30 to-clinic-cream/50 text-black p-4 sm:p-6 lg:p-8 transition-colors duration-200">
      <div className="max-w-[1920px] mx-auto space-y-6">
        
        {/* Main Dashboard Control Header */}
        <header className="bg-clinic-cream/80 rounded-3xl border border-clinic-blue/20 p-5 sm:p-6 shadow-md backdrop-blur-md">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 pb-5 mb-5 border-b border-clinic-blue/10">
            
            {/* Branding */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-clinic-blue text-black shadow-xs shrink-0">
                <Heart size={24} className="fill-black shrink-0" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-black">
                  Hope Physio Whiteboard
                </h1>
                <p className="text-[10px] font-bold text-black/70 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                  <Grid3X3 size={11} /> Digital Whiteboard Scheduler
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-4">
              <div className="bg-clinic-lightblue/20 border border-clinic-blue/30 px-4 py-2 rounded-xl text-left">
                <span className="block text-[9px] font-bold text-black/70 uppercase tracking-wider">Scheduled Patients</span>
                <span className="text-base sm:text-lg font-black text-black flex items-center gap-1">
                  <Users size={14} /> {appointments.length}
                </span>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              {/* Add Patient (Primary Action: clinic-blue) */}
              <button
                onClick={() => handleOpenAddModal('MONDAY', 'MORNING')}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-clinic-blue border border-clinic-blue/40 text-black font-bold text-xs rounded-xl hover:brightness-95 active:scale-[0.98] shadow-sm transition-all duration-150 cursor-pointer shrink-0"
              >
                <Plus size={15} strokeWidth={2.5} /> Add Patient
              </button>

              {/* TV Mode Launch (Secondary Action: clinic-lavender) */}
              <button
                onClick={() => router.push('/smartboard')}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-clinic-lavender border border-clinic-lavender/40 text-black font-bold text-xs rounded-xl hover:brightness-95 active:scale-[0.98] shadow-sm transition-all duration-150 cursor-pointer"
                title="Open Smartboard / TV screen Mode"
              >
                <Tv size={15} /> TV Mode
              </button>

              {/* Refresh (Secondary Action: clinic-lavender) */}
              <button
                onClick={refreshBoard}
                className="flex items-center justify-center p-2.5 bg-clinic-lavender border border-clinic-lavender/40 text-black hover:brightness-95 active:scale-[0.98] shadow-sm rounded-xl transition-all duration-150 cursor-pointer"
                title="Force reload records"
              >
                <RefreshCw size={15} />
              </button>

              {/* Reset Board (Warning Action: clinic-beige-dark border) */}
              <button
                onClick={handleWeeklyReset}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-clinic-beige border border-clinic-beige-dark/45 text-black font-bold text-xs rounded-xl hover:brightness-95 active:scale-[0.98] shadow-sm transition-all duration-150 cursor-pointer"
                title="Clear all patients for the week"
              >
                Reset Board
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-black/40">
                <Search size={15} />
              </span>
              <input
                type="text"
                placeholder="Search patient name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-clinic-blue/30 rounded-xl bg-clinic-cream/20 focus:bg-clinic-cream/40 focus:outline-none focus:ring-2 focus:ring-clinic-blue/20 focus:border-clinic-blue text-xs font-semibold text-black transition-all"
              />
            </div>

          </div>
        </header>

        {/* Six Columns Grid layout representing days Monday to Saturday */}
        <main className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
          {DAYS_OF_WEEK.map((day) => (
            <DayColumn
              key={day}
              day={day}
              appointments={filteredAppointments.filter((a) => a.day_of_week === day)}
              isReadOnly={false}
              onAddPatient={handleOpenAddModal}
              onEditPatient={handleOpenEditModal}
              onDeletePatient={handleDeletePatient}
              onDuplicatePatient={handleDuplicatePatient}
              onMoveAppointment={moveAppointment}
            />
          ))}
        </main>

        {/* Footer info */}
        <footer className="text-center py-4 text-[10px] font-bold text-black/70 uppercase tracking-widest flex items-center justify-center gap-1.5">
          <Calendar size={13} /> {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </footer>

      </div>

      {/* Patient Add/Edit Form Modal */}
      <PatientModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setDuplicateFromApp(null);
        }}
        onSave={handleSavePatient}
        appointment={editingApp}
        duplicateFrom={duplicateFromApp}
        defaultDay={modalDefaultDay}
        defaultBatch={modalDefaultBatch}
      />

    </div>
  );
}
