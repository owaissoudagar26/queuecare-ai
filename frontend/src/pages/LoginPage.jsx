import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  Activity,
  Shield,
  Stethoscope,
  UserCheck,
  Users,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@queuecare.ai');
  const [password, setPassword] = useState('QueueCare2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const demoPresets = [
    {
      title: 'Administrator',
      email: 'admin@queuecare.ai',
      password: 'QueueCare2026!',
      icon: Shield,
      color: 'from-purple-600 to-indigo-600',
      role: 'Full Dashboard & Config',
    },
    {
      title: 'Doctor (Cardiology)',
      email: 'dr.sarah@queuecare.ai',
      password: 'QueueCare2026!',
      icon: Stethoscope,
      color: 'from-rose-600 to-pink-600',
      role: 'Consultation Room 101',
    },
    {
      title: 'Triage / Front Desk',
      email: 'staff@queuecare.ai',
      password: 'QueueCare2026!',
      icon: UserCheck,
      color: 'from-amber-500 to-orange-500',
      role: 'Queue Reorder & Intake',
    },
    {
      title: 'Patient Portal',
      email: 'patient@queuecare.ai',
      password: 'QueueCare2026!',
      icon: Users,
      color: 'from-teal-600 to-emerald-600',
      role: 'Check-in & Tracking',
    },
  ];

  const handleDemoFill = (preset) => {
    setEmail(preset.email);
    setPassword(preset.password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      const user = await login(email, password);
      if (user.role === 'doctor') {
        navigate('/doctor');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-navy-900 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-500 to-teal-400 mx-auto flex items-center justify-center text-white shadow-xl shadow-brand-500/30">
          <Activity className="w-7 h-7" />
        </div>
        <h2 className="mt-4 text-3xl font-black text-white tracking-tight">QueueCare AI</h2>
        <p className="mt-1 text-xs text-teal-400 font-semibold uppercase tracking-wider">
          Smarter Queues. Faster Care.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white text-slate-800 py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-100 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 flex items-center gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to QueueCare'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center gap-1.5 mb-3 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>One-Click Demo Personas</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {demoPresets.map((preset) => {
                const Icon = preset.icon;
                const isSelected = email === preset.email;
                return (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => handleDemoFill(preset)}
                    className={`p-2.5 rounded-xl border text-left transition-all text-xs ${
                      isSelected
                        ? 'bg-brand-50/80 border-brand-300 ring-2 ring-brand-500/20'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`p-1 rounded-lg text-white bg-gradient-to-tr ${preset.color}`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <span className="font-bold text-slate-900 leading-tight">{preset.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">{preset.role}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
