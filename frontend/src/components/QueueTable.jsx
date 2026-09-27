import React, { useState } from 'react';
import { STATUS_BADGE_STYLES, PRIORITY_BADGE_STYLES } from '../utils/constants';
import { formatMinutes, formatTime } from '../utils/formatters';
import {
  Clock,
  Sparkles,
  ArrowUpDown,
  PhoneCall,
  CheckCircle,
  Play,
  XCircle,
  MoreVertical,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import ReorderModal from './ReorderModal';

export default function QueueTable({
  entries = [],
  loading = false,
  userRole = 'admin',
  onCallNext,
  onStartConsultation,
  onCompleteConsultation,
  onCancelEntry,
  onRefresh,
}) {
  const [selectedEntryForReorder, setSelectedEntryForReorder] = useState(null);

  if (loading && entries.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
        <div className="inline-block w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500 mt-3">Syncing live queue records...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Queue is Currently Clear</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          No patients are currently waiting in this department queue filter. Use "Register Patient" to check in arrivals.
        </p>
      </div>
    );
  }

  const isStaffOrAdmin = ['admin', 'staff', 'doctor'].includes(userRole);

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Pos</th>
                <th className="py-3.5 px-4">Ticket & Patient</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">AI Predicted Wait</th>
                <th className="py-3.5 px-4">Arrival</th>
                {isStaffOrAdmin && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {entries.map((entry) => {
                const statusStyle = STATUS_BADGE_STYLES[entry.status] || STATUS_BADGE_STYLES.waiting;
                const priorityStyle = PRIORITY_BADGE_STYLES[entry.priority] || PRIORITY_BADGE_STYLES.routine;

                return (
                  <tr
                    key={entry.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      entry.status === 'in_consultation'
                        ? 'bg-emerald-50/30'
                        : entry.status === 'called'
                        ? 'bg-sky-50/30'
                        : ''
                    }`}
                  >
                    {/* Position */}
                    <td className="py-3.5 px-4">
                      {entry.status === 'waiting' ? (
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                          #{entry.queue_position}
                        </span>
                      ) : entry.status === 'in_consultation' ? (
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px]">
                          ACT
                        </span>
                      ) : (
                        <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-[10px]">
                          CALL
                        </span>
                      )}
                    </td>

                    {/* Ticket & Patient */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-brand-700 text-sm">{entry.ticket_number}</div>
                      <div className="text-slate-800 font-medium">{entry.patient_name || 'Anonymous'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">PIN: {entry.lookup_hash}</div>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{entry.department_name}</div>
                      {entry.room_number ? (
                        <div className="text-[11px] text-emerald-600 font-medium">Assigned: {entry.room_number}</div>
                      ) : (
                        <div className="text-[10px] text-slate-400">Waiting room</div>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${priorityStyle.bg}`}>
                        {priorityStyle.label}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${statusStyle.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                        {statusStyle.label}
                      </span>
                    </td>

                    {/* AI Predicted Wait */}
                    <td className="py-3.5 px-4">
                      {entry.status === 'waiting' ? (
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                          <div>
                            <span className="font-bold text-slate-800 text-sm">
                              ~{formatMinutes(entry.predicted_wait_minutes)}
                            </span>
                            <span className="block text-[10px] text-slate-400">AI Estimate</span>
                          </div>
                        </div>
                      ) : entry.actual_wait_minutes ? (
                        <div>
                          <span className="font-semibold text-emerald-700">
                            {formatMinutes(entry.actual_wait_minutes)}
                          </span>
                          <span className="block text-[10px] text-slate-400">Actual waited</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Now Serving</span>
                      )}
                    </td>

                    {/* Arrival Time */}
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatTime(entry.registered_at)}
                    </td>

                    {/* Actions */}
                    {isStaffOrAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {entry.status === 'waiting' && onCallNext && (
                            <button
                              onClick={() => onCallNext(entry)}
                              title="Call Patient to Room"
                              className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 font-medium transition-colors"
                            >
                              <PhoneCall className="w-4 h-4" />
                            </button>
                          )}

                          {entry.status === 'called' && onStartConsultation && (
                            <button
                              onClick={() => onStartConsultation(entry.id)}
                              title="Start Consultation"
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}

                          {entry.status === 'in_consultation' && onCompleteConsultation && (
                            <button
                              onClick={() => onCompleteConsultation(entry.id)}
                              title="Finish Consultation"
                              className="p-1.5 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 font-medium transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}

                          {entry.status === 'waiting' && (
                            <button
                              onClick={() => setSelectedEntryForReorder(entry)}
                              title="Reorder Position (Audit Required)"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            >
                              <ArrowUpDown className="w-4 h-4" />
                            </button>
                          )}

                          {['waiting', 'called'].includes(entry.status) && onCancelEntry && (
                            <button
                              onClick={() => onCancelEntry(entry.id)}
                              title="Cancel / Mark No-show"
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEntryForReorder && (
        <ReorderModal
          entry={selectedEntryForReorder}
          maxPosition={entries.filter((e) => e.status === 'waiting').length}
          onClose={() => setSelectedEntryForReorder(null)}
          onSuccess={() => {
            setSelectedEntryForReorder(null);
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </>
  );
}
