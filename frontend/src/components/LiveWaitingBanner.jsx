import React from 'react';
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LiveWaitingBanner({ bottlenecks = [] }) {
  if (!bottlenecks || bottlenecks.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl bg-amber-500/10 border border-amber-300/60 p-4 text-amber-900 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
            Queue Congestion Alert
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-200 text-amber-900 rounded-full">
              {bottlenecks.length} {bottlenecks.length === 1 ? 'Dept' : 'Depts'} Exceeding SLA
            </span>
          </h4>
          <p className="text-xs text-amber-800 mt-0.5">
            Heavy queue congestion detected in: <strong className="font-semibold">{bottlenecks.join(', ')}</strong>.
            Consider rebalancing active doctor assignments.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          to="/doctor"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
        >
          <span>Staff Actions</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
