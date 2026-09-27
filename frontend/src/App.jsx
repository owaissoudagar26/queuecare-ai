import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { QueueSocketProvider } from './context/QueueSocketContext';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import AdminDashboard from './pages/AdminDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientRegistration from './pages/PatientRegistration';
import PatientLiveQueue from './pages/PatientLiveQueue';
import PublicDisplayKiosk from './pages/PublicDisplayKiosk';
import AiModelInsights from './pages/AiModelInsights';
import AnalyticsReports from './pages/AnalyticsReports';
import DepartmentManagement from './pages/DepartmentManagement';
import LoginPage from './pages/LoginPage';

function LayoutShell({ children }) {
  const location = useLocation();
  const isKiosk = location.pathname === '/kiosk';
  const isLogin = location.pathname === '/login';

  if (isKiosk || isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QueueSocketProvider>
        <BrowserRouter>
          <LayoutShell>
            <Routes>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/doctor" element={<DoctorDashboard />} />
              <Route path="/register" element={<PatientRegistration />} />
              <Route path="/track" element={<PatientLiveQueue />} />
              <Route path="/kiosk" element={<PublicDisplayKiosk />} />
              <Route path="/ai-insights" element={<AiModelInsights />} />
              <Route path="/analytics" element={<AnalyticsReports />} />
              <Route path="/departments" element={<DepartmentManagement />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </LayoutShell>
        </BrowserRouter>
      </QueueSocketProvider>
    </AuthProvider>
  );
}
