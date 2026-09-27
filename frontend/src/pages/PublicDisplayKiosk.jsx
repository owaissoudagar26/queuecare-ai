import React, { useState, useEffect } from 'react';
import { useQueueSocket } from '../context/QueueSocketContext';
import { queueApi } from '../api/client';
import {
  Tv,
  Maximize2,
  Minimize2,
  Clock,
  Sparkles,
  Radio,
  Volume2,
  VolumeX,
  Heart,
  Baby,
  Bone,
  Stethoscope,
  AlertCircle,
  Ear,
} from 'lucide-react';

export default function PublicDisplayKiosk() {
  const { lastMessage } = useQueueSocket();
  const [kioskData, setKioskData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [lastCalledTicket, setLastCalledTicket] = useState(null);

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchKiosk = async () => {
    try {
      const res = await queueApi.getPublicKiosk();
      setKioskData(res.data.kiosk_board || []);
    } catch (err) {
      console.error('Failed to load public kiosk board:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKiosk();
    const interval = setInterval(fetchKiosk, 6000);
    return () => clearInterval(interval);
  }, []);

  // React to WebSocket updates & play chime if newly called
  useEffect(() => {
    if (lastMessage) {
      fetchKiosk();
      if (lastMessage.type === 'PATIENT_CALLED' && lastMessage.data) {
        setLastCalledTicket(lastMessage.data);
        if (soundEnabled) {
          try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
            osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.15); // A5
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.6);
          } catch (e) {
            console.warn('Audio playback not permitted without interaction:', e);
          }
        }
      }
    }
  }, [lastMessage, soundEnabled]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const getDeptIcon = (iconName) => {
    switch (iconName) {
      case 'Heart':
        return Heart;
      case 'Baby':
        return Baby;
      case 'Bone':
        return Bone;
      case 'AlertCircle':
        return AlertCircle;
      case 'Ear':
        return Ear;
      default:
        return Stethoscope;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8 flex flex-col justify-between select-none">
      {/* Top Kiosk Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>QueueCare AI</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Live Public Display
              </span>
            </h1>
            <p className="text-xs text-slate-400">Waiting Lounge Consultation Status Board</p>
          </div>
        </div>

        {/* Right: Time & Controls */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-2 font-mono font-bold text-base text-teal-400">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-2xl border transition-colors ${
              soundEnabled
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
            title={soundEnabled ? 'Chime sound active' : 'Click to enable audio chime for new calls'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* New Call Flashing Alert Banner */}
      {lastCalledTicket && (
        <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-teal-500/20 via-brand-500/20 to-teal-500/20 border-2 border-teal-400 text-white flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <Radio className="w-6 h-6 text-teal-300 animate-spin" />
            <div>
              <span className="text-xs uppercase font-bold text-teal-300 tracking-wider">Now Calling:</span>
              <h2 className="text-2xl font-mono font-black">{lastCalledTicket.ticket_number}</h2>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-300">Please proceed to:</span>
            <div className="text-xl font-bold text-teal-300">{lastCalledTicket.room_number || 'Consultation Room'}</div>
          </div>
        </div>
      )}

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-6 flex-1">
        {kioskData.map((dept) => {
          const Icon = getDeptIcon(dept.icon);
          const activeServing = dept.now_serving || [];

          return (
            <div
              key={dept.department_id}
              className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800/80 shadow-xl flex flex-col justify-between"
            >
              {/* Department Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2.5 rounded-xl text-white"
                    style={{ backgroundColor: dept.color || '#0284c7' }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{dept.department_name}</h3>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{dept.department_code}</span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {dept.total_waiting} in queue
                </span>
              </div>

              {/* Now Serving Highlight */}
              <div className="my-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-400 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
                  <span>Now Serving</span>
                </p>

                {activeServing.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/60 text-center text-slate-500 text-xs italic">
                    Calling next patient shortly...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeServing.map((serving, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 border border-teal-500/40 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono text-2xl font-black text-white tracking-tight">
                            {serving.ticket_number}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Room</span>
                          <span className="text-sm font-bold text-teal-300">{serving.room}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Next In Line Preview */}
              <div className="pt-3 border-t border-slate-800/60">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Next in Line</p>
                {dept.next_in_line && dept.next_in_line.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {dept.next_in_line.map((ticket, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-slate-300"
                      >
                        <span>{ticket.ticket_number}</span>
                        <span className="ml-1 text-[10px] text-slate-500 font-sans font-normal">
                          (~{ticket.est_wait}m)
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 italic">No waiting tickets in this department.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info & Privacy Guarantee */}
      <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <span>© QueueCare AI Hospital Display System • Privacy Compliant: Zero PII Exposed</span>
        <span>Please have your Ticket Slip ready when called to consultation rooms.</span>
      </div>
    </div>
  );
}
