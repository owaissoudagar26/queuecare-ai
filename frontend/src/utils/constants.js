// In production on Vercel or deployed domains, defaults to same-origin /api
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api' : 'http://127.0.0.1:8000/api');

export const WS_BASE_URL =
  import.meta.env.VITE_WS_URL ||
  (typeof window !== 'undefined' && import.meta.env.PROD
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/queue`
    : 'ws://127.0.0.1:8000/ws/queue');

export const USER_ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  STAFF: 'staff',
  PATIENT: 'patient',
};

export const QUEUE_STATUSES = {
  WAITING: 'waiting',
  CALLED: 'called',
  IN_CONSULTATION: 'in_consultation',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
};

export const PRIORITY_LEVELS = {
  ROUTINE: 'routine',
  FOLLOW_UP: 'follow_up',
  URGENT_REVIEW: 'urgent_review',
};

export const STATUS_BADGE_STYLES = {
  waiting: {
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    label: 'Waiting in Queue',
  },
  called: {
    bg: 'bg-sky-50 text-sky-700 border-sky-200 animate-pulse',
    dot: 'bg-sky-500',
    label: 'Called to Room',
  },
  in_consultation: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'In Consultation',
  },
  completed: {
    bg: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
    label: 'Completed',
  },
  cancelled: {
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    label: 'Cancelled',
  },
};

export const PRIORITY_BADGE_STYLES = {
  routine: {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    label: 'Routine',
  },
  follow_up: {
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    label: 'Follow-Up',
  },
  urgent_review: {
    bg: 'bg-red-100 text-red-800 border-red-300 font-semibold',
    label: 'Urgent Review',
  },
};
