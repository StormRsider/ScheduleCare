import React, { useState } from 'react';
import { Appointment } from '../lib/types';
import { Edit2, Trash2, GripVertical, Copy } from 'lucide-react';

interface PatientCardProps {
  appointment: Appointment;
  isReadOnly: boolean;
  colorKey: 'clinic-blue' | 'clinic-lavender' | 'clinic-lightblue' | 'clinic-beige' | 'clinic-cream';
  onEdit: (appointment: Appointment) => void;
  onDelete: (id: string) => void;
  onDuplicate: (appointment: Appointment) => void;
}

const cardStyles = {
  'clinic-blue': {
    bg: 'bg-clinic-blue/10 hover:bg-clinic-blue/15',
    border: 'border-clinic-blue/50 hover:border-clinic-blue',
    badge: 'bg-clinic-blue/30 border border-clinic-blue/60 text-black'
  },
  'clinic-lavender': {
    bg: 'bg-clinic-lavender/10 hover:bg-clinic-lavender/15',
    border: 'border-clinic-lavender/50 hover:border-clinic-lavender',
    badge: 'bg-clinic-lavender/30 border border-clinic-lavender/60 text-black'
  },
  'clinic-lightblue': {
    bg: 'bg-clinic-lightblue/10 hover:bg-clinic-lightblue/15',
    border: 'border-clinic-lightblue/50 hover:border-clinic-lightblue',
    badge: 'bg-clinic-lightblue/30 border border-clinic-lightblue/60 text-black'
  },
  'clinic-beige': {
    bg: 'bg-clinic-beige/10 hover:bg-clinic-beige/15',
    border: 'border-clinic-beige/50 hover:border-clinic-beige',
    badge: 'bg-clinic-beige/30 border border-clinic-beige/60 text-black'
  },
  'clinic-cream': {
    bg: 'bg-clinic-cream/20 hover:bg-clinic-cream/30',
    border: 'border-clinic-cream/80 hover:border-clinic-cream',
    badge: 'bg-clinic-cream/60 border border-clinic-cream/90 text-black'
  }
};

export const PatientCard: React.FC<PatientCardProps> = ({
  appointment,
  isReadOnly,
  colorKey,
  onEdit,
  onDelete,
  onDuplicate
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', appointment.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
    setTimeout(() => {
      const target = e.target as HTMLElement;
      if (target) target.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
    const target = e.target as HTMLElement;
    if (target) target.style.opacity = '1';
  };

  const styles = cardStyles[colorKey] || cardStyles['clinic-blue'];

  return (
    <div
      draggable={!isReadOnly}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`group relative flex items-center justify-between rounded-xl border transition-all duration-200 shadow-xs
        ${isReadOnly 
          ? 'cursor-default px-2.5 py-1.5' 
          : 'cursor-grab active:cursor-grabbing hover:-translate-y-0.5 px-3.5 py-3'
        }
        ${styles.bg} ${styles.border}
      `}
    >
      {/* Patient Code and Name Layout */}
      <div className="flex items-center gap-2.5 min-w-0">
        {!isReadOnly && (
          <span className="text-black opacity-30 cursor-grab shrink-0">
            <GripVertical size={16} />
          </span>
        )}
        <div className="flex items-baseline gap-2.5 min-w-0">
          {/* Patient Code / Token */}
          <span className={`font-black tracking-wider rounded-md uppercase shrink-0 ${styles.badge}
            ${isReadOnly ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'}
          `}>
            {appointment.patient_code}
          </span>
          {/* Patient Name */}
          <span className={`font-bold text-black truncate ${isReadOnly ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'}`}>
            {appointment.patient_name}
          </span>
        </div>
      </div>

      {/* Edit/Duplicate/Delete Actions (Hidden in Read-Only Mode) */}
      {!isReadOnly && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
          {/* Duplicate Action */}
          <button
            onClick={() => onDuplicate(appointment)}
            className="p-1 rounded-lg text-black/70 hover:text-black hover:bg-clinic-blue/20 hover:brightness-95 active:scale-[0.98] transition-all cursor-pointer"
            title="Duplicate patient"
          >
            <Copy size={13} />
          </button>
          {/* Edit Action */}
          <button
            onClick={() => onEdit(appointment)}
            className="p-1 rounded-lg text-black/70 hover:text-black hover:bg-clinic-lavender/20 hover:brightness-95 active:scale-[0.98] transition-all cursor-pointer"
            title="Edit patient"
          >
            <Edit2 size={13} />
          </button>
          {/* Delete Action (Soft Beige derived styling) */}
          <button
            onClick={() => onDelete(appointment.id)}
            className="p-1 rounded-lg text-black/70 hover:text-black hover:bg-clinic-beige-dark/30 hover:brightness-95 active:scale-[0.98] transition-all cursor-pointer"
            title="Delete patient"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
};
