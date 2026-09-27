import React, { useState, useEffect } from 'react';
import { departmentApi, queueApi } from '../api/client';
import { formatMinutes } from '../utils/formatters';
import {
  UserPlus,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Copy,
  ExternalLink,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function PatientRegistration() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    gender: 'Female',
    phone: '',
    email: '',
    department_id: '',
    priority: 'routine',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [registeredTicket, setRegisteredTicket] = useState(null);
  const [copiedPin, setCopiedPin] = useState(false);

  useEffect(() => {
    async function loadDepartments() {
      try {
        const res = await departmentApi.getAll();
        setDepartments(res.data);
        if (res.data.length > 0) {
          setFormData((prev) => ({ ...prev, department_id: res.data[0].id }));
        }
      } catch (err) {
        console.error('Failed to load departments:', err);
      } finally {
        setLoadingDepts(false);
      }
    }
    loadDepartments();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.full_name || !formData.age || !formData.phone || !formData.department_id) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        full_name: formData.full_name.trim(),
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        department_id: parseInt(formData.department_id, 10),
        priority: formData.priority,
        notes: formData.notes.trim() || undefined,
      };

      const res = await queueApi.registerPatient(payload);
      setRegisteredTicket(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to register patient in queue.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyPin = () => {
    if (registeredTicket?.lookup_hash) {
      navigator.clipboard.writeText(registeredTicket.lookup_hash);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const resetForm = () => {
    setRegisteredTicket(null);
    setFormData((prev) => ({
      ...prev,
      full_name: '',
      age: '',
      phone: '',
      email: '',
      notes: '',
    }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
            <UserPlus className="w-6 h-6" />
          </div>
          <span>Patient Queue Registration</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Check in a patient for OPD consultation. An AI wait estimate and secure lookup ticket will be generated instantly.
        </p>
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-start gap-3 text-teal-900">
        <ShieldCheck className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <strong className="font-semibold text-teal-950 block">Patient Privacy Protection:</strong>
          QueueCare AI collects only essential demographic data required for queue sequencing. No sensitive past medical records or diagnoses are exposed on public waiting lounge monitors.
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 flex items-center gap-3 text-rose-800 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Registration Form Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="full_name"
                required
                value={formData.full_name}
                onChange={handleChange}
                placeholder="e.g. Eleanor Vance"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Age <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                name="age"
                required
                min="0"
                max="130"
                value={formData.age}
                onChange={handleChange}
                placeholder="e.g. 34"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Gender <span className="text-rose-500">*</span>
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other / Prefer not to say</option>
              </select>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Contact Phone <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. +1 555-0199"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              />
            </div>

            {/* Email (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address <span className="text-slate-400 font-normal lowercase">(optional for SMS/e-receipt)</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. eleanor@example.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              />
            </div>

            {/* Department */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Consultation Department <span className="text-rose-500">*</span>
              </label>
              <select
                name="department_id"
                required
                value={formData.department_id}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code}) — {d.waiting_patients_count || 0} waiting, est. {d.avg_consultation_time}m avg speed
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Priority Classification
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              >
                <option value="routine">Routine Checkup (Standard)</option>
                <option value="follow_up">Follow-Up Visit (Accelerated)</option>
                <option value="urgent_review">Flag for Urgent Staff Review</option>
              </select>
            </div>

            {/* Notes / Reason for Visit */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Visit Purpose / Intake Notes
              </label>
              <input
                type="text"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="e.g. Chest pain follow-up, general health screening"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={submitting || loadingDepts}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{submitting ? 'Generating Queue Ticket...' : 'Issue Queue Ticket'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Instant Ticket Modal upon successful registration */}
      {registeredTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-center animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-slate-900">Registration Successful!</h3>
            <p className="text-xs text-slate-500 mt-1">
              Patient is now registered in the <strong>{registeredTicket.department_name}</strong> queue.
            </p>

            {/* Ticket Card */}
            <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-navy-900 text-white shadow-xl relative overflow-hidden text-left">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">QueueCare AI Ticket</span>
                <span className="text-[10px] text-slate-300 font-mono">Pos #{registeredTicket.queue_position}</span>
              </div>

              <div className="my-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Ticket Number</p>
                <h2 className="text-3xl font-mono font-black text-white tracking-tight mt-0.5">
                  {registeredTicket.ticket_number}
                </h2>
                <p className="text-xs text-slate-200 mt-1 font-semibold">{registeredTicket.patient_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">AI Estimated Wait</span>
                  <span className="font-bold text-teal-300 text-sm">
                    ~{formatMinutes(registeredTicket.predicted_wait_minutes)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Private Lookup PIN</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-white tracking-widest">{registeredTicket.lookup_hash}</span>
                    <button
                      onClick={handleCopyPin}
                      className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                      title="Copy PIN"
                    >
                      {copiedPin ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-2">
              <Link
                to={`/track?ticket=${registeredTicket.ticket_number}&pin=${registeredTicket.lookup_hash}`}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
              >
                <span>Open Live Ticket Tracker</span>
                <ChevronRight className="w-4 h-4" />
              </Link>

              <button
                onClick={resetForm}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                Register Another Patient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
