import React, { useState, useEffect } from 'react';
import { departmentApi } from '../api/client';
import {
  Building2,
  Users,
  Clock,
  DoorOpen,
  Heart,
  Baby,
  Bone,
  Stethoscope,
  AlertCircle,
  Ear,
  Activity,
  Plus,
} from 'lucide-react';

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDepts() {
      try {
        const res = await departmentApi.getAll();
        setDepartments(res.data);
      } catch (err) {
        console.error('Failed to load departments:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDepts();
  }, []);

  const getDeptIcon = (iconName) => {
    switch (iconName) {
      case 'Heart':
        return Heart;
      case 'Baby':
        return Baby;
      case 'Bone':
        return Bone;
      case 'AlertCircle':
        return AlertCircle;
      case 'Ear':
        return Ear;
      default:
        return Stethoscope;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <Building2 className="w-6 h-6" />
            </div>
            <span>Hospital Departments</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Clinical specialties, room capacity, and active consultation speeds.
          </p>
        </div>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => {
          const Icon = getDeptIcon(dept.icon);
          return (
            <div
              key={dept.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div
                    className="p-3 rounded-2xl text-white shadow-md"
                    style={{ backgroundColor: dept.color || '#0284c7' }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700">
                    {dept.code}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mt-4">{dept.name}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {dept.description || 'Specialized outpatient clinical services.'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>Consultation Rooms:</span>
                  </span>
                  <strong className="text-slate-800">{dept.total_rooms} Rooms</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Active Doctors:</span>
                  </span>
                  <strong className="text-slate-800">{dept.active_doctors_count || 0} on duty</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Avg Consult Speed:</span>
                  </span>
                  <strong className="text-brand-600">{dept.avg_consultation_time} mins</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
