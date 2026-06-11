import React, { useState, useEffect } from 'react';
import { Appointment, DayOfWeek, Batch, DAYS_OF_WEEK, BATCHES, DAY_LABELS, BATCH_LABELS } from '../lib/types';
import { X, User, Hash, Calendar, Layers } from 'lucide-react';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, code: string, slots: Array<{ day: DayOfWeek; batch: Batch }>) => void;
  appointment?: Appointment | null; // If present, we edit.
  duplicateFrom?: Appointment | null; // If present, we duplicate.
  defaultDay?: DayOfWeek;
  defaultBatch?: Batch;
}

export const PatientModal: React.FC<PatientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  appointment,
  duplicateFrom,
  defaultDay = 'MONDAY',
  defaultBatch = 'MORNING'
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [day, setDay] = useState<DayOfWeek>('MONDAY');
  const [batch, setBatch] = useState<Batch>('MORNING');
  const [selectedSlots, setSelectedSlots] = useState<Array<{ day: DayOfWeek; batch: Batch }>>([]);
  const [error, setError] = useState('');

  // 1. Reset or populate states when modal opens
  useEffect(() => {
    if (isOpen) {
      if (appointment) {
        setName(appointment.patient_name);
        setCode(appointment.patient_code);
        setDay(appointment.day_of_week);
        setBatch(appointment.batch);
        setSelectedSlots([{ day: appointment.day_of_week, batch: appointment.batch }]);
      } else if (duplicateFrom) {
        setName(duplicateFrom.patient_name);
        setCode(duplicateFrom.patient_code);
        setDay(duplicateFrom.day_of_week);
        setBatch(duplicateFrom.batch);
        setSelectedSlots([{ day: duplicateFrom.day_of_week, batch: duplicateFrom.batch }]);
      } else {
        setName('');
        setCode('');
        setDay(defaultDay);
        setBatch(defaultBatch);
        setSelectedSlots([{ day: defaultDay, batch: defaultBatch }]);
      }
      setError('');
    }
  }, [isOpen, appointment, duplicateFrom, defaultDay, defaultBatch]);

  // 2. Suggest code tokens when active slot changes, if code is empty
  useEffect(() => {
    if (isOpen && !appointment && !duplicateFrom && !code) {
      const activeBatch = selectedSlots[0]?.batch || batch;
      const prefix = activeBatch === 'MORNING' ? 'M' : 'E';
      const randomId = Math.floor(Math.random() * 90) + 10;
      setCode(`${prefix}-${randomId}`);
    }
  }, [selectedSlots, isOpen, appointment, duplicateFrom]);

  if (!isOpen) return null;

  // Toggle slot helper for multi-day selector
  const toggleSlot = (d: DayOfWeek, b: Batch) => {
    setSelectedSlots((prev) => {
      const exists = prev.some((s) => s.day === d && s.batch === b);
      if (exists) {
        if (prev.length <= 1) {
          setError('At least one slot must be selected');
          return prev;
        }
        setError('');
        return prev.filter((s) => !(s.day === d && s.batch === b));
      } else {
        setError('');
        return [...prev, { day: d, batch: b }];
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Patient name is required');
      return;
    }
    if (!code.trim()) {
      setError('Patient token/code is required');
      return;
    }

    const slotsToSave = appointment ? [{ day, batch }] : selectedSlots;
    if (slotsToSave.length === 0) {
      setError('At least one slot must be selected');
      return;
    }

    onSave(name.trim(), code.trim().toUpperCase(), slotsToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-fade-in">
      {/* Background overlay click-to-close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog box */}
      <div className="relative w-full max-w-md rounded-2xl bg-clinic-cream p-6 shadow-xl border border-clinic-blue/35 animate-scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-clinic-blue/20">
          <h2 className="text-xl font-black text-black">
            {appointment 
              ? 'Edit Patient Details' 
              : duplicateFrom 
                ? 'Duplicate Patient' 
                : 'Add New Patient'
            }
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-black/50 hover:bg-clinic-blue/10 hover:text-black transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-clinic-beige/30 border border-clinic-beige-dark/45 text-xs font-bold text-black text-center">
              {error}
            </div>
          )}

          {/* Patient Name */}
          <div>
            <label className="block text-xs font-bold text-black/70 uppercase tracking-wider mb-1 pl-0.5">
              Patient Name *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-black/40">
                <User size={15} />
              </span>
              <input
                type="text"
                autoFocus
                placeholder="Enter patient full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-clinic-blue/30 rounded-xl bg-clinic-cream/20 focus:bg-clinic-cream/40 focus:outline-none focus:ring-2 focus:ring-clinic-blue/20 focus:border-clinic-blue text-sm font-semibold text-black transition-all"
              />
            </div>
          </div>

          {/* Patient Code / Token */}
          <div>
            <label className="block text-xs font-bold text-black/70 uppercase tracking-wider mb-1 pl-0.5">
              Patient Token / Code *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-black/40">
                <Hash size={15} />
              </span>
              <input
                type="text"
                placeholder="e.g. M-01 or E-12"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-clinic-blue/30 rounded-xl bg-clinic-cream/20 focus:bg-clinic-cream/40 focus:outline-none focus:ring-2 focus:ring-clinic-blue/20 focus:border-clinic-blue text-sm font-semibold text-black transition-all"
              />
            </div>
          </div>

          {/* Scheduling slots selector */}
          {appointment ? (
            /* Edit Mode: Simple side-by-side dropdown selectors */
            <div className="grid grid-cols-2 gap-4">
              {/* Day */}
              <div>
                <label className="block text-xs font-bold text-black/70 uppercase tracking-wider mb-1 pl-0.5">
                  Day
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-black/40">
                    <Calendar size={15} />
                  </span>
                  <select
                    value={day}
                    onChange={(e) => setDay(e.target.value as DayOfWeek)}
                    className="w-full pl-9 pr-3 py-2 border border-clinic-blue/30 rounded-xl bg-clinic-cream/20 focus:bg-clinic-cream/40 focus:outline-none focus:ring-2 focus:ring-clinic-blue/20 focus:border-clinic-blue text-xs font-bold text-black transition-all cursor-pointer"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>
                        {DAY_LABELS[d]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Batch */}
              <div>
                <label className="block text-xs font-bold text-black/70 uppercase tracking-wider mb-1 pl-0.5">
                  Batch
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-black/40">
                    <Layers size={15} />
                  </span>
                  <select
                    value={batch}
                    onChange={(e) => setBatch(e.target.value as Batch)}
                    className="w-full pl-9 pr-3 py-2 border border-clinic-blue/30 rounded-xl bg-clinic-cream/20 focus:bg-clinic-cream/40 focus:outline-none focus:ring-2 focus:ring-clinic-blue/20 focus:border-clinic-blue text-xs font-bold text-black transition-all cursor-pointer"
                  >
                    {BATCHES.map((b) => (
                      <option key={b} value={b}>
                        {BATCH_LABELS[b]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            /* Add / Duplicate Mode: Grid of toggle slots */
            <div className="border border-clinic-blue/20 rounded-xl p-3 bg-clinic-cream/10">
              <label className="block text-xs font-bold text-black/70 uppercase tracking-wider mb-2 pl-0.5">
                Schedule Slots (Select all that apply)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DAYS_OF_WEEK.map((d) => {
                  const isMorningSelected = selectedSlots.some((s) => s.day === d && s.batch === 'MORNING');
                  const isEveningSelected = selectedSlots.some((s) => s.day === d && s.batch === 'EVENING');

                  return (
                    <div key={d} className="space-y-1">
                      <span className="block text-[10px] font-bold text-black/70 uppercase tracking-wider text-center border-b border-clinic-blue/10 pb-0.5">
                        {DAY_LABELS[d].substring(0, 3)}
                      </span>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => toggleSlot(d, 'MORNING')}
                          className={`py-1.5 px-1 text-[10px] font-black rounded-lg border transition-all cursor-pointer text-center
                            ${isMorningSelected
                              ? 'bg-clinic-blue border-clinic-blue/40 text-black shadow-xs'
                              : 'bg-clinic-cream/20 border-clinic-blue/15 text-black/70 hover:bg-clinic-cream/40'
                            }
                          `}
                        >
                          ☀️ Morn
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSlot(d, 'EVENING')}
                          className={`py-1.5 px-1 text-[10px] font-black rounded-lg border transition-all cursor-pointer text-center
                            ${isEveningSelected
                              ? 'bg-clinic-lavender border-clinic-lavender/40 text-black shadow-xs'
                              : 'bg-clinic-cream/20 border-clinic-blue/15 text-black/70 hover:bg-clinic-cream/40'
                            }
                          `}
                        >
                          🌙 Eve
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-clinic-blue/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-clinic-lavender/40 rounded-xl text-sm font-bold text-black bg-clinic-lavender hover:opacity-85 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-sm font-bold text-black bg-clinic-blue hover:opacity-85 transition-all border border-clinic-blue/40 cursor-pointer"
            >
              {appointment 
                ? 'Save Changes' 
                : duplicateFrom 
                  ? 'Create Duplicate' 
                  : 'Schedule Patient'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
