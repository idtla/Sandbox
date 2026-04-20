import React, { useState, useEffect } from 'react';
import { Moon, Sun, User, Baby, X, Play, Square, Check, Clock, BarChart2, PlusCircle, MinusCircle, Home, Activity, Calendar, Droplets, Brain } from 'lucide-react';

export default function App() {
  const [appState, setAppState] = useState('idle');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [caregiver, setCaregiver] = useState('Mamá');
  const [method, setMethod] = useState('Acunada');
  
  const [tryStartTime, setTryStartTime] = useState(null);
  const [sleepStartTime, setSleepStartTime] = useState(null);
  const [timeToSleep, setTimeToSleep] = useState(0);
  const [currentElapsed, setCurrentElapsed] = useState(0);
  
  const [lastWakeTime, setLastWakeTime] = useState(Date.now() - (90 * 60 * 1000));
  const [now, setNow] = useState(Date.now());

  const [history, setHistory] = useState([
    { id: 1, caregiver: 'Mamá', method: 'En cuna', timeToSleep: 12 * 60, duration: 90 * 60, date: 'Hoy', day: 'Vie' },
    { id: 2, caregiver: 'Papá', method: 'Acunada', timeToSleep: 18 * 60, duration: 45 * 60, date: 'Hoy', day: 'Vie' },
    { id: 3, caregiver: 'Mamá', method: 'En cuna', timeToSleep: 15 * 60, duration: 580 * 60, date: 'Anoche', day: 'Jue' },
    { id: 4, caregiver: 'Papá', method: 'En cuna', timeToSleep: 25 * 60, duration: 410 * 60, date: 'Ayer', day: 'Jue' },
    { id: 5, caregiver: 'Mamá', method: 'Acunada', timeToSleep: 28 * 60, duration: 160 * 60, date: 'Ayer', day: 'Mié' },
    { id: 6, caregiver: 'Papá', method: 'Acunada', timeToSleep: 35 * 60, duration: 500 * 60, date: 'Ayer', day: 'Mié' },
    { id: 7, caregiver: 'Mamá', method: 'En cuna', timeToSleep: 10 * 60, duration: 600 * 60, date: 'Ayer', day: 'Mar' },
    { id: 8, caregiver: 'Papá', method: 'En cuna', timeToSleep: 40 * 60, duration: 300 * 60, date: 'Ayer', day: 'Lun' },
  ]);

  const [manualTTS, setManualTTS] = useState(15);
  const [manualDuration, setManualDuration] = useState(120);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatHoursMins = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  useEffect(() => {
    let interval = null;
    if (appState === 'trying') {
      interval = setInterval(() => setCurrentElapsed(Math.floor((Date.now() - tryStartTime) / 1000)), 1000);
    } else if (appState === 'sleeping') {
      interval = setInterval(() => setCurrentElapsed(Math.floor((Date.now() - sleepStartTime) / 1000)), 1000);
    } else {
      clearInterval(interval);
      setCurrentElapsed(0);
    }
    return () => clearInterval(interval);
  }, [appState, tryStartTime, sleepStartTime]);

  const handleStartTrying = () => { setTryStartTime(Date.now()); setAppState('trying'); };
  const handleFallAsleep = () => { setTimeToSleep(Math.floor((Date.now() - tryStartTime) / 1000)); setSleepStartTime(Date.now()); setAppState('sleeping'); };
  const handleCancel = () => { setAppState('idle'); setTryStartTime(null); };
  
  const handleWakeUp = () => {
    const totalSleep = Math.floor((Date.now() - sleepStartTime) / 1000);
    const newSession = { id: Date.now(), caregiver, method, timeToSleep, duration: totalSleep, date: 'Hoy', day: 'Vie' };
    setHistory([newSession, ...history]);
    setAppState('idle'); setTryStartTime(null); setSleepStartTime(null); setTimeToSleep(0); setLastWakeTime(Date.now());
  };

  const handleSaveManual = () => {
    const newSession = { id: Date.now(), caregiver, method, timeToSleep: manualTTS * 60, duration: manualDuration * 60, date: 'Manual', day: 'Vie' };
    setHistory([newSession, ...history]);
    setActiveTab('dashboard'); 
  };

  // UI Components (Re-styled for Light Clean UI)
  const SegmentedControl = ({ options, selected, onChange }) => (
    <div className="flex bg-slate-100 p-1 rounded-xl w-full">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          disabled={appState !== 'idle'}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
            selected === opt
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          } ${appState !== 'idle' ? 'opacity-40' : ''}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  const ProgressBar = ({ label, value, max, colorClass, format = 'm' }) => (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between text-xs items-center">
        <span className="text-slate-500 font-medium">{label}</span>
        <span className="text-slate-800 font-semibold">{value}{format}</span>
      </div>
      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorClass} transition-all duration-1000 ease-out`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
    </div>
  );

  // DASHBOARD CALCULATIONS
  const todaySleepSeconds = history.filter(s => s.date === 'Hoy' || s.date === 'Ahora').reduce((acc, curr) => acc + curr.duration, 0) + (appState === 'sleeping' ? currentElapsed : 0);
  const lastNightSeconds = history.filter(s => s.date === 'Anoche').reduce((acc, curr) => acc + curr.duration, 0);
  
  const targetWindowMins = 150;
  const minsAwake = appState === 'idle' ? Math.floor((now - lastWakeTime) / 60000) : 0;
  const minsRemaining = targetWindowMins - minsAwake;
  const windowWarning = minsRemaining <= 30; 
  
  const todayTTSAvg = history.filter(s => s.date === 'Hoy').reduce((acc, curr) => acc + curr.timeToSleep, 0) / (history.filter(s => s.date === 'Hoy').length || 1);
  const targetDailySleepSeconds = 14 * 3600; 
  const ttsPenalty = Math.max(0, (todayTTSAvg - (15 * 60)) / 60) * 1.5; 
  const durationScore = Math.min(100, (todaySleepSeconds / targetDailySleepSeconds) * 100);
  const sleepQuality = Math.max(0, Math.min(100, 85 + (durationScore * 0.15) - ttsPenalty)); 

  // SVG Gauge Math
  const radius = 95;
  const strokeWidth = 6;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (sleepQuality / 100) * circumference;

  // STATS CALCULATIONS
  const avgMamaTTS = Math.round(history.filter(s => s.caregiver === 'Mamá').reduce((a,b)=>a+b.timeToSleep,0)/(history.filter(s=>s.caregiver==='Mamá').length||1)/60);
  const avgPapaTTS = Math.round(history.filter(s => s.caregiver === 'Papá').reduce((a,b)=>a+b.timeToSleep,0)/(history.filter(s=>s.caregiver==='Papá').length||1)/60);
  const avgAcunadaTTS = Math.round(history.filter(s => s.method === 'Acunada').reduce((a,b)=>a+b.timeToSleep,0)/(history.filter(s=>s.method==='Acunada').length||1)/60);
  const avgCunaTTS = Math.round(history.filter(s => s.method === 'En cuna').reduce((a,b)=>a+b.timeToSleep,0)/(history.filter(s=>s.method==='En cuna').length||1)/60);

  const mockWeeklyData = [
    { day: 'L', duration: 12.5, tts: 25 },
    { day: 'M', duration: 13.2, tts: 18 },
    { day: 'X', duration: 11.8, tts: 35 },
    { day: 'J', duration: 14.1, tts: 15 },
    { day: 'V', duration: (todaySleepSeconds/3600).toFixed(1), tts: Math.round(todayTTSAvg/60) },
    { day: 'S', duration: 0, tts: 0 },
    { day: 'D', duration: 0, tts: 0 },
  ];

  return (
    // Fondo Icy Light Grey
    <div className="min-h-screen bg-[#F4F7FB] text-slate-800 font-sans flex flex-col items-center select-none max-w-md mx-auto relative pb-24 shadow-2xl overflow-hidden">
      
      {/* Decorative Background Blobs */}
      <div className="absolute top-[-10%] left-[-20%] w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-72 h-72 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

      {/* --- VISTA: DASHBOARD --- */}
      {activeTab === 'dashboard' && (
        <div className="flex flex-col w-full p-6 pt-10 space-y-6 min-h-[calc(100vh-6rem)] animate-in fade-in duration-500 z-10">
          
          {/* Header */}
          <div className="flex justify-between items-center w-full mb-2">
            <div className="flex flex-col">
              <span className="text-slate-400 font-medium text-xs tracking-wider uppercase mb-1 flex items-center gap-1">
                <Activity size={12} className="text-blue-500" /> Resumen Diario
              </span>
              <h1 className="text-slate-800 text-3xl font-semibold tracking-tight">¡Hola, {caregiver}!</h1>
            </div>
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
              <Baby className="text-blue-500" size={20} />
            </div>
          </div>

          {/* MAIN CIRCULAR GAUGE - LIGHT MODE */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full flex flex-col items-center relative">
            <div className="w-full flex justify-between items-center absolute top-6 px-6">
               <span className="text-slate-800 font-medium text-sm">Calidad de Sueño</span>
               <span className="text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">Óptima</span>
            </div>

            <div className="relative w-full flex justify-center py-8 mt-4">
              <svg height={radius * 2} width={radius * 2} className="-rotate-90 drop-shadow-md">
                <circle stroke="#F1F5F9" fill="transparent" strokeWidth={strokeWidth} r={normalizedRadius} cx={radius} cy={radius} strokeLinecap="round" />
                <circle stroke="#3B82F6" fill="transparent" strokeWidth={strokeWidth} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset, transition: 'stroke-dashoffset 1.5s ease-in-out' }} r={normalizedRadius} cx={radius} cy={radius} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-4">
                <div className="flex items-baseline">
                  <span className="text-6xl font-bold tracking-tighter text-slate-800">{Math.round(sleepQuality)}</span>
                  <span className="text-lg font-medium text-slate-400 ml-1">%</span>
                </div>
                <span className="text-[10px] font-medium tracking-widest mt-1 uppercase text-blue-500">Score</span>
              </div>
            </div>
          </div>

          {/* METRICS GRID */}
          <div className="grid grid-cols-2 gap-4 w-full">
            
            <div className="bg-white rounded-3xl p-5 flex flex-col justify-between h-36 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
              <div className="flex justify-between items-start z-10">
                <span className="text-slate-500 text-xs font-medium">Sueño Hoy</span>
                <div className="bg-blue-50 p-2 rounded-full"><Moon size={14} className="text-blue-500" /></div>
              </div>
              <div className="flex flex-col z-10 mt-2">
                <span className="text-3xl font-semibold text-slate-800">{formatHoursMins(todaySleepSeconds)}</span>
                <span className="text-emerald-500 text-[10px] font-medium mt-1 flex items-center gap-1">↑ En progreso</span>
              </div>
              <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-blue-50 rounded-full"></div>
            </div>

            <div className={`rounded-3xl p-5 flex flex-col justify-between h-36 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-colors ${
              appState !== 'idle' ? 'bg-blue-600 text-white' : windowWarning ? 'bg-rose-50 border border-rose-100' : 'bg-white'
            }`}>
              <div className="flex justify-between items-start">
                <span className={`text-xs font-medium ${appState !== 'idle' ? 'text-blue-100' : 'text-slate-500'}`}>Siguiente Sueño</span>
                <div className={`p-2 rounded-full ${appState !== 'idle' ? 'bg-blue-500/50' : windowWarning ? 'bg-rose-100' : 'bg-slate-50'}`}>
                  <Clock size={14} className={appState !== 'idle' ? 'text-white' : windowWarning ? "text-rose-500" : "text-slate-500"} />
                </div>
              </div>
              <div className="flex flex-col mt-2">
                {appState === 'sleeping' ? (
                  <span className="text-2xl font-semibold">Durmiendo</span>
                ) : appState === 'trying' ? (
                  <span className="text-2xl font-semibold">Intentando</span>
                ) : (
                  <>
                    <span className={`text-3xl font-semibold ${windowWarning ? 'text-rose-600' : 'text-slate-800'}`}>
                      {minsRemaining > 0 ? `${Math.floor(minsRemaining/60)}h ${minsRemaining%60}m` : '¡Ahora!'}
                    </span>
                    {minsRemaining > 0 && <span className={`text-[10px] font-medium mt-1 ${windowWarning ? 'text-rose-400' : 'text-slate-400'}`}>Despierta hace {Math.floor(minsAwake/60)}h</span>}
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 flex flex-col justify-between h-32 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <span className="text-slate-500 text-xs font-medium">Última Noche</span>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-semibold text-slate-800">{formatHoursMins(lastNightSeconds)}</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 flex flex-col justify-between h-32 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <span className="text-slate-500 text-xs font-medium">Media en dormir</span>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-semibold text-slate-800">{Math.round(todayTTSAvg / 60)}</span>
                <span className="text-sm text-slate-400 font-medium mb-1">min</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- VISTA: TIMER --- */}
      {activeTab === 'timer' && (
        <div className="flex flex-col h-full w-full p-6 items-center justify-between flex-1 min-h-[calc(100vh-6rem)] animate-in fade-in duration-300 z-10">
          <div className="w-full space-y-6 pt-6">
            <h1 className="text-slate-800 text-2xl font-semibold tracking-tight text-center">Registro Activo</h1>
            <div className="bg-white p-4 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
              <SegmentedControl options={['Mamá', 'Papá']} selected={caregiver} onChange={setCaregiver} />
              <SegmentedControl options={['Acunada', 'En cuna']} selected={method} onChange={setMethod} />
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center w-full my-8">
            <div className="text-center mb-6 h-8 flex items-center justify-center">
              {appState === 'trying' && <span className="bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase">Intentando...</span>}
              {appState === 'sleeping' && <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase flex items-center gap-2"><Moon size={14} /> Durmiendo</span>}
              {appState === 'idle' && <span className="bg-slate-200 text-slate-600 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase flex items-center gap-2"><Sun size={14} /> Despierta</span>}
            </div>

            <div className="font-light tabular-nums tracking-tighter text-[6rem] sm:text-[7rem] leading-none w-full text-center mb-6 text-slate-800 drop-shadow-sm">
              {formatTime(currentElapsed)}
            </div>

            <div className={`text-slate-500 text-sm font-medium flex items-center gap-2 transition-opacity duration-700 bg-white px-4 py-2 rounded-full shadow-sm ${appState === 'sleeping' ? 'opacity-100' : 'opacity-0'}`}>
              <span>Tardó en dormir:</span>
              <span className="text-slate-800 font-bold">{formatTime(timeToSleep)}</span>
            </div>
          </div>

          <div className="w-full pb-4 space-y-4">
            {appState === 'idle' && (
              <button onClick={handleStartTrying} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-5 text-lg font-semibold tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_10px_25px_rgba(37,99,235,0.3)]">
                <Play size={20} fill="currentColor" /> INICIAR INTENTO
              </button>
            )}

            {appState === 'trying' && (
              <div className="flex gap-3">
                <button onClick={handleCancel} className="flex-1 bg-white border border-slate-200 text-slate-600 rounded-2xl py-5 text-sm font-semibold tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm">
                  CANCELAR
                </button>
                <button onClick={handleFallAsleep} className="flex-[2] bg-emerald-500 text-white rounded-2xl py-5 text-lg font-semibold tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_10px_25px_rgba(16,185,129,0.3)]">
                  <Check size={22} strokeWidth={3} /> SE DURMIÓ
                </button>
              </div>
            )}

            {appState === 'sleeping' && (
              <button onClick={handleWakeUp} className="w-full bg-amber-500 text-white rounded-2xl py-5 text-lg font-semibold tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_10px_25px_rgba(245,158,11,0.3)]">
                <Sun size={22} strokeWidth={2.5} /> DESPERTÓ
              </button>
            )}
          </div>
        </div>
      )}

      {/* --- VISTA: ESTADÍSTICAS --- */}
      {activeTab === 'stats' && (
        <div className="flex flex-col w-full p-6 pt-10 space-y-6 min-h-[calc(100vh-6rem)] animate-in fade-in duration-300 z-10">
          
          <h1 className="text-slate-800 text-2xl font-semibold tracking-tight">Analíticas</h1>

          {/* Gráfico Analítico Estilo SerenIQ */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-slate-800 text-sm font-semibold flex items-center gap-2">
                 Ciclo Semanal
              </h3>
              <div className="flex gap-2">
                <div className="bg-slate-100 px-3 py-1 rounded-md text-xs font-semibold text-slate-800">Semana</div>
              </div>
            </div>
            
            <div className="h-48 flex items-end justify-between gap-1 sm:gap-2 mt-4">
              {mockWeeklyData.map((d, i) => {
                const isToday = d.day === 'V'; // "Hoy" en nuestros datos de prueba
                const hasData = d.duration > 0;
                
                // Calculamos altura basada en un máximo de 16h
                const heightPct = hasData ? (d.duration / 16) * 100 : 0;

                return (
                  <div key={i} className="flex flex-col items-center gap-3 flex-1">
                    {/* Contenedor tipo "Píldora" */}
                    <div className={`w-full max-w-[2.75rem] rounded-full flex flex-col justify-end items-center relative h-40 transition-all duration-500 ${
                      isToday
                        ? 'bg-gradient-to-b from-blue-400 to-blue-600 shadow-[0_8px_20px_rgba(37,99,235,0.3)]'
                        : hasData ? 'bg-gradient-to-b from-slate-50 to-slate-100/50' : 'bg-transparent'
                    }`}>

                      {/* Tooltip flotante para el día activo */}
                      {isToday && hasData && (
                        <div className="absolute -top-3.5 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md z-20 whitespace-nowrap">
                          {Math.round(d.duration)} hrs
                        </div>
                      )}

                      {/* Línea y puntos (Si hay datos de sueño) */}
                      {hasData && (
                        <div
                          className="w-full flex flex-col items-center justify-between absolute bottom-4 transition-all duration-1000 ease-out"
                          style={{ height: `${Math.max(15, heightPct)}%` }} // min 15% para que no se pisen los puntos
                        >
                          {/* Punto Superior (Duración Total) */}
                          <div className={`w-2.5 h-2.5 rounded-full ${isToday ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-blue-600'} z-10 shrink-0`} />

                          {/* Línea conectora súper fina */}
                          <div className={`w-[2px] flex-1 ${isToday ? 'bg-white/50' : 'bg-slate-300'} -my-0.5 z-0`} />

                          {/* Anillo Inferior (Base) */}
                          <div className={`w-3.5 h-3.5 rounded-full border-[2.5px] ${isToday ? 'border-white bg-blue-600' : 'border-blue-600 bg-white'} z-10 shrink-0`} />
                        </div>
                      )}

                      {/* Días futuros vacíos (solo el anillo inferior gris) */}
                      {!hasData && (
                        <div className="w-full flex flex-col items-center absolute bottom-4">
                           <div className="w-3.5 h-3.5 rounded-full border-[2.5px] border-slate-200 bg-transparent shrink-0" />
                        </div>
                      )}
                    </div>
                    
                    {/* Etiqueta del día */}
                    <span className={`text-xs font-semibold ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{d.day}</span>
                  </div>
                );
              })}
            </div>
            
            <div className="flex gap-4 pt-4 mt-4 border-t border-slate-100 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div> Total Dormido</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 border-[2px] border-blue-600 rounded-full bg-transparent"></div> Inicio de sueño</span>
            </div>
          </div>

          {/* Gráficas Horizontales */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
            <h3 className="text-slate-800 text-sm font-semibold">Desempeño en dormir (Media)</h3>
            
            <div className="space-y-5">
              <ProgressBar label="Mamá" value={avgMamaTTS} max={60} colorClass="bg-blue-500" />
              <ProgressBar label="Papá" value={avgPapaTTS} max={60} colorClass="bg-indigo-400" />
            </div>
            
            <div className="h-px w-full bg-slate-100"></div>
            
            <div className="space-y-5">
              <ProgressBar label="Acunada" value={avgAcunadaTTS} max={60} colorClass="bg-emerald-400" />
              <ProgressBar label="En cuna" value={avgCunaTTS} max={60} colorClass="bg-amber-400" />
            </div>
          </div>
        </div>
      )}

      {/* --- VISTA: MANUAL --- */}
      {activeTab === 'manual' && (
        <div className="flex flex-col w-full p-6 pt-10 space-y-6 min-h-[calc(100vh-6rem)] animate-in fade-in duration-300 z-10">
          <h1 className="text-slate-800 text-2xl font-semibold tracking-tight">Añadir Sesión</h1>
          
          <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
            <div className="space-y-2">
              <label className="text-slate-500 text-xs font-semibold pl-1">Cuidador</label>
              <SegmentedControl options={['Mamá', 'Papá']} selected={caregiver} onChange={setCaregiver} />
            </div>
            <div className="space-y-2">
              <label className="text-slate-500 text-xs font-semibold pl-1">Método usado</label>
              <SegmentedControl options={['Acunada', 'En cuna']} selected={method} onChange={setMethod} />
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-800 text-sm font-semibold">Tiempo en dormirse</span>
                <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl">
                  <button onClick={() => setManualTTS(Math.max(1, manualTTS - 5))} className="text-blue-500 bg-white p-2 rounded-xl shadow-sm"><MinusCircle size={20} strokeWidth={2} /></button>
                  <span className="text-xl font-bold w-12 text-center text-slate-800">{manualTTS}</span>
                  <button onClick={() => setManualTTS(manualTTS + 5)} className="text-blue-500 bg-white p-2 rounded-xl shadow-sm"><PlusCircle size={20} strokeWidth={2} /></button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-slate-800 text-sm font-semibold">Tiempo durmiendo</span>
                <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl">
                  <button onClick={() => setManualDuration(Math.max(10, manualDuration - 10))} className="text-blue-500 bg-white p-2 rounded-xl shadow-sm"><MinusCircle size={20} strokeWidth={2} /></button>
                  <span className="text-xl font-bold w-12 text-center text-slate-800">{manualDuration}</span>
                  <button onClick={() => setManualDuration(manualDuration + 10)} className="text-blue-500 bg-white p-2 rounded-xl shadow-sm"><PlusCircle size={20} strokeWidth={2} /></button>
                </div>
              </div>
            </div>
          </div>
          
          <button onClick={handleSaveManual} className="w-full mt-auto bg-slate-800 text-white rounded-2xl py-5 text-lg font-semibold tracking-wide transition-all active:scale-[0.98] shadow-lg">
            GUARDAR REGISTRO
          </button>
        </div>
      )}

      {/* --- BOTTOM TAB BAR (Estilo Flotante / Clean) --- */}
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex items-start justify-around px-4 pt-4 pb-6 max-w-md mx-auto z-50">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1.5 transition-colors flex-1 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
          <div className={`${activeTab === 'dashboard' ? 'bg-blue-50 p-1.5 rounded-xl' : 'p-1.5'}`}><Home size={22} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} /></div>
          <span className="text-[10px] font-bold tracking-wide">Inicio</span>
        </button>
        <button onClick={() => setActiveTab('timer')} className={`flex flex-col items-center gap-1.5 transition-colors flex-1 ${activeTab === 'timer' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
          <div className={`${activeTab === 'timer' ? 'bg-blue-50 p-1.5 rounded-xl' : 'p-1.5'}`}><Clock size={22} strokeWidth={activeTab === 'timer' ? 2.5 : 2} /></div>
          <span className="text-[10px] font-bold tracking-wide">Reloj</span>
        </button>
        <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center gap-1.5 transition-colors flex-1 ${activeTab === 'stats' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
          <div className={`${activeTab === 'stats' ? 'bg-blue-50 p-1.5 rounded-xl' : 'p-1.5'}`}><BarChart2 size={22} strokeWidth={activeTab === 'stats' ? 2.5 : 2} /></div>
          <span className="text-[10px] font-bold tracking-wide">Análisis</span>
        </button>
        <button onClick={() => setActiveTab('manual')} className={`flex flex-col items-center gap-1.5 transition-colors flex-1 ${activeTab === 'manual' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
          <div className={`${activeTab === 'manual' ? 'bg-blue-50 p-1.5 rounded-xl' : 'p-1.5'}`}><PlusCircle size={22} strokeWidth={activeTab === 'manual' ? 2.5 : 2} /></div>
          <span className="text-[10px] font-bold tracking-wide">Añadir</span>
        </button>
      </div>

    </div>
  );
}