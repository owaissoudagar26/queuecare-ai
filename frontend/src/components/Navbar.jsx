import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQueueSocket } from '../context/QueueSocketContext';
import QuickRoleSwitcher from './QuickRoleSwitcher';
import { Activity, Bell, LogOut, Radio, User, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { isConnected } = useQueueSocket();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 transition-all">
      <div className="flex items-center justify-between">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-extrabold text-navy-900 tracking-tight flex items-center gap-1.5">
                QueueCare <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-teal-500">AI</span>
              </span>
              <p className="text-[10px] font-semibold text-slate-500 tracking-wide uppercase">Smarter Queues. Faster Care.</p>
            </div>
          </Link>
        </div>

        {/* Center: Live Real-time Indicator & Clock */}
        <div className="hidden md:flex items-center gap-5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700">
            <Clock className="w-3.5 h-3.5 text-brand-600" />
            <span className="font-mono font-medium">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              isConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            ></span>
            <span>{isConnected ? 'Real-Time Sync Active' : 'Polling Sync (10s)'}</span>
          </div>
        </div>

        {/* Right: Role Switcher & User Profile */}
        <div className="flex items-center gap-3">
          <QuickRoleSwitcher />

          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="hidden lg:block text-right">
                <p className="text-xs font-semibold text-slate-800 leading-tight">{user.fullName}</p>
                <p className="text-[10px] text-slate-500 capitalize">{user.role}</p>
              </div>
              <button
                onClick={logout}
                title="Log Out"
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition-all"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
