import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQueueSocket } from '../context/QueueSocketContext';
import { queueApi, analyticsApi, departmentApi } from '../api/client';
import StatCard from '../components/StatCard';
import QueueTable from '../components/QueueTable';
import LiveWaitingBanner from '../components/LiveWaitingBanner';
import { formatMinutes } from '../utils/formatters';

import {
  Users,
  Clock,
  Stethoscope,
  Activity,
  CheckCircle2,
  RefreshCw,
  Filter,
  Search,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AdminDashboard() {
  const { user } = useAuth();
  const { lastMessage } = useQueueSocket();

  const [dateFilter, setDateFilter] = useState('today');
  const [selectedDept, setSelectedDept] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [kpis, setKpis] = useState({
    total_patients_today: 0,
    currently_waiting: 0,
    in_consultation: 0,
    completed_today: 0,
    avg_wait_minutes_today: 0,
    active_doctors_count: 0,
    bottleneck_departments: [],
  });

  const [departments, setDepartments] = useState([]);
  const [queueEntries, setQueueEntries] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [deptWaitStats, setDeptWaitStats] = useState([]);

  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setRefreshing(true);
      const [kpiRes, deptRes, queueRes, hourlyRes, waitStatsRes] = await Promise.all([
        analyticsApi.getKpiSummary(dateFilter),
        departmentApi.getAll(),
        queueApi.getLiveQueue({
          department_id: selectedDept || undefined,
          search: searchQuery || undefined,
        }),
        analyticsApi.getHourlyArrivals(),
        analyticsApi.getDepartmentWaitTimes(),
      ]);

      setKpis(kpiRes.data);
      setDepartments(deptRes.data);
      setQueueEntries(queueRes.data);
      setHourlyData(hourlyRes.data);
      setDeptWaitStats(waitStatsRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFilter, selectedDept, searchQuery]);

  // Initial load and filter change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reactive WebSocket update
  useEffect(() => {
    if (lastMessage) {
      fetchData(true);
    }
  }, [lastMessage, fetchData]);

  // Automatic 10-second background polling fallback
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Chart data configs
  const lineChartData = {
    labels: hourlyData.map((d) => d.hour),
    datasets: [
      {
        label: 'Patient Arrivals',
        data: hourlyData.map((d) => d.arrival_count),
        borderColor: '#0284C7',
        backgroundColor: 'rgba(2, 132, 199, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#0284C7',
      },
      {
        label: 'Consultations Completed',
        data: hourlyData.map((d) => d.completed_count),
        borderColor: '#10B981',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#10B981',
      },
    ],
  };

  const barChartData = {
    labels: deptWaitStats.map((d) => d.department_name),
    datasets: [
      {
        label: 'Avg Waiting Time (min)',
        data: deptWaitStats.map((d) => d.avg_wait_minutes),
        backgroundColor: deptWaitStats.map((d) => (d.is_bottleneck ? '#F43F5E' : '#0D9488')),
        borderRadius: 8,
      },
      {
        label: 'Avg Service Time (min)',
        data: deptWaitStats.map((d) => d.avg_consultation_minutes),
        backgroundColor: '#94A3B8',
        borderRadius: 8,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Hospital Queue Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time AI-optimized patient flow and clinical capacity monitoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Filter */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            {['today', 'yesterday', 'week'].map((filter) => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                  dateFilter === filter
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {filter === 'week' ? 'Last 7 Days' : filter}
              </button>
            ))}
          </div>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchData()}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-600' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <Link
            to="/register"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-700 hover:to-teal-700 rounded-xl shadow-sm shadow-brand-500/20 transition-all"
          >
            <span>+ Check-in Patient</span>
          </Link>
        </div>
      </div>

      {/* Bottleneck Alert Banner */}
      <LiveWaitingBanner bottlenecks={kpis.bottleneck_departments} />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard
          title="Total Registered"
          value={kpis.total_patients_today}
          subtitle="Patients today"
          icon={Users}
          color="brand"
        />
        <StatCard
          title="Currently Waiting"
          value={kpis.currently_waiting}
          subtitle="In waiting halls"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="In Consultation"
          value={kpis.in_consultation}
          subtitle="Active with doctors"
          icon={Stethoscope}
          color="teal"
        />
        <StatCard
          title="Completed Today"
          value={kpis.completed_today}
          subtitle="Discharged"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Avg Wait Time"
          value={`${kpis.avg_wait_minutes_today}m`}
          subtitle="AI Estimated Average"
          icon={Sparkles}
          color="indigo"
        />
        <StatCard
          title="Active Doctors"
          value={kpis.active_doctors_count}
          subtitle="On consultation duty"
          icon={Activity}
          color="brand"
        />
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Arrival Trends */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Hourly Patient Arrival Trends</h3>
              <p className="text-xs text-slate-400">Intake velocity vs. Completed consultations</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-600"></span> Arrivals
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Completed
              </span>
            </div>
          </div>
          <div className="h-64">
            <Line
              data={lineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
                  x: { grid: { display: false } },
                },
              }}
            />
          </div>
        </div>

        {/* Department Wait Times */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Department Wait & Service Times</h3>
              <p className="text-xs text-slate-400">Bottlenecks automatically flagged in rose</p>
            </div>
            <Link
              to="/analytics"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>Full Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="h-64">
            <Bar
              data={barChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
                  x: { grid: { display: false } },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Live Queue Master Table Header & Filters */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Live Patient Queue</span>
              <span className="px-2 py-0.5 text-xs font-bold bg-brand-50 text-brand-700 rounded-full border border-brand-200">
                {queueEntries.length} Active
              </span>
            </h2>
            <p className="text-xs text-slate-500">Live priority sequenced queue across hospital consultation rooms</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket, name, phone..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 w-48 sm:w-56"
              />
            </div>

            {/* Department Dropdown Filter */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Departments ({departments.length})</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.waiting_patients_count || 0} waiting)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Real-time Queue Table */}
        <QueueTable
          entries={queueEntries}
          loading={loading}
          userRole={user?.role || 'admin'}
          onRefresh={fetchData}
          onCallNext={async (entry) => {
            try {
              await queueApi.callNext();
              fetchData(true);
            } catch (err) {
              console.error(err);
            }
          }}
          onStartConsultation={async (queueId) => {
            try {
              await queueApi.startConsultation(queueId);
              fetchData(true);
            } catch (err) {
              console.error(err);
            }
          }}
          onCompleteConsultation={async (queueId) => {
            try {
              await queueApi.completeConsultation(queueId);
              fetchData(true);
            } catch (err) {
              console.error(err);
            }
          }}
          onCancelEntry={async (queueId) => {
            if (window.confirm('Are you sure you want to cancel this patient queue entry?')) {
              try {
                await queueApi.cancelEntry(queueId, 'Cancelled by admin from dashboard');
                fetchData(true);
              } catch (err) {
                console.error(err);
              }
            }
          }}
        />
      </div>
    </div>
  );
}
