import React, { useState, useEffect } from 'react';
import { Appointment, DayOfWeek, Batch, Patient, DAYS_OF_WEEK, BATCHES, DAY_LABELS, BATCH_LABELS } from '../lib/types';
import { X, User, Hash, Calendar, Layers, Phone, Search, Trash2 } from 'lucide-react';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    patientId: string | null,
    name: string,
    code: string,
    phone: string,
    slots: Array<{ day: DayOfWeek; batch: Batch }>
  ) => void;
  patients: Patient[];
  onDeleteRegistryPatient: (id: string) => Promise<void>;
  appointment?: Appointment | null; // If present, we edit.
  duplicateFrom?: Appointment | null; // If present, we duplicate.
  defaultDay?: DayOfWeek;
  defaultBatch?: Batch;
}

export const PatientModal: React.FC<PatientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  patients,
  onDeleteRegistryPatient,
  appointment,
  duplicateFrom,
  defaultDay = 'MONDAY',
  defaultBatch = 'MORNING'
}) => {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [day, setDay] = useState<DayOfWeek>('MONDAY');
  const [batch, setBatch] = useState<Batch>('MORNING');
  const [selectedSlots, setSelectedSlots] = useState<Array<{ day: DayOfWeek; batch: Batch }>>([]);
  const [error, setError] = useState('');

  // 1. Reset or populate states when modal opens
  useEffect(() => {
    if (isOpen) {
      if (appointment) {
        setName(appointment.patient_name || '');
        setCode(appointment.patient_code || '');
        setPhone(appointment.patient_phone || '');
        setDay(appointment.day_of_week);
        setBatch(appointment.batch);
        setSelectedSlots([{ day: appointment.day_of_week, batch: appointment.batch }]);
        setSelectedPatientId(appointment.patient_id);
        setMode('new'); // mode doesn't matter much for edit, show form
      } else if (duplicateFrom) {
        setName(duplicateFrom.patient_name || '');
        setCode(duplicateFrom.patient_code || '');
        setPhone(duplicateFrom.patient_phone || '');
        setDay(duplicateFrom.day_of_week);
        setBatch(duplicateFrom.batch);
        setSelectedSlots([{ day: duplicateFrom.day_of_week, batch: duplicateFrom.batch }]);
        setSelectedPatientId(duplicateFrom.patient_id);
        setMode('existing');
      } else {
        setName('');
        setCode('');
        setPhone('');
        setDay(defaultDay);
        setBatch(defaultBatch);
        setSelectedSlots([{ day: defaultDay, batch: defaultBatch }]);
        setSelectedPatientId(null);
        setMode('existing');
        setSearchTerm('');
      }
      setError('');
    }
  }, [isOpen, appointment, duplicateFrom, defaultDay, defaultBatch]);

  // 2. Suggest code tokens when active slot changes, if code is empty
  useEffect(() => {
    if (isOpen && !appointment && !duplicateFrom && !code && mode === 'new') {
      const activeBatch = selectedSlots[0]?.batch || batch;
      const prefix = activeBatch === 'MORNING' ? 'M' : 'E';
      const randomId = Math.floor(Math.random() * 90) + 10;
      setCode(`${prefix}-${randomId}`);
    }
  }, [selectedSlots, isOpen, appointment, duplicateFrom, mode, code, batch]);

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

  const handleSelectPatient = (pat: Patient) => {
    setSelectedPatientId(pat.id);
    setName(pat.name);
    setCode(pat.code);
    setPhone(pat.phone || '');
    setSearchTerm('');
  };

  const handleClearSelection = () => {
    setSelectedPatientId(null);
    setName('');
    setCode('');
    setPhone('');
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
    if (mode === 'existing' && !selectedPatientId && !appointment) {
      setError('Please select a patient from the registry or switch to the "New Patient" tab.');
      return;
    }

    const slotsToSave = appointment ? [{ day, batch }] : selectedSlots;
    if (slotsToSave.length === 0) {
      setError('At least one slot must be selected');
      return;
    }

    onSave(
      (mode === 'existing' && !appointment) ? selectedPatientId : (appointment ? selectedPatientId : null),
      name.trim(),
      code.trim().toUpperCase(),
      phone.trim(),
      slotsToSave
    );
    onClose();
  };

  const filteredRegistry = patients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                : 'Add Patient to Board'
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
            <div className="p-2.5 rounded-xl bg-clinic-beige/30 border border-clinic-beige-dark/45 text-xs font-bold text-black text-center animate-pulse">
              {error}
            </div>
          )}

          {/* Toggle existing vs new patient registry */}
          {!appointment && (
            <div className="flex rounded-xl bg-clinic-lightblue/20 p-1 border border-clinic-blue/15 mb-2">
              <button
                type="button"
                onClick={() => {
                  setMode('existing');
                  handleClearSelection();
                  setError('');
                }}
                className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer text-center
                  ${mode === 'existing'
                    ? 'bg-clinic-blue border border-clinic-blue/20 text-black shadow-xs'
                    : 'text-black/60 hover:text-black hover:bg-clinic-cream/30'
                  }
                `}
              >
                🔍 Search Directory
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('new');
                  handleClearSelection();
                  setError('');
                }}
                className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer text-center
                  ${mode === 'new'
                    ? 'bg-clinic-blue border border-clinic-blue/20 text-black shadow-xs'
                    : 'text-black/60 hover:text-black hover:bg-clinic-cream/30'
                  }
                `}
              >
                ✨ New Patient
              </button>
            </div>
          )}

          {/* Render search screen for existing patient */}
          {mode === 'existing' && !selectedPatientId && !appointment && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-black/70 uppercase tracking-wider mb-1 pl-0.5">
                Search Patient Registry
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-black/40">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  autoFocus
                  placeholder="Type name or token..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-clinic-blue/30 rounded-xl bg-clinic-cream/20 focus:bg-clinic-cream/40 focus:outline-none focus:ring-2 focus:ring-clinic-blue/20 focus:border-clinic-blue text-sm font-semibold text-black transition-all"
                />
              </div>

              {/* Scrollable list of patients */}
              <div className="border border-clinic-blue/20 rounded-xl bg-clinic-cream/10 p-1.5 max-h-48 overflow-y-auto space-y-1">
                {filteredRegistry.length > 0 ? (
                  filteredRegistry.map((pat) => (
                    <div
                      key={pat.id}
                      onClick={() => handleSelectPatient(pat)}
                      className="w-full flex items-center justify-between p-1.5 px-2 rounded-lg hover:bg-clinic-lightblue/30 transition-all cursor-pointer group/item"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="truncate text-xs font-semibold text-black">{pat.name}</span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 bg-clinic-lightblue/40 text-black border border-clinic-lightblue/60 rounded uppercase shrink-0">
                          {pat.code}
                        </span>
                      </div>
                      
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to permanently delete ${pat.name} from the registry? This will remove all their scheduled slots as well.`)) {
                            await onDeleteRegistryPatient(pat.id);
                          }
                        }}
                        className="p-1 rounded-md text-black/45 hover:text-black hover:bg-clinic-beige-dark/30 transition-all cursor-pointer shrink-0 opacity-100 md:opacity-0 md:group-hover/item:opacity-100"
                        title="Delete patient from registry"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-xs font-semibold text-black/50">
                    No patients found in directory.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Render selected/registered patient details or new form inputs */}
          {(mode === 'new' || selectedPatientId || appointment) && (
            <div className="space-y-4 animate-scale-in">
              {mode === 'existing' && selectedPatientId && !appointment && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-clinic-blue/30 bg-clinic-lightblue/10 text-xs text-black font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-clinic-blue text-black font-bold text-[10px]">
                      ✓
                    </span>
                    <div>
                      <span className="block font-bold">Linked to Patient Registry</span>
                      <span className="text-[9px] text-black/60 font-medium">Updates here save globally.</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="px-2.5 py-1 text-[9px] font-black rounded-lg border border-clinic-beige-dark/35 bg-clinic-beige text-black hover:opacity-85 transition-all cursor-pointer"
                  >
                    Change
                  </button>
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
                    autoFocus={mode === 'new' && !appointment}
                    placeholder="Enter patient full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-clinic-blue/30 rounded-xl bg-clinic-cream/20 focus:bg-clinic-cream/40 focus:outline-none focus:ring-2 focus:ring-clinic-blue/20 focus:border-clinic-blue text-sm font-semibold text-black transition-all"
                  />
                </div>
              </div>

              {/* Patient Token Code and Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-black/70 uppercase tracking-wider mb-1 pl-0.5">
                    Token / Code *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-black/40">
                      <Hash size={15} />
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. M-01"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-clinic-blue/30 rounded-xl bg-clinic-cream/20 focus:bg-clinic-cream/40 focus:outline-none focus:ring-2 focus:ring-clinic-blue/20 focus:border-clinic-blue text-sm font-semibold text-black transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black/70 uppercase tracking-wider mb-1 pl-0.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-black/40">
                      <Phone size={15} />
                    </span>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-clinic-blue/30 rounded-xl bg-clinic-cream/20 focus:bg-clinic-cream/40 focus:outline-none focus:ring-2 focus:ring-clinic-blue/20 focus:border-clinic-blue text-sm font-semibold text-black transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

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
