import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueueSocket } from '../context/QueueSocketContext';
import { queueApi } from '../api/client';
import { formatMinutes, formatTime } from '../utils/formatters';
import {
  Search,
  Clock,
  Sparkles,
  ShieldCheck,
  Building2,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UserCheck,
  ArrowRight,
  Info,
} from 'lucide-react';

export default function PatientLiveQueue() {
  const [searchParams] = useSearchParams();
  const { lastMessage } = useQueueSocket();

  const [ticketInput, setTicketInput] = useState(searchParams.get('ticket') || '');
  const [pinInput, setPinInput] = useState(searchParams.get('pin') || '');
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async (ticket, pin) => {
    if (!ticket || !pin) return;
    try {
      setLoading(true);
      setError(null);
      const res = await queueApi.lookupStatus(ticket.trim(), pin.trim());
      setTicketData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ticket not found. Please verify your Ticket # and PIN.');
      setTicketData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-search if URL query params exist
  useEffect(() => {
    const urlTicket = searchParams.get('ticket');
    const urlPin = searchParams.get('pin');
    if (urlTicket && urlPin) {
      fetchStatus(urlTicket, urlPin);
    }
  }, [searchParams, fetchStatus]);

  // Reactive updates on WebSocket broadcast
  useEffect(() => {
    if (lastMessage && ticketData) {
      fetchStatus(ticketData.ticket_number, pinInput || searchParams.get('pin'));
    }
  }, [lastMessage, ticketData, pinInput, searchParams, fetchStatus]);

  // Fallback 8s auto-refresh if looking at active ticket
  useEffect(() => {
    if (!ticketData || ['completed', 'cancelled'].includes(ticketData.status)) return;
    const interval = setInterval(() => {
      fetchStatus(ticketData.ticket_number, pinInput || searchParams.get('pin'));
    }, 8000);
    return () => clearInterval(interval);
  }, [ticketData, pinInput, searchParams, fetchStatus]);

  const handleLookup = (e) => {
    e.preventDefault();
    if (!ticketInput || !pinInput) {
      setError('Please enter both your Ticket Number and Lookup PIN.');
      return;
    }
    fetchStatus(ticketInput, pinInput);
  };

  const steps = [
    { key: 'waiting', label: 'Waiting in Lounge', desc: 'In prioritized queue sequence' },
    { key: 'called', label: 'Called to Room', desc: 'Proceed to consultation room' },
    { key: 'in_consultation', label: 'In Consultation', desc: 'Active doctor session' },
    { key: 'completed', label: 'Completed', desc: 'Consultation finished' },
  ];

  const getStepIndex = (status) => {
    switch (status) {
      case 'waiting':
        return 0;
      case 'called':
        return 1;
      case 'in_consultation':
        return 2;
      case 'completed':
        return 3;
      default:
        return 0;
    }
  };

  const currentStepIndex = ticketData ? getStepIndex(ticketData.status) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
          <span>Live Patient Queue Tracker</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Track your real-time position, estimated waiting time, and assigned doctor room securely.
        </p>
      </div>

      {/* Lookup Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <form onSubmit={handleLookup} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ticket Number
              </label>
              <input
                type="text"
                value={ticketInput}
                onChange={(e) => setTicketInput(e.target.value.toUpperCase())}
                placeholder="e.g. QC-CARD-101"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                6-Digit PIN
              </label>
              <input
                type="text"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                placeholder="e.g. 8F3A29"
                maxLength={8}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-slate-400">PIN is printed on your check-in slip</p>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{loading ? 'Searching...' : 'Track Ticket'}</span>
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 flex items-center gap-3 text-rose-800 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Ticket Details & Live Progress Card */}
      {ticketData && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Top Banner Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</span>
              <h3 className="text-lg font-bold text-slate-900">{ticketData.department_name}</h3>
              <p className="text-xs text-slate-500 font-mono">Ticket: <strong className="text-brand-700">{ticketData.ticket_number}</strong></p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchStatus(ticketData.ticket_number, pinInput)}
                disabled={loading}
                title="Refresh Status"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
              </button>

              <div className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse"></span>
                <span>Live Tracker Sync</span>
              </div>
            </div>
          </div>

          {/* AI Wait Time & Queue Position Hero */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-brand-900 to-slate-900 text-white shadow-md relative overflow-hidden">
              <div className="flex items-center gap-2 text-teal-400 mb-1">
                <Sparkles className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">AI Wait Time Estimate</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-teal-300 mt-1">
                {ticketData.status === 'waiting'
                  ? `~${formatMinutes(ticketData.predicted_wait_minutes)}`
                  : ticketData.status === 'called'
                  ? 'Called to Room!'
                  : ticketData.status === 'in_consultation'
                  ? 'Now In Consultation'
                  : 'Completed'}
              </h2>
              <p className="text-[11px] text-slate-300 mt-1">
                {ticketData.status === 'waiting'
                  ? 'Estimated time until doctor calls your ticket.'
                  : 'Please proceed directly to your assigned room.'}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Queue Sequence</span>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {ticketData.status === 'waiting' ? (
                    <span>{ticketData.patients_ahead} Ahead of You</span>
                  ) : ticketData.assigned_room ? (
                    <span className="text-emerald-700">{ticketData.assigned_room}</span>
                  ) : (
                    <span>Ready</span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {ticketData.assigned_room
                  ? `Assigned Doctor Room: ${ticketData.assigned_room}`
                  : `Your position: #${ticketData.queue_position}`}
              </p>
            </div>
          </div>

          {/* 4-Step Progress Tracker */}
          <div className="pt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Consultation Lifecycle</p>
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2 right-6 h-1 bg-slate-100 -z-0">
                <div
                  className="h-full bg-gradient-to-r from-brand-600 to-teal-500 transition-all duration-500"
                  style={{ width: `${(currentStepIndex / 3) * 100}%` }}
                ></div>
              </div>

              <div className="relative z-10 grid grid-cols-4 gap-2 text-center">
                {steps.map((step, idx) => {
                  const isDone = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  return (
                    <div key={step.key} className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-sm ${
                          isDone
                            ? 'bg-emerald-500 text-white'
                            : isCurrent
                            ? 'bg-brand-600 text-white ring-4 ring-brand-100 scale-110'
                            : 'bg-white border-2 border-slate-200 text-slate-400'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                      </div>
                      <span className={`text-xs font-bold mt-2 ${isCurrent ? 'text-brand-700' : 'text-slate-700'}`}>
                        {step.label}
                      </span>
                      <span className="text-[10px] text-slate-400 hidden sm:block mt-0.5">{step.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* AI Non-Guaranteed Disclaimer Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3 text-slate-600 text-xs leading-relaxed">
            <Info className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800 font-semibold block">AI Estimate Notice:</strong>
              {ticketData.disclaimer}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
