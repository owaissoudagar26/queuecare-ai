import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Shield, Stethoscope, UserCheck, ChevronDown, Check } from 'lucide-react';

const DEMO_ROLES = [
  {
    role: 'Administrator',
    email: 'admin@queuecare.ai',
    password: 'QueueCare2026!',
    badge: 'Admin',
    icon: Shield,
    color: 'text-purple-600 bg-purple-50',
  },
  {
    role: 'Doctor (Cardiology)',
    email: 'dr.sarah@queuecare.ai',
    password: 'QueueCare2026!',
    badge: 'Doctor',
    icon: Stethoscope,
    color: 'text-rose-600 bg-rose-50',
  },
  {
    role: 'Doctor (Pediatrics)',
    email: 'dr.james@queuecare.ai',
    password: 'QueueCare2026!',
    badge: 'Doctor',
    icon: Stethoscope,
    color: 'text-sky-600 bg-sky-50',
  },
  {
    role: 'Front Desk / Staff',
    email: 'staff@queuecare.ai',
    password: 'QueueCare2026!',
    badge: 'Staff',
    icon: UserCheck,
    color: 'text-amber-600 bg-amber-50',
  },
  {
    role: 'Patient Demo',
    email: 'patient@queuecare.ai',
    password: 'QueueCare2026!',
    badge: 'Patient',
    icon: Users,
    color: 'text-teal-600 bg-teal-50',
  },
];

export default function QuickRoleSwitcher() {
  const { user, login } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleSelectRole = async (item) => {
    try {
      setSwitching(true);
      await login(item.email, item.password);
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to switch demo account:', err);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl border border-slate-200 transition-colors shadow-sm"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Demo Switcher: <strong className="text-slate-900 capitalize">{user?.role || 'Guest'}</strong></span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Fast Role Switcher</p>
              <p className="text-[11px] text-slate-500">Switch personas with instant authenticated token</p>
            </div>
            <div className="mt-1 space-y-1">
              {DEMO_ROLES.map((item) => {
                const Icon = item.icon;
                const isCurrent = user?.email === item.email;
                return (
                  <button
                    key={item.email}
                    disabled={switching}
                    onClick={() => handleSelectRole(item)}
                    className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                      isCurrent
                        ? 'bg-brand-50 text-brand-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${item.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{item.role}</div>
                        <div className="text-[10px] text-slate-400">{item.email}</div>
                      </div>
                    </div>
                    {isCurrent && <Check className="w-4 h-4 text-brand-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
