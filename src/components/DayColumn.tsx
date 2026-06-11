import React, { useState } from 'react';
import { Appointment, DayOfWeek, Batch, DAY_LABELS, BATCH_LABELS } from '../lib/types';
import { PatientCard } from './PatientCard';
import { Plus, Sun, Moon } from 'lucide-react';

interface DayColumnProps {
  day: DayOfWeek;
  appointments: Appointment[];
  isReadOnly: boolean;
  onAddPatient: (day: DayOfWeek, batch: Batch) => void;
  onEditPatient: (appointment: Appointment) => void;
  onDeletePatient: (id: string) => void;
  onDuplicatePatient: (appointment: Appointment) => void;
  onMoveAppointment: (id: string, day: DayOfWeek, batch: Batch, position?: number) => void;
}

// Strictly map Monday-Saturday to one design system variable per day
const dayColors: Record<
  DayOfWeek,
  {
    key: 'clinic-blue' | 'clinic-lavender' | 'clinic-lightblue' | 'clinic-beige' | 'clinic-cream';
    border: string;
    bg: string;
    borderLight: string;
    borderDragOver: string;
    emptyBorder: string;
    batchBg: string;
    dragOverClass: string;
  }
> = {
  MONDAY: {
    key: 'clinic-blue',
    border: 'border-t-clinic-blue border-clinic-blue/20',
    bg: 'bg-clinic-blue/5',
    borderLight: 'border-clinic-blue/15',
    borderDragOver: 'border-clinic-blue',
    emptyBorder: 'border-clinic-blue/25',
    batchBg: 'bg-clinic-blue/5',
    dragOverClass: 'bg-clinic-blue/15 border-clinic-blue/40 border-dashed'
  },
  TUESDAY: {
    key: 'clinic-lavender',
    border: 'border-t-clinic-lavender border-clinic-lavender/20',
    bg: 'bg-clinic-lavender/5',
    borderLight: 'border-clinic-lavender/15',
    borderDragOver: 'border-clinic-lavender',
    emptyBorder: 'border-clinic-lavender/25',
    batchBg: 'bg-clinic-lavender/5',
    dragOverClass: 'bg-clinic-lavender/15 border-clinic-lavender/40 border-dashed'
  },
  WEDNESDAY: {
    key: 'clinic-lightblue',
    border: 'border-t-clinic-lightblue border-clinic-lightblue/20',
    bg: 'bg-clinic-lightblue/5',
    borderLight: 'border-clinic-lightblue/15',
    borderDragOver: 'border-clinic-lightblue',
    emptyBorder: 'border-clinic-lightblue/25',
    batchBg: 'bg-clinic-lightblue/5',
    dragOverClass: 'bg-clinic-lightblue/15 border-clinic-lightblue/40 border-dashed'
  },
  THURSDAY: {
    key: 'clinic-beige',
    border: 'border-t-clinic-beige border-clinic-beige/20',
    bg: 'bg-clinic-beige/5',
    borderLight: 'border-clinic-beige/15',
    borderDragOver: 'border-clinic-beige',
    emptyBorder: 'border-clinic-beige/25',
    batchBg: 'bg-clinic-beige/5',
    dragOverClass: 'bg-clinic-beige/15 border-clinic-beige/40 border-dashed'
  },
  FRIDAY: {
    key: 'clinic-cream',
    border: 'border-t-clinic-cream border-clinic-cream/50',
    bg: 'bg-clinic-cream/10',
    borderLight: 'border-clinic-cream/30',
    borderDragOver: 'border-clinic-cream',
    emptyBorder: 'border-clinic-cream/40',
    batchBg: 'bg-clinic-cream/10',
    dragOverClass: 'bg-clinic-cream/25 border-clinic-cream/50 border-dashed'
  },
  SATURDAY: {
    key: 'clinic-blue',
    border: 'border-t-clinic-blue border-clinic-blue/20',
    bg: 'bg-clinic-blue/5',
    borderLight: 'border-clinic-blue/15',
    borderDragOver: 'border-clinic-blue',
    emptyBorder: 'border-clinic-blue/25',
    batchBg: 'bg-clinic-blue/5',
    dragOverClass: 'bg-clinic-blue/15 border-clinic-blue/40 border-dashed'
  }
};

export const DayColumn: React.FC<DayColumnProps> = ({
  day,
  appointments,
  isReadOnly,
  onAddPatient,
  onEditPatient,
  onDeletePatient,
  onDuplicatePatient,
  onMoveAppointment
}) => {
  const [activeDragBatch, setActiveDragBatch] = useState<Batch | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);

  // Group and sort appointments by position
  const morningApps = appointments
    .filter((a) => a.batch === 'MORNING')
    .sort((a, b) => a.position - b.position);

  const eveningApps = appointments
    .filter((a) => a.batch === 'EVENING')
    .sort((a, b) => a.position - b.position);

  // Drag handlers for the batch container
  const handleDragOverBatch = (e: React.DragEvent, batch: Batch) => {
    e.preventDefault();
    if (isReadOnly) return;
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnterBatch = (e: React.DragEvent, batch: Batch) => {
    e.preventDefault();
    if (isReadOnly) return;
    setActiveDragBatch(batch);
  };

  const handleDragLeaveBatch = (batch: Batch) => {
    if (activeDragBatch === batch) {
      setActiveDragBatch(null);
    }
  };

  const handleDropBatch = (e: React.DragEvent, batch: Batch) => {
    e.preventDefault();
    setActiveDragBatch(null);
    if (isReadOnly) return;

    const appointmentId = e.dataTransfer.getData('text/plain');
    if (appointmentId) {
      onMoveAppointment(appointmentId, day, batch);
    }
  };

  // Drag handlers for reordering slots
  const handleDragOverCard = (e: React.DragEvent, cardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (isReadOnly) return;
    setDragOverCardId(cardId);
  };

  const handleDragLeaveCard = () => {
    setDragOverCardId(null);
  };

  const handleDropCard = (e: React.DragEvent, batch: Batch, targetPosition: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCardId(null);
    setActiveDragBatch(null);
    if (isReadOnly) return;

    const appointmentId = e.dataTransfer.getData('text/plain');
    if (appointmentId) {
      onMoveAppointment(appointmentId, day, batch, targetPosition);
    }
  };

  const colorScheme = dayColors[day] || dayColors['MONDAY'];

  const renderBatchSection = (batch: Batch, apps: Appointment[]) => {
    const isMorning = batch === 'MORNING';
    const isDragOver = activeDragBatch === batch;

    return (
      <div
        onDragOver={(e) => handleDragOverBatch(e, batch)}
        onDragEnter={(e) => handleDragEnterBatch(e, batch)}
        onDragLeave={() => handleDragLeaveBatch(batch)}
        onDrop={(e) => handleDropBatch(e, batch)}
        className={`flex-1 flex flex-col rounded-xl p-2.5 transition-all duration-200 min-h-[160px] border border-transparent
          ${isDragOver
            ? colorScheme.dragOverClass
            : colorScheme.batchBg
          }
        `}
      >
        {/* Batch Header */}
        <div className={`flex items-center justify-between mb-2 pb-1.5 border-b ${colorScheme.borderLight}`}>
          <div className="flex items-center gap-1.5">
            {isMorning 
              ? <Sun size={14} className="text-black/70" /> 
              : <Moon size={14} className="text-black/70" />
            }
            <span className="text-[11px] font-black uppercase tracking-wider text-black/70">
              {BATCH_LABELS[batch]} ({apps.length})
            </span>
          </div>

          {/* Add Button */}
          {!isReadOnly && (
            <button
              onClick={() => onAddPatient(day, batch)}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded bg-clinic-blue hover:opacity-85 text-black transition-all border border-clinic-blue/30"
              title={`Add patient to ${DAY_LABELS[day]} ${batch.toLowerCase()}`}
            >
              <Plus size={12} strokeWidth={3} />
            </button>
          )}
        </div>

        {/* Cards Container */}
        <div className={`flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar ${isReadOnly ? '' : 'max-h-[320px]'}`}>
          {apps.length > 0 ? (
            apps.map((app, index) => {
              const isOver = dragOverCardId === app.id;
              return (
                <div
                  key={app.id}
                  onDragOver={(e) => handleDragOverCard(e, app.id)}
                  onDragLeave={handleDragLeaveCard}
                  onDrop={(e) => handleDropCard(e, batch, index)}
                  className={`transition-all duration-150 ${isOver ? `border-t-4 ${colorScheme.borderDragOver} pt-2` : ''}`}
                >
                  <PatientCard
                    appointment={app}
                    isReadOnly={isReadOnly}
                    colorKey={colorScheme.key}
                    onEdit={onEditPatient}
                    onDelete={onDeletePatient}
                    onDuplicate={onDuplicatePatient}
                  />
                </div>
              );
            })
          ) : (
            <div className={`flex-1 flex flex-col items-center justify-center border border-dashed ${colorScheme.emptyBorder} rounded-xl p-3 text-center text-black/70 min-h-[90px]`}>
              <span className="text-[10px] font-bold uppercase tracking-wider">Empty Batch</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col bg-white border border-t-4 ${colorScheme.border} ${colorScheme.bg} rounded-2xl p-3 shadow-xs hover:shadow-sm transition-all duration-200 min-h-[420px] select-none`}>
      {/* Column Title */}
      <div className={`mb-3.5 pb-2.5 border-b ${colorScheme.borderLight}`}>
        <h3 className="text-lg font-black text-black">
          {DAY_LABELS[day]}
        </h3>
        <p className="text-[10px] font-bold text-black/70 uppercase tracking-widest mt-0.5">
          {appointments.length} Total Patients
        </p>
      </div>

      {/* Batches Layout */}
      <div className="flex-1 flex flex-col gap-3.5">
        {renderBatchSection('MORNING', morningApps)}
        {renderBatchSection('EVENING', eveningApps)}
      </div>
    </div>
  );
};
