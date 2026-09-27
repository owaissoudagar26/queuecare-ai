import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  color = 'brand',
  onClick
}) {
  const colorMap = {
    brand: 'bg-brand-50 text-brand-600 border-brand-100',
    teal: 'bg-teal-50 text-teal-600 border-teal-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-brand-300' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1.5 tracking-tight">{value}</h3>
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl border ${colorMap[color] || colorMap.brand}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3.5 flex items-center gap-1.5 text-xs">
          {trend !== undefined && (
            <span
              className={`inline-flex items-center font-semibold px-1.5 py-0.5 rounded-full ${
                trend >= 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {trend >= 0 ? (
                <TrendingUp className="w-3 h-3 mr-0.5" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-0.5" />
              )}
              {Math.abs(trend)}%
            </span>
          )}
          <span className="text-slate-500">{trendLabel || subtitle}</span>
        </div>
      )}
    </div>
  );
}
