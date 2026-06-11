import React, { useState, useEffect } from 'react';
import { useBoardState } from '../lib/useBoardState';
import { DayColumn } from './DayColumn';
import { DAYS_OF_WEEK } from '../lib/types';
import { Maximize2, Minimize2, Tv, Clock } from 'lucide-react';

export const SmartboardMode: React.FC = () => {
  const { appointments, loading } = useBoardState();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // 1. Digital Clock for TV
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Toggle Browser Native Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-clinic-cream text-black">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-clinic-blue/20 border-t-clinic-blue"></div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-black/60 animate-pulse">
          Loading smartboard display...
        </p>
      </div>
    );
  }

  const dateString = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen p-6 bg-gradient-to-tr from-clinic-lightblue/40 via-clinic-beige/30 to-clinic-cream/50 text-black font-sans">
      <div className="max-w-[1920px] mx-auto space-y-6">
        
        {/* TV Mode Header Panel */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-clinic-blue/20 bg-clinic-cream/80 shadow-md backdrop-blur-md">
          {/* Logo and Status */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-clinic-blue text-black shadow-xs shrink-0">
              <Tv size={26} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-black">
                ScheduleCare Board
              </h1>
              <p className="text-[10px] font-bold text-black/70 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                <span className="h-2 w-2 rounded-full bg-clinic-blue animate-ping"></span> Live Waiting Room Display
              </p>
            </div>
          </div>

          {/* Time and Date display */}
          <div className="flex items-center gap-4 text-center md:text-right">
            <div className="hidden sm:block">
              <span className="block text-xs font-bold text-black/70 uppercase tracking-wider">
                {dateString}
              </span>
              <span className="text-sm font-semibold text-black/70">
                Physiotherapy Scheduling Whiteboard
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-clinic-blue/30 bg-clinic-lightblue/20 font-mono text-lg font-black text-black">
              <Clock size={16} />
              {currentTime}
            </div>
          </div>

          {/* Settings Tray (Fullscreen button using primary color) */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl border border-clinic-blue bg-clinic-blue text-black font-bold text-xs uppercase tracking-wider transition-all hover:opacity-85 cursor-pointer"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 size={14} /> Exit Fullscreen
                </>
              ) : (
                <>
                  <Maximize2 size={14} /> Go Fullscreen
                </>
              )}
            </button>
          </div>
        </header>

        {/* Six Columns Display Grid (Large, read-only) */}
        <main className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
          {DAYS_OF_WEEK.map((day) => (
            <DayColumn
              key={day}
              day={day}
              appointments={appointments.filter((a) => a.day_of_week === day)}
              isReadOnly={true}
              onAddPatient={() => {}}
              onEditPatient={() => {}}
              onDeletePatient={() => {}}
              onDuplicatePatient={() => {}}
              onMoveAppointment={() => {}}
            />
          ))}
        </main>

        <footer className="text-center py-2 text-[10px] font-bold text-black/70 uppercase tracking-widest">
          ScheduleCare Display Mode • Auto-updates in real-time
        </footer>

      </div>
    </div>
  );
};
