import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Stethoscope,
  UserPlus,
  Search,
  Tv,
  BrainCircuit,
  BarChart3,
  Building2,
  ShieldAlert,
} from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();

  const navItems = [
    {
      title: 'Operations',
      items: [
        { label: 'Admin Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'staff', 'doctor', 'patient'] },
        { label: 'Doctor Console', path: '/doctor', icon: Stethoscope, roles: ['admin', 'doctor', 'staff'] },
        { label: 'Patient Registration', path: '/register', icon: UserPlus, roles: ['admin', 'staff', 'doctor', 'patient'] },
        { label: 'Live Ticket Tracker', path: '/track', icon: Search, roles: ['admin', 'staff', 'doctor', 'patient'] },
        { label: 'Public Display Kiosk', path: '/kiosk', icon: Tv, roles: ['admin', 'staff', 'doctor', 'patient'] },
      ],
    },
    {
      title: 'Intelligence & Insights',
      items: [
        { label: 'AI Model Inspector', path: '/ai-insights', icon: BrainCircuit, roles: ['admin', 'doctor', 'staff'] },
        { label: 'Analytics & Reports', path: '/analytics', icon: BarChart3, roles: ['admin', 'doctor', 'staff'] },
        { label: 'Departments', path: '/departments', icon: Building2, roles: ['admin', 'staff'] },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 border-r border-slate-800 select-none min-h-[calc(100vh-61px)]">
      <div className="p-4 flex-1 space-y-6">
        {navItems.map((group) => (
          <div key={group.title}>
            <p className="px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">
              {group.title}
            </p>
            <nav className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-brand-600 to-teal-600 text-white shadow-md shadow-brand-900/40'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Safety Notice Card in Sidebar footer */}
      <div className="p-4 m-3 bg-slate-800/80 rounded-2xl border border-slate-700/60">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-slate-300">
            <span className="font-semibold text-white block">Triage Protocol</span>
            AI predictions estimate wait duration only. Emergency prioritization requires clinical staff review.
          </div>
        </div>
      </div>
    </aside>
  );
}
