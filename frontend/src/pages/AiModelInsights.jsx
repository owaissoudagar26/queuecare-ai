import React, { useState, useEffect } from 'react';
import { aiApi, departmentApi } from '../api/client';
import { formatMinutes } from '../utils/formatters';
import {
  BrainCircuit,
  Sparkles,
  Sliders,
  TrendingDown,
  RefreshCw,
  Info,
  ShieldCheck,
  CheckCircle2,
  BarChart2,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function AiModelInsights() {
  const [departments, setDepartments] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [evalData, setEvalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [retrainSuccess, setRetrainSuccess] = useState(false);

  // Sandbox inputs
  const [sandboxDept, setSandboxDept] = useState('1');
  const [sandboxPos, setSandboxPos] = useState(4);
  const [sandboxDocs, setSandboxDocs] = useState(2);
  const [sandboxPriority, setSandboxPriority] = useState('routine');
  const [sandboxHour, setSandboxHour] = useState(10);
  const [sandboxDay, setSandboxDay] = useState(1);
  const [sandboxResult, setSandboxResult] = useState(null);
  const [predicting, setPredicting] = useState(false);

  const fetchModelData = async () => {
    try {
      setLoading(true);
      const [deptRes, metricsRes, evalRes] = await Promise.all([
        departmentApi.getAll(),
        aiApi.getMetrics(),
        aiApi.getEvaluationComparison(),
      ]);
      setDepartments(deptRes.data);
      if (deptRes.data.length > 0) {
        setSandboxDept(deptRes.data[0].id.toString());
      }
      setMetrics(metricsRes.data);
      setEvalData(evalRes.data);
    } catch (err) {
      console.error('Failed to load AI model insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelData();
  }, []);

  // Run real-time prediction in sandbox whenever inputs change
  useEffect(() => {
    if (!sandboxDept) return;
    const runPrediction = async () => {
      try {
        setPredicting(true);
        const res = await aiApi.predictWaitTime({
          department_id: parseInt(sandboxDept, 10),
          queue_position: parseInt(sandboxPos, 10),
          active_doctors_count: parseInt(sandboxDocs, 10),
          priority: sandboxPriority,
          hour_of_day: parseInt(sandboxHour, 10),
          day_of_week: parseInt(sandboxDay, 10),
        });
        setSandboxResult(res.data);
      } catch (err) {
        console.error('Prediction simulation error:', err);
      } finally {
        setPredicting(false);
      }
    };
    runPrediction();
  }, [sandboxDept, sandboxPos, sandboxDocs, sandboxPriority, sandboxHour, sandboxDay]);

  const handleRetrain = async () => {
    try {
      setRetraining(true);
      await aiApi.retrainModel();
      setRetrainSuccess(true);
      setTimeout(() => {
        fetchModelData();
        setRetrainSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to retrain model:', err);
    } finally {
      setRetraining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-600 to-teal-500 text-white shadow-md shadow-brand-500/20">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <span>AI Waiting Time Model & Diagnostics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Machine learning pipeline architecture, regression metrics, and live inference sandbox.
          </p>
        </div>

        <button
          onClick={handleRetrain}
          disabled={retraining}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${retraining ? 'animate-spin text-teal-400' : ''}`} />
          <span>{retraining ? 'Retraining Pipeline...' : 'Trigger Model Retrain'}</span>
        </button>
      </div>

      {retrainSuccess && (
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>Retraining job completed. Updated weights and metrics have been hot-reloaded into memory.</span>
        </div>
      )}

      {/* Model Performance Cards */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Mean Absolute Error (MAE)</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{metrics.mae} mins</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              vs. {metrics.baseline_rule_mae} mins on Rule Baseline
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Root Mean Squared (RMSE)</p>
            <h3 className="text-2xl font-black text-brand-600 mt-1">{metrics.rmse} mins</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              vs. {metrics.baseline_rule_rmse} mins on Rule Baseline
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Variance Explained (R²)</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{(metrics.r2_score * 100).toFixed(1)}%</h3>
            <p className="text-[11px] text-slate-500 mt-1">Goodness of fit on test split</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Training Sample Size</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{metrics.sample_size.toLocaleString()}</h3>
            <p className="text-[11px] text-slate-500 mt-1">Synthetic Queue Flow Records</p>
          </div>
        </div>
      )}

      {/* Main Grid: Interactive Sandbox (Left) & Feature Importances / Benchmark (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Live Prediction Sandbox */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-brand-600" />
                <span>Live Inference Sandbox</span>
              </h3>
              <p className="text-xs text-slate-500">Adjust parameters to see real-time AI wait time predictions.</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
              Interactive Test
            </span>
          </div>

          {/* Controls Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Department */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Department
              </label>
              <select
                value={sandboxDept}
                onChange={(e) => setSandboxDept(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.avg_consultation_time}m avg)
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Priority Tier
              </label>
              <select
                value={sandboxPriority}
                onChange={(e) => setSandboxPriority(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="routine">Routine Visit (1.0x)</option>
                <option value="follow_up">Follow-Up (0.85x)</option>
                <option value="urgent_review">Urgent Review (0.4x)</option>
              </select>
            </div>

            {/* Queue Position Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                <span>Queue Position (In Line)</span>
                <span className="text-brand-600 font-mono text-sm">#{sandboxPos}</span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                value={sandboxPos}
                onChange={(e) => setSandboxPos(e.target.value)}
                className="w-full accent-brand-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>Pos #1</span>
                <span>Pos #25</span>
              </div>
            </div>

            {/* Active Doctors Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                <span>Serving Doctors</span>
                <span className="text-brand-600 font-mono text-sm">{sandboxDocs} on duty</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={sandboxDocs}
                onChange={(e) => setSandboxDocs(e.target.value)}
                className="w-full accent-brand-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>1 Doctor</span>
                <span>5 Doctors</span>
              </div>
            </div>

            {/* Hour of Day Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                <span>Time of Day</span>
                <span className="text-brand-600 font-mono text-sm">{sandboxHour}:00</span>
              </div>
              <input
                type="range"
                min="8"
                max="19"
                value={sandboxHour}
                onChange={(e) => setSandboxHour(e.target.value)}
                className="w-full accent-brand-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>08:00 AM</span>
                <span>07:00 PM</span>
              </div>
            </div>

            {/* Day of Week */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Day of Week
              </label>
              <select
                value={sandboxDay}
                onChange={(e) => setSandboxDay(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="0">Monday (Surge peak)</option>
                <option value="1">Tuesday</option>
                <option value="2">Wednesday</option>
                <option value="3">Thursday</option>
                <option value="4">Friday</option>
                <option value="5">Saturday</option>
                <option value="6">Sunday</option>
              </select>
            </div>
          </div>

          {/* Sandbox Live Output Result Card */}
          {sandboxResult && (
            <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-navy-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-teal-300">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Inference Output</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{sandboxResult.model_version}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">AI Predicted Wait</span>
                  <div className="text-3xl font-black text-teal-300 mt-0.5 font-mono">
                    ~{sandboxResult.predicted_wait_minutes} mins
                  </div>
                  <span className="text-xs text-slate-300">
                    Confidence Range: [{sandboxResult.predicted_range_min}m – {sandboxResult.predicted_range_max}m]
                  </span>
                </div>

                <div className="p-3.5 bg-white/10 rounded-xl border border-white/10 text-xs space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Baseline Rule:</span>
                    <strong className="text-white font-mono">{sandboxResult.calculation_breakdown.rule_based_benchmark} mins</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Patients Ahead:</span>
                    <strong className="text-white">{sandboxResult.calculation_breakdown.patients_ahead}</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Fallback Mode:</span>
                    <strong className={sandboxResult.is_fallback ? 'text-amber-400' : 'text-emerald-400'}>
                      {sandboxResult.is_fallback ? 'Active' : 'Offline (ML Active)'}
                    </strong>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 italic pt-2 border-t border-white/10">
                {sandboxResult.disclaimer}
              </p>
            </div>
          )}
        </div>

        {/* Right 5 Cols: Feature Importance & Comparative Diagnostics */}
        <div className="lg:col-span-5 space-y-6">
          {/* Feature Importances Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-brand-600" />
              <span>Model Feature Importances (%)</span>
            </h3>
            <p className="text-xs text-slate-500">Weight of each variable in determining predicted wait durations.</p>

            {metrics?.feature_importances && (
              <div className="space-y-3 pt-2">
                {Object.entries(metrics.feature_importances).slice(0, 6).map(([feat, imp]) => (
                  <div key={feat}>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span className="capitalize">{feat.replace('_', ' ')}</span>
                      <span>{imp}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-600 to-teal-500 rounded-full"
                        style={{ width: `${Math.min(100, imp * 1.5)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Model vs Baseline Heuristic Comparison */}
          {evalData && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Benchmark vs. Rule Heuristic</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>{evalData.improvement_pct}% Less Error</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Random Forest ML Regressor consistently outperforms naive static queuing formulas.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2 text-center">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Static Formula MAE</span>
                  <span className="text-lg font-bold text-slate-800">{evalData.rule_based_mae} mins</span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">AI Model MAE</span>
                  <span className="text-lg font-bold text-emerald-700">{evalData.live_eval_mae} mins</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comparative Evaluation Sample Table */}
      {evalData?.sample_comparisons && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Validation Test Set Samples</h3>
              <p className="text-xs text-slate-500">Comparison of actual synthetic wait times vs AI & Rule predictions.</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">10 Sample Scenarios</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Dept</th>
                  <th className="p-3">Position</th>
                  <th className="p-3">Doctors</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Simulated Actual</th>
                  <th className="p-3 text-brand-700">AI Prediction</th>
                  <th className="p-3 text-slate-600">Rule Estimate</th>
                  <th className="p-3 text-right">AI Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {evalData.sample_comparisons.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold">{row.department}</td>
                    <td className="p-3 font-mono">#{row.queue_position}</td>
                    <td className="p-3">{row.active_doctors} on duty</td>
                    <td className="p-3 capitalize">{row.priority.replace('_', ' ')}</td>
                    <td className="p-3 font-bold text-slate-900">{row.actual_wait} mins</td>
                    <td className="p-3 font-bold text-brand-700">{row.ai_predicted_wait} mins</td>
                    <td className="p-3 text-slate-500">{row.rule_based_wait} mins</td>
                    <td className="p-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${
                        row.ai_error < row.rule_error
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        ±{row.ai_error}m
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Safety Notice Card */}
      <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3.5 text-xs text-amber-900 leading-relaxed">
        <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-amber-950 block">Evaluation & Validation Notice:</strong>
          The machine learning pipeline demonstrated above is trained on synthetic queuing distribution data simulating multi-server (M/M/c) hospital queues with Poisson arrivals and log-normal service times. It is designed for operational wait estimation only. In real healthcare settings, model deployment requires validation against representative local clinical data.
        </div>
      </div>
    </div>
  );
}
