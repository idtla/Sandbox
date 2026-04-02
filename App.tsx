import React, { useState, useEffect } from 'react';
import { Rocket, Moon, MapPin, Clock, Users, CheckCircle2, Navigation, AlertCircle, Newspaper, Globe } from 'lucide-react';

const App = () => {
  const [now, setNow] = useState(new Date());

  // --- CONFIGURACIÓN DE LA MISIÓN (Fechas en UTC) ---
  const MISSION_START = new Date('2026-04-01T22:35:00Z');
  const MISSION_END = new Date('2026-04-11T00:21:00Z');
  
  const milestones = [
    { id: 1, label: "Lanzamiento (SLS)", time: new Date('2026-04-01T22:35:00Z'), desc: "Despegue exitoso desde el Kennedy Space Center." },
    { id: 2, label: "Órbita Terrestre Alta", time: new Date('2026-04-02T02:00:00Z'), desc: "Verificación de sistemas y paneles solares." },
    { id: 3, label: "Inyección Trans-Lunar", time: new Date('2026-04-02T22:00:00Z'), desc: "Encendido crítico para salir de la gravedad terrestre." },
    { id: 4, label: "Viaje a la Luna", time: new Date('2026-04-03T12:00:00Z'), desc: "Tránsito de 4 días hacia el sistema lunar." },
    { id: 5, label: "Sobrevuelo Lunar (Máximo)", time: new Date('2026-04-06T15:00:00Z'), desc: "Punto más cercano a la superficie y cara oculta." },
    { id: 6, label: "Retorno Libre", time: new Date('2026-04-08T10:00:00Z'), desc: "Regreso a la Tierra usando asistencia gravitatoria." },
    { id: 7, label: "Amerizaje (Pacífico)", time: new Date('2026-04-11T00:21:00Z'), desc: "Entrada atmosférica y rescate por la Marina." }
  ];

  // --- DIARIO DE MISIÓN (Actualizar manualmente este array) ---
  const missionLogs = [
    { date: "02 Abr, 10:45", text: "Calibración de cámaras de navegación completada. Primera imagen de la Tierra profunda enviada." },
    { date: "02 Abr, 05:20", text: "Sistemas de soporte vital estables. La tripulación comienza el primer periodo de sueño programado." },
    { date: "01 Abr, 23:15", text: "Separación de la etapa central completada. Orion en trayectoria nominal." }
  ];

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Cálculos de progreso
  const totalDuration = MISSION_END - MISSION_START;
  const elapsed = now - MISSION_START;
  const progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);

  // Hitos
  const currentMilestone = [...milestones].reverse().find(m => now >= m.time) || milestones[0];
  const nextMilestone = milestones.find(m => now < m.time);

  // Función de cuenta atrás
  const getCountdown = (targetDate) => {
    const diff = targetDate - now;
    if (diff <= 0) return "00:00:00";
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans selection:bg-orange-500/30">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header con Reloj */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-md shadow-2xl">
          <div>
            <div className="flex items-center gap-2 text-orange-500 mb-1">
              <Rocket size={18} className={progress > 0 && progress < 100 ? "animate-bounce" : ""} />
              <span className="text-xs font-bold tracking-[0.2em] uppercase">Telemetry Stream Active</span>
            </div>
            <h1 className="text-3xl font-black bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">
              ARTEMIS II <span className="text-slate-600 font-light">| Mission Report</span>
            </h1>
          </div>
          <div className="mt-4 md:mt-0 bg-slate-950/50 px-4 py-2 rounded-xl border border-slate-800">
            <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1 text-center">Local Time (ES)</p>
            <p className="text-2xl font-mono font-bold text-white tabular-nums">
              {now.toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid' })}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card de Navegación y Cuenta Atrás */}
          <div className="md:col-span-2 bg-slate-900/60 border border-slate-800 rounded-3xl p-8 relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                    <Navigation size={16} className="text-blue-400" /> Navigation Status
                  </h2>
                  <p className="text-2xl font-bold text-white">{currentMilestone.label}</p>
                </div>
                {nextMilestone && (
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">T-Minus to {nextMilestone.label}</p>
                    <p className="text-3xl font-mono font-black text-orange-500 tabular-nums drop-shadow-[0_0_10px_rgba(249,115,22,0.3)]">
                      {getCountdown(nextMilestone.time)}
                    </p>
                  </div>
                )}
              </div>

              {/* Esquema Visual de Trayectoria */}
              <div className="relative h-32 mb-12 flex items-center px-12">
                {/* Camino */}
                <div className="absolute left-12 right-12 h-[2px] bg-slate-800" />
                <div 
                  className="absolute left-12 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-orange-500 transition-all duration-1000"
                  style={{ width: `calc(${progress}% - ${progress > 50 ? '24px' : '0px'})` }}
                />
                
                {/* Tierra */}
                <div className="absolute left-4 flex flex-col items-center">
                  <div className="w-14 h-14 bg-blue-600 rounded-full border-4 border-blue-400/30 shadow-[0_0_30px_rgba(37,99,235,0.3)] flex items-center justify-center overflow-hidden">
                    <Globe size={32} className="text-blue-200 opacity-80" />
                  </div>
                  <span className="text-[10px] mt-3 text-slate-500 font-black uppercase tracking-tighter">Earth</span>
                </div>

                {/* Cohete (Posición dinámica) */}
                <div 
                  className="absolute transition-all duration-1000 ease-linear z-20"
                  style={{ left: `calc(${progress}% + 24px)`, transform: 'translateX(-50%)' }}
                >
                  <div className="relative group">
                    <Rocket size={28} className="text-white rotate-90 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                    <div className="absolute top-1/2 -left-4 w-4 h-1 bg-gradient-to-r from-transparent to-orange-500 animate-pulse" />
                  </div>
                </div>

                {/* Luna */}
                <div className="absolute right-4 flex flex-col items-center">
                  <div className="w-10 h-10 bg-slate-700 rounded-full border-4 border-slate-600 shadow-[0_0_20px_rgba(148,163,184,0.1)] flex items-center justify-center">
                    <Moon size={20} className="text-slate-400" />
                  </div>
                  <span className="text-[10px] mt-3 text-slate-500 font-black uppercase tracking-tighter">Moon</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                  <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Mission Progress</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-bold text-white">{progress.toFixed(4)}</span>
                    <span className="text-blue-500 font-bold text-xs">%</span>
                  </div>
                </div>
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                  <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Next Objective</p>
                  <p className="text-sm font-bold text-slate-200 truncate">{nextMilestone?.label || "Mission Complete"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Crew Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Users className="text-purple-400" size={16} /> Crew Manifest
            </h2>
            <div className="space-y-3">
              {[
                { name: "R. Wiseman", role: "Commander", id: "CDR" },
                { name: "V. Glover", role: "Pilot", id: "PLT" },
                { name: "C. Koch", role: "Mission Spec", id: "MS1" },
                { name: "J. Hansen", role: "Mission Spec", id: "MS2" }
              ].map((member, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-950/40 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-all">
                  <div>
                    <p className="text-sm font-bold text-slate-100">{member.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase">{member.role}</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-1 bg-slate-800 text-slate-400 rounded-md border border-slate-700">{member.id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sección Inferior: Timeline y Noticias */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
          
          {/* Cronología */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-8">
              <Clock className="text-green-400" size={16} /> Flight Timeline
            </h2>
            <div className="space-y-6 relative">
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-800" />
              {milestones.map((m) => {
                const isPast = now >= m.time;
                const isCurrent = currentMilestone.id === m.id;
                return (
                  <div key={m.id} className={`flex gap-6 relative transition-all duration-500 ${isPast ? 'opacity-100' : 'opacity-30'}`}>
                    <div className={`w-6 h-6 rounded-full border-2 z-10 flex items-center justify-center shrink-0
                      ${isCurrent ? 'bg-blue-600 border-blue-400 animate-pulse scale-110 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 
                        isPast ? 'bg-slate-800 border-slate-700' : 'bg-slate-950 border-slate-800'}`}>
                      {isPast ? <CheckCircle2 size={12} className="text-white" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className={`font-bold text-sm ${isCurrent ? 'text-blue-400' : 'text-slate-200'}`}>{m.label}</p>
                        <p className="text-[10px] font-mono text-slate-500">
                          {m.time.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {isCurrent && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{m.desc}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Diario de Misión / Noticias */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-8">
              <Newspaper className="text-orange-400" size={16} /> Mission Logbook
            </h2>
            <div className="space-y-4">
              {missionLogs.map((log, i) => (
                <div key={i} className="group p-5 bg-slate-950/40 border border-slate-800/50 rounded-2xl hover:border-orange-500/30 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                    <p className="text-[10px] font-mono font-bold text-slate-500 uppercase">{log.date} UTC</p>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed italic font-serif">
                    "{log.text}"
                  </p>
                </div>
              ))}
              <div className="pt-4">
                <button className="w-full py-4 text-[10px] font-black text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl hover:bg-slate-800/30 hover:text-slate-400 transition-all tracking-[0.3em] uppercase">
                  Fetch Full Archive
                </button>
              </div>
            </div>
          </div>

        </div>

        <footer className="text-center pb-12">
          <p className="text-[10px] text-slate-700 font-bold tracking-[0.5em] uppercase">
            Deep Space Network Interface • Goddard Space Flight Center • 2026
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
