import React, { useState, useEffect } from 'react';
import { analyticsApi, departmentApi } from '../api/client';
import StatCard from '../components/StatCard';
import { formatMinutes } from '../utils/formatters';
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  Filter,
  FileSpreadsheet,
  Building2,
} from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';

export default function AnalyticsReports() {
  const [dateFilter, setDateFilter] = useState('today');
  const [selectedDept, setSelectedDept] = useState('');
  const [departments, setDepartments] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [hourlyData, setHourlyData] = useState([]);
  const [deptStats, setDeptStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [deptRes, kpiRes, hourlyRes, waitStatsRes] = await Promise.all([
          departmentApi.getAll(),
          analyticsApi.getKpiSummary(dateFilter),
          analyticsApi.getHourlyArrivals(),
          analyticsApi.getDepartmentWaitTimes(),
        ]);
        setDepartments(deptRes.data);
        setKpis(kpiRes.data);
        setHourlyData(hourlyRes.data);
        setDeptStats(waitStatsRes.data);
      } catch (err) {
        console.error('Failed to load analytics data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [dateFilter]);

  const handleExportCsv = () => {
    const exportUrl = analyticsApi.getExportCsvUrl(selectedDept || undefined);
    window.open(exportUrl, '_blank');
  };

  const barChartData = {
    labels: deptStats.map((d) => d.department_name),
    datasets: [
      {
        label: 'Avg Waiting Time (mins)',
        data: deptStats.map((d) => d.avg_wait_minutes),
        backgroundColor: '#0284C7',
        borderRadius: 8,
      },
      {
        label: 'Avg Consultation Time (mins)',
        data: deptStats.map((d) => d.avg_consultation_minutes),
        backgroundColor: '#0D9488',
        borderRadius: 8,
      },
    ],
  };

  const hourlyChartData = {
    labels: hourlyData.map((d) => d.hour),
    datasets: [
      {
        label: 'Patient Arrivals',
        data: hourlyData.map((d) => d.arrival_count),
        borderColor: '#0284C7',
        backgroundColor: 'rgba(2, 132, 199, 0.15)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Discharges / Completed',
        data: hourlyData.map((d) => d.completed_count),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <BarChart3 className="w-6 h-6" />
            </div>
            <span>Analytics & Hospital Reports</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Operational throughput trends, clinical service metrics, and audit log exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Filter */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            {['today', 'yesterday', 'week'].map((f) => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                  dateFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f === 'week' ? 'Last 7 Days' : f}
              </button>
            ))}
          </div>

          {/* Department Filter for export */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Patients Intake"
            value={kpis.total_patients_today}
            subtitle={`In selected ${dateFilter} window`}
            icon={Users}
            color="brand"
          />
          <StatCard
            title="Avg Waiting Duration"
            value={`${kpis.avg_wait_minutes_today}m`}
            subtitle="Queue wait time"
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="Avg Consultation Speed"
            value={`${kpis.avg_consultation_minutes_today}m`}
            subtitle="Clinical duration"
            icon={Building2}
            color="teal"
          />
          <StatCard
            title="Completed Visits"
            value={kpis.completed_today}
            subtitle="Patients discharged"
            icon={CheckCircle2}
            color="emerald"
          />
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Hourly Throughput vs. Discharges</h3>
            <p className="text-xs text-slate-400">Peak hour patient flow dynamics</p>
          </div>
          <div className="h-64">
            <Line
              data={hourlyChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
                  x: { grid: { display: false } },
                },
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Department Wait vs. Consultation Ratio</h3>
            <p className="text-xs text-slate-400">Comparison across all hospital OPD wings</p>
          </div>
          <div className="h-64">
            <Bar
              data={barChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
                  x: { grid: { display: false } },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Detailed Department Performance Breakdown Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Department Performance Breakdown</h3>
            <p className="text-xs text-slate-500">Live operational status and average turnaround times.</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">{deptStats.length} Departments</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Currently Waiting</th>
                <th className="p-3.5">Active Doctors</th>
                <th className="p-3.5">Avg Wait Duration</th>
                <th className="p-3.5">Avg Consultation Speed</th>
                <th className="p-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {deptStats.map((dept) => (
                <tr key={dept.department_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900">{dept.department_name}</div>
                    <span className="text-[10px] text-slate-400 font-mono">{dept.department_code}</span>
                  </td>
                  <td className="p-3.5 font-bold font-mono text-sm">{dept.waiting_count}</td>
                  <td className="p-3.5">{dept.active_doctors} on duty</td>
                  <td className="p-3.5 font-semibold text-brand-700">~{dept.avg_wait_minutes} mins</td>
                  <td className="p-3.5 text-slate-600">~{dept.avg_consultation_minutes} mins</td>
                  <td className="p-3.5 text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full font-semibold ${
                        dept.is_bottleneck
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {dept.is_bottleneck ? 'High Load Alert' : 'Normal Flow'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
