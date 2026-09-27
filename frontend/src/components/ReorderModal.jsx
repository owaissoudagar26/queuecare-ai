import React, { useState } from 'react';
import { queueApi } from '../api/client';
import { AlertCircle, ShieldAlert, X, ArrowUpDown, History } from 'lucide-react';

export default function ReorderModal({ entry, maxPosition = 10, onClose, onSuccess }) {
  const [newPosition, setNewPosition] = useState(entry.queue_position);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const fetchAuditHistory = async () => {
    try {
      const res = await queueApi.getAuditHistory(entry.id);
      setAuditLogs(res.data);
      setShowHistory(true);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason || reason.trim().length < 5) {
      setError('Please provide a descriptive clinical or administrative reason (min 5 characters) for the audit log.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await queueApi.reorderQueue({
        queue_entry_id: entry.id,
        new_position: parseInt(newPosition, 10),
        reason: reason.trim(),
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reorder queue position.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Reorder Queue Position</h3>
              <p className="text-xs text-slate-500">Ticket: <strong className="text-brand-600">{entry.ticket_number}</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clinical Disclaimer Alert */}
        <div className="my-4 p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Audit Policy:</strong> All queue reordering actions require an authorized clinical or administrative reason and are permanently recorded in the hospital audit trail.
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Queue Position
            </label>
            <select
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            >
              {Array.from({ length: Math.max(10, maxPosition) }, (_, i) => i + 1).map((pos) => (
                <option key={pos} value={pos}>
                  Position #{pos} {pos === 1 ? '(Next Up)' : ''}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Current Position: #{entry.queue_position} in {entry.department_name}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Position Change <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="E.g., Flagged by triage nurse for accelerated review due to acute symptom onset."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={fetchAuditHistory}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600 transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              <span>View Audit Logs</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Confirm Reorder'}
              </button>
            </div>
          </div>
        </form>

        {/* Audit Trail Drawer */}
        {showHistory && (
          <div className="mt-5 pt-4 border-t border-slate-100 animate-in fade-in duration-150">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Past Audit Records</h4>
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No past manual reorder actions recorded for this ticket.</p>
            ) : (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between text-slate-600 font-medium">
                      <span>Changed by {log.changed_by}</span>
                      <span className="text-[10px] text-slate-400">Pos #{log.previous_position} → #{log.new_position}</span>
                    </div>
                    <p className="text-slate-800 text-[11px] mt-1 font-sans">"{log.reason}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
