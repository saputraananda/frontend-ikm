import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import useAuthStore from '../store/authStore';

/* ── Helpers ─────────────────────────────────────────────────────── */
const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const fmt2 = n => String(n).padStart(2, '0');
const initials = name => (!name ? '?' : name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase());
const titleCase = s => (!s ? '' : s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()));
const greeting = () => { const h = new Date().getHours(); if (h < 11) return 'Selamat Pagi'; if (h < 15) return 'Selamat Siang'; if (h < 18) return 'Selamat Sore'; return 'Selamat Malam'; };
const greetEmoji = () => { const h = new Date().getHours(); if (h < 11) return '☀️'; if (h < 15) return '🌤️'; if (h < 18) return '🌅'; return '🌙'; };

/* getWeekDates — commented out along with calendar strip
function getWeekDates(baseDate) {
    const d = new Date(baseDate);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day === 0 ? 7 : day) - 1));
    const week = [];
    for (let i = 0; i < 7; i++) {
        const dt = new Date(monday);
        dt.setDate(monday.getDate() + i);
        week.push(dt);
    }
    return week;
}
*/

/* ── Progress Ring ───────────────────────────────────────────────── */
function ProgressRing({ done, total, size = 56 }) {
    const stroke = 5;
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const pct = total > 0 ? done / total : 0;
    const offset = circ * (1 - pct);
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth={stroke} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#fff" strokeWidth={stroke}
                strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset .6s ease' }} />
            <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fill="#fff"
                fontSize="14" fontWeight="800" style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}>
                {done}/{total}
            </text>
        </svg>
    );
}

/* ── Icons ───────────────────────────────────────────────────────── */
const IconHome = () => (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" /><path d="M7.5 18V12.5h5V18" />
    </svg>
);
const IconHistory = () => (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="14" height="13" rx="2" />
        <line x1="3" y1="8" x2="17" y2="8" /><line x1="7" y1="2" x2="7" y2="5" /><line x1="13" y1="2" x2="13" y2="5" />
    </svg>
);
const IconUser = () => (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="7" r="4" /><path d="M3 17c0-3 3.13-5 7-5s7 2 7 5" />
    </svg>
);

/* ── Menu Items ──────────────────────────────────────────────────── */
const MENU_ITEMS = [
    {
        key: 'absensi', label: 'Absensi', to: '/attendance',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>,
        bg: 'linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%)',
    },
    {
        key: 'riwayat', label: 'Riwayat', to: '/history',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12,7 12,12 15,14" /></svg>,
        bg: 'linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%)',
    },
    {
        key: 'profil', label: 'Profil', to: '/profile',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.58-6 8-6s8 2 8 6" /></svg>,
        bg: 'linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 100%)',
    },
    {
        key: 'shift', label: 'Info Shift', to: '/attendance',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="9" y1="2" x2="9" y2="6" /><line x1="15" y1="2" x2="15" y2="6" /></svg>,
        bg: 'linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)',
    },
    {
        key: 'formulir', label: 'Formulir', to: '/report',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10,9 9,9 8,9" /></svg>,
        bg: 'linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%)',
    },
    {
        key: 'bantuan', label: 'Bantuan', to: null,
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><circle cx="12" cy="17" r=".5" fill="#6366F1" /></svg>,
        bg: 'linear-gradient(135deg, #E0E7FF 0%, #EEF2FF 100%)',
    },
];

const SHIFT_META = {
    pagi: { label: 'Pagi', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', icon: '🌅' },
    siang: { label: 'Siang', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', icon: '☀️' },
    sore: { label: 'Sore', color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6', icon: '🌆' },
    lembur: { label: 'Lembur', color: '#F43F5E', bg: '#FFF1F2', border: '#FECDD3', text: '#9F1239', icon: '🌙' },
};

/* ══════════════════════════════════════════════════════════════════ */
export default function HomePage() {
    const routerLocation = useLocation();
    const authUser = useAuthStore(s => s.user);
    const [profile, setProfile] = useState(authUser || null);
    const [now, setNow] = useState(new Date());
    const [todayShifts, setTodayShifts] = useState(null);

    const displayName = titleCase(profile?.full_name || profile?.name || authUser?.full_name || authUser?.name || 'User');
    const role = profile?.position || profile?.department || 'Karyawan';
    const empId = profile?.employee_code || profile?.employee_id || '';

    useEffect(() => { document.title = 'Beranda | IKM Mobile'; }, []);

    useEffect(() => {
        api.get('/auth/profile').then(r => setProfile(r.data.data)).catch(() => { });
        api.get('/attendance/today-shifts').then(r => setTodayShifts(r.data.data || {})).catch(() => { });
    }, []);

    // Live clock
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const liveTime = `${fmt2(now.getHours())}:${fmt2(now.getMinutes())}:${fmt2(now.getSeconds())}`;

    const shiftSummary = (() => {
        if (!todayShifts) return null;
        const keys = ['pagi', 'siang', 'sore', 'lembur'];
        const done = keys.filter(k => todayShifts[k]?.check_in_time);
        return { total: keys.length, done: done.length, todayShifts, keys };
    })();

    const formatShiftTime = useCallback((v) => {
        if (!v) return null;
        const d = new Date(v);
        return `${fmt2(d.getHours())}:${fmt2(d.getMinutes())}`;
    }, []);

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #F1F5F9; -webkit-font-smoothing: antialiased; }

        @keyframes hp-fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes hp-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes hp-pulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
        @keyframes hp-scaleIn { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }

        .hp-shell { min-height: 100dvh; background: #F1F5F9; display: flex; justify-content: center; }
        .hp-frame { width: 100%; max-width: 430px; min-height: 100dvh; background: #F8FAFC; display: flex; flex-direction: column; box-shadow: 0 0 0 1px rgba(0,0,0,.04), 0 8px 48px rgba(0,0,0,.08); position: relative; overflow: hidden; }

        /* Hero header */
        .hp-hero {
          background: linear-gradient(160deg, #0F172A 0%, #1E3A5F 35%, #1D4ED8 70%, #3B82F6 100%);
          padding: 0 0 30px;
          border-radius: 0 0 32px 32px;
          position: relative;
          overflow: hidden;
        }
        .hp-hero::before {
          content: '';
          position: absolute; top: -80px; right: -50px;
          width: 220px; height: 220px;
          background: radial-gradient(circle, rgba(59,130,246,.25) 0%, transparent 70%);
          border-radius: 50%;
          animation: hp-pulse 4s ease-in-out infinite;
        }
        .hp-hero::after {
          content: '';
          position: absolute; bottom: -40px; left: -40px;
          width: 160px; height: 160px;
          background: radial-gradient(circle, rgba(139,92,246,.15) 0%, transparent 70%);
          border-radius: 50%;
        }
        .hp-hero-pattern {
          position: absolute; inset: 0; opacity: .04;
          background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0);
          background-size: 24px 24px;
          pointer-events: none;
        }
        .hp-hero-top {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px 0;
          position: relative; z-index: 1;
        }
        .hp-hero-user {
          display: flex; align-items: center; gap: 12px;
          flex: 1; min-width: 0;
        }
        .hp-avatar {
          width: 46px; height: 46px; border-radius: 14px;
          background: rgba(255,255,255,.15); border: 2px solid rgba(255,255,255,.25);
          color: #fff; font-size: 14px; font-weight: 800; letter-spacing: .5px;
          display: grid; place-items: center; flex-shrink: 0;
          backdrop-filter: blur(8px);
        }
        .hp-user-info { min-width: 0; overflow: hidden; }
        .hp-user-name {
          font-size: 15px; font-weight: 800; color: #fff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          letter-spacing: -.2px;
        }
        .hp-user-role {
          font-size: 11px; color: rgba(255,255,255,.55); font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-top: 2px;
        }
        .hp-hero-actions { display: flex; gap: 8px; flex-shrink: 0; }
        .hp-hero-btn {
          width: 38px; height: 38px; border-radius: 12px;
          background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.12);
          color: #fff; display: grid; place-items: center;
          cursor: pointer; transition: all .15s;
          backdrop-filter: blur(8px);
        }
        .hp-hero-btn:hover { background: rgba(255,255,255,.2); }

        /* Live clock + greeting */
        .hp-hero-body {
          padding: 20px 20px 0;
          position: relative; z-index: 1;
          display: flex; align-items: center; justify-content: space-between;
        }
        .hp-greeting-left { flex: 1; }
        .hp-greeting-text {
          font-size: 13px; color: rgba(255,255,255,.6); font-weight: 500;
          display: flex; align-items: center; gap: 6px;
        }
        .hp-live-time {
          font-family: 'JetBrains Mono', monospace;
          font-size: 28px; font-weight: 700; color: #fff;
          letter-spacing: -1px; margin-top: 4px;
          line-height: 1.1;
        }
        .hp-live-date {
          font-size: 12px; color: rgba(255,255,255,.45); font-weight: 500; margin-top: 6px;
        }

        /* Floating menu card */
        .hp-menu-card {
          margin: 14px 16px 0;
          background: #fff;
          border-radius: 22px;
          padding: 20px 14px 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,.08), 0 0 0 1px rgba(0,0,0,.03);
          position: relative; z-index: 2;
          animation: hp-fadeUp .4s ease-out both;
        }
        .hp-menu-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 6px 14px;
        }
        .hp-menu-title {
          font-size: 14px; font-weight: 800; color: #0F172A;
          letter-spacing: -.2px;
        }
        .hp-menu-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }
        .hp-menu-item {
          display: flex; flex-direction: column; align-items: center;
          gap: 8px; padding: 14px 6px 12px;
          border-radius: 16px;
          text-decoration: none;
          cursor: pointer;
          transition: all .15s ease;
          border: none; font-family: inherit;
          background: transparent;
          position: relative;
        }
        .hp-menu-item:hover { background: #F8FAFC; transform: translateY(-2px); }
        .hp-menu-item:active { transform: scale(.95); }
        .hp-menu-icon {
          width: 50px; height: 50px; border-radius: 16px;
          display: grid; place-items: center;
          flex-shrink: 0;
          transition: transform .15s, box-shadow .15s;
        }
        .hp-menu-item:hover .hp-menu-icon {
          transform: scale(1.06);
          box-shadow: 0 4px 12px rgba(0,0,0,.08);
        }
        .hp-menu-label {
          font-size: 11px; font-weight: 600; color: #475569;
          text-align: center; line-height: 1.3;
        }

        /* Calendar strip */
        .hp-cal-section {
          padding: 18px 16px 0;
          animation: hp-fadeUp .5s ease-out both;
          animation-delay: .1s;
        }
        .hp-cal-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 12px;
        }
        .hp-cal-title {
          font-size: 14px; font-weight: 800; color: #0F172A;
          letter-spacing: -.2px;
        }
        .hp-cal-month {
          font-size: 11.5px; font-weight: 600; color: #3B82F6;
          background: #EFF6FF; padding: 4px 10px; border-radius: 8px;
        }
        .hp-cal-strip {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          background: #fff;
          border-radius: 18px;
          padding: 12px 8px;
          box-shadow: 0 1px 4px rgba(0,0,0,.04), 0 0 0 1px rgba(0,0,0,.03);
        }
        .hp-cal-day {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          padding: 8px 0 10px;
          border-radius: 14px;
          transition: all .2s ease;
          cursor: default;
          position: relative;
        }
        .hp-cal-day.today {
          background: linear-gradient(135deg, #1D4ED8, #3B82F6);
          box-shadow: 0 4px 14px rgba(29,78,216,.35);
        }
        .hp-cal-day.past { opacity: .5; }
        .hp-cal-day-name {
          font-size: 10px; font-weight: 700; color: #94A3B8;
          text-transform: uppercase; letter-spacing: .5px;
        }
        .hp-cal-day.today .hp-cal-day-name { color: rgba(255,255,255,.7); }
        .hp-cal-day-num {
          font-size: 15px; font-weight: 800; color: #1E293B;
          width: 30px; height: 30px; display: grid; place-items: center;
          border-radius: 10px;
        }
        .hp-cal-day.today .hp-cal-day-num { color: #fff; }

        /* Quick action banner */
        .hp-section { padding: 18px 16px 0; }
        .hp-quick-banner {
          background: linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #1D4ED8 100%);
          border-radius: 20px; padding: 18px 20px;
          display: flex; align-items: center; gap: 16px;
          cursor: pointer; text-decoration: none;
          transition: all .15s ease;
          box-shadow: 0 8px 24px rgba(15,23,42,.2);
          position: relative; overflow: hidden;
          animation: hp-fadeUp .5s ease-out both;
          animation-delay: .15s;
        }
        .hp-quick-banner::before {
          content: '';
          position: absolute; top: -20px; right: -20px;
          width: 100px; height: 100px;
          background: radial-gradient(circle, rgba(59,130,246,.2) 0%, transparent 70%);
          border-radius: 50%;
        }
        .hp-quick-banner:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(15,23,42,.25); }
        .hp-quick-banner:active { transform: scale(.98); }
        .hp-quick-icon {
          width: 48px; height: 48px; border-radius: 14px;
          background: rgba(59,130,246,.15); border: 1px solid rgba(59,130,246,.25);
          display: grid; place-items: center; flex-shrink: 0;
          position: relative; z-index: 1;
        }
        .hp-quick-text { flex: 1; position: relative; z-index: 1; }
        .hp-quick-title { font-size: 14px; font-weight: 800; color: #fff; letter-spacing: -.2px; }
        .hp-quick-desc  { font-size: 11.5px; color: rgba(255,255,255,.45); margin-top: 3px; font-weight: 500; }
        .hp-quick-arrow {
          width: 32px; height: 32px; border-radius: 10px;
          background: rgba(255,255,255,.08);
          display: grid; place-items: center;
          color: rgba(255,255,255,.5); flex-shrink: 0;
          position: relative; z-index: 1;
        }

        /* Section headers */
        .hp-section-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 12px;
        }
        .hp-section-title {
          font-size: 14px; font-weight: 800; color: #0F172A;
          letter-spacing: -.2px;
        }
        .hp-section-link {
          font-size: 11.5px; font-weight: 600; color: #3B82F6;
          text-decoration: none;
          padding: 4px 10px;
          border-radius: 8px;
          transition: background .15s;
        }
        .hp-section-link:hover { background: #EFF6FF; }

        /* Shift timeline */
        .hp-shifts-wrap {
          animation: hp-fadeUp .5s ease-out both;
          animation-delay: .2s;
        }
        .hp-shift-timeline {
          display: flex; flex-direction: column; gap: 8px;
        }
        .hp-shift-card {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px;
          background: #fff;
          border-radius: 16px;
          border: 1px solid transparent;
          box-shadow: 0 1px 3px rgba(0,0,0,.04);
          transition: all .15s ease;
          position: relative;
          overflow: hidden;
        }
        .hp-shift-card::before {
          content: '';
          position: absolute; left: 0; top: 0; bottom: 0;
          width: 4px;
          border-radius: 0 4px 4px 0;
        }
        .hp-shift-card.done { border-color: rgba(16,185,129,.15); }
        .hp-shift-card.done::before { background: #10B981; }
        .hp-shift-card.pending::before { background: #E2E8F0; }
        .hp-shift-emoji {
          font-size: 20px; width: 40px; height: 40px;
          border-radius: 12px; display: grid; place-items: center;
          flex-shrink: 0;
        }
        .hp-shift-info { flex: 1; min-width: 0; }
        .hp-shift-name {
          font-size: 13px; font-weight: 700; color: #0F172A;
        }
        .hp-shift-time {
          font-size: 11px; font-weight: 500; color: #94A3B8;
          margin-top: 2px; display: flex; align-items: center; gap: 4px;
        }
        .hp-shift-time-val {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px; font-weight: 600;
        }
        .hp-shift-badge {
          font-size: 10px; font-weight: 700; padding: 4px 10px;
          border-radius: 100px; letter-spacing: .02em;
          display: flex; align-items: center; gap: 4px;
          flex-shrink: 0;
        }
        .hp-shift-badge.done { background: #ECFDF5; color: #065F46; }
        .hp-shift-badge.pending { background: #F1F5F9; color: #94A3B8; }

        /* progress bar */
        .hp-progress-section {
          animation: hp-fadeUp .5s ease-out both;
          animation-delay: .18s;
        }
        .hp-progress-card {
          background: #fff; border-radius: 16px; padding: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,.04), 0 0 0 1px rgba(0,0,0,.03);
        }
        .hp-progress-top {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 12px;
        }
        .hp-progress-label { font-size: 12px; font-weight: 600; color: #64748B; }
        .hp-progress-count { font-size: 12px; font-weight: 800; color: #0F172A; }
        .hp-progress-bar-bg {
          height: 8px; background: #F1F5F9; border-radius: 100px;
          overflow: hidden;
        }
        .hp-progress-bar-fill {
          height: 100%; border-radius: 100px;
          background: linear-gradient(90deg, #3B82F6, #1D4ED8);
          transition: width .6s ease;
        }

        /* Empty state */
        .hp-empty-card {
          background: #fff; border-radius: 20px;
          padding: 32px 20px; text-align: center;
          box-shadow: 0 1px 4px rgba(0,0,0,.04), 0 0 0 1px rgba(0,0,0,.03);
        }
        .hp-empty-icon {
          width: 64px; height: 64px; border-radius: 20px;
          background: #F8FAFC; display: grid; place-items: center;
          margin: 0 auto 14px;
        }
        .hp-empty-title { font-size: 14px; font-weight: 800; color: #1E293B; margin-bottom: 4px; }
        .hp-empty-desc { font-size: 12px; color: #94A3B8; font-weight: 500; line-height: 1.5; }

        /* Content area */
        .hp-content { flex: 1; overflow-y: auto; padding-bottom: 100px; }

        /* Bottom nav */
        .hp-bnav-wrap { position:fixed; left:0; right:0; bottom:0; z-index:30; display:flex; justify-content:center; pointer-events:none; width:100%; }
        .hp-bnav {
          pointer-events:auto; width:100%; max-width:430px;
          background: rgba(255,255,255,.92);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(226,232,240,.6);
          padding: 6px 20px calc(env(safe-area-inset-bottom) + 6px);
          box-shadow: 0 -4px 24px rgba(0,0,0,.06);
        }
        .hp-bnav-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px; width:100%; }
        .hp-bnav-item {
          display:flex; flex-direction:column; align-items:center; gap:4px;
          padding: 8px 8px 6px;
          border-radius: 14px;
          text-decoration:none;
          font-size: 10px; font-weight: 600; letter-spacing: .02em;
          color: #94A3B8;
          transition: all .2s ease;
          position: relative;
        }
        .hp-bnav-item:hover { color: #475569; }
        .hp-bnav-item.active {
          color: #1D4ED8;
        }
        .hp-bnav-item.active::before {
          content: '';
          position: absolute; top: 0; left: 50%; transform: translateX(-50%);
          width: 20px; height: 3px;
          background: #1D4ED8; border-radius: 0 0 3px 3px;
        }
        .hp-bnav-item svg { opacity: .5; transition: opacity .15s; }
        .hp-bnav-item.active svg { stroke: #1D4ED8; opacity: 1; }
      `}</style>

            <div className="hp-shell">
                <div className="hp-frame">

                    {/* ── Hero Header ── */}
                    <div className="hp-hero">
                        <div className="hp-hero-pattern" />
                        <div className="hp-hero-top">
                            <div className="hp-hero-user">
                                <div className="hp-avatar">{initials(displayName)}</div>
                                <div className="hp-user-info">
                                    <div className="hp-user-name">{displayName}</div>
                                    <div className="hp-user-role">{role}{empId && ` · ${empId}`}</div>
                                </div>
                            </div>
                            <div className="hp-hero-actions">
                                <button className="hp-hero-btn" aria-label="Notifikasi">
                                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10 2a5 5 0 0 1 5 5c0 5 2 6 2 6H3s2-1 2-6a5 5 0 0 1 5-5z" />
                                        <path d="M8.5 17a1.5 1.5 0 0 0 3 0" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="hp-hero-body">
                            <div className="hp-greeting-left">
                                <div className="hp-greeting-text">{greeting()} {greetEmoji()}</div>
                                <div className="hp-live-time">{liveTime}</div>
                                <div className="hp-live-date">{DAYS_ID[now.getDay()]}, {now.getDate()} {MONTHS_ID[now.getMonth()]} {now.getFullYear()}</div>
                            </div>
                            {shiftSummary && (
                                <ProgressRing done={shiftSummary.done} total={shiftSummary.total} />
                            )}
                        </div>
                    </div>

                    <div className="hp-content">
                        {/* ── Menu Card (floating) ── */}
                        <div className="hp-menu-card">
                            <div className="hp-menu-header">
                                <div className="hp-menu-title">Menu Utama</div>
                            </div>
                            <div className="hp-menu-grid">
                                {MENU_ITEMS.map((item) => (
                                    item.to ? (
                                        <Link key={item.key} to={item.to} className="hp-menu-item">
                                            <div className="hp-menu-icon" style={{ background: item.bg }}>
                                                {item.icon}
                                            </div>
                                            <span className="hp-menu-label">{item.label}</span>
                                        </Link>
                                    ) : (
                                        <button key={item.key} className="hp-menu-item" onClick={() => { }}>
                                            <div className="hp-menu-icon" style={{ background: item.bg }}>
                                                {item.icon}
                                            </div>
                                            <span className="hp-menu-label">{item.label}</span>
                                        </button>
                                    )
                                ))}
                            </div>
                        </div>

                        {/* ── Calendar Strip ── */}
                        {/* <div className="hp-cal-section">
                            <div className="hp-cal-header">
                                <span className="hp-cal-title">Minggu Ini</span>
                                <span className="hp-cal-month">{MONTHS_ID[now.getMonth()]} {now.getFullYear()}</span>
                            </div>
                            <div className="hp-cal-strip">
                                {weekDates.map((d, i) => {
                                    const dateStr = `${d.getFullYear()}-${fmt2(d.getMonth() + 1)}-${fmt2(d.getDate())}`;
                                    const isToday = dateStr === todayStr;
                                    const isPast = d < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                    return (
                                        <div key={i} className={`hp-cal-day${isToday ? ' today' : ''}${isPast && !isToday ? ' past' : ''}`}>
                                            <span className="hp-cal-day-name">{DAYS_ID[d.getDay()]}</span>
                                            <span className="hp-cal-day-num">{d.getDate()}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div> */}

                        {/* ── Quick Action ── */}
                        <div className="hp-section">
                            <Link to="/attendance" className="hp-quick-banner">
                                <div className="hp-quick-icon">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                                    </svg>
                                </div>
                                <div className="hp-quick-text">
                                    <div className="hp-quick-title">Absen Sekarang</div>
                                    <div className="hp-quick-desc">Lakukan absensi shift hari ini</div>
                                </div>
                                <div className="hp-quick-arrow">
                                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="8,5 13,10 8,15" />
                                    </svg>
                                </div>
                            </Link>
                        </div>

                        {/* ── Attendance Progress ── */}
                        {shiftSummary && (
                            <div className="hp-section hp-progress-section">
                                <div className="hp-progress-card">
                                    <div className="hp-progress-top">
                                        <span className="hp-progress-label">Progress Hari Ini</span>
                                        <span className="hp-progress-count">{shiftSummary.done} / {shiftSummary.total} shift</span>
                                    </div>
                                    <div className="hp-progress-bar-bg">
                                        <div className="hp-progress-bar-fill" style={{ width: `${(shiftSummary.done / shiftSummary.total) * 100}%` }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Absensi Hari Ini ── */}
                        <div className="hp-section hp-shifts-wrap">
                            <div className="hp-section-header">
                                <span className="hp-section-title">Absensi Hari Ini</span>
                                <Link to="/history" className="hp-section-link">Lihat Semua</Link>
                            </div>

                            {shiftSummary ? (
                                <div className="hp-shift-timeline">
                                    {shiftSummary.keys.map(k => {
                                        const s = shiftSummary.todayShifts[k];
                                        const hasPunch = s?.check_in_time;
                                        const meta = SHIFT_META[k];
                                        const inTime = hasPunch ? formatShiftTime(s.check_in_time) : null;
                                        const outTime = s?.check_out_time ? formatShiftTime(s.check_out_time) : null;
                                        return (
                                            <div key={k} className={`hp-shift-card ${hasPunch ? 'done' : 'pending'}`}>
                                                <div className="hp-shift-emoji" style={{ background: meta.bg }}>
                                                    {meta.icon}
                                                </div>
                                                <div className="hp-shift-info">
                                                    <div className="hp-shift-name">Shift {meta.label}</div>
                                                    <div className="hp-shift-time">
                                                        {hasPunch ? (
                                                            <>
                                                                <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="#94A3B8" strokeWidth="2"><circle cx="10" cy="10" r="7" /><polyline points="10,6 10,10 13,12" /></svg>
                                                                <span className="hp-shift-time-val">{inTime}</span>
                                                                {outTime && (
                                                                    <>
                                                                        <span style={{ color: '#CBD5E1' }}>→</span>
                                                                        <span className="hp-shift-time-val">{outTime}</span>
                                                                    </>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span>Belum absen</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className={`hp-shift-badge ${hasPunch ? 'done' : 'pending'}`}>
                                                    {hasPunch ? (
                                                        <>
                                                            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3,8 6.5,11.5 13,5" /></svg>
                                                            Hadir
                                                        </>
                                                    ) : 'Belum'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="hp-empty-card">
                                    <div className="hp-empty-icon">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="4" width="18" height="16" rx="2" />
                                            <line x1="3" y1="10" x2="21" y2="10" />
                                            <line x1="9" y1="2" x2="9" y2="6" />
                                            <line x1="15" y1="2" x2="15" y2="6" />
                                        </svg>
                                    </div>
                                    <div className="hp-empty-title">Belum Ada Absensi</div>
                                    <div className="hp-empty-desc">Belum ada absensi tercatat hari ini</div>
                                </div>
                            )}
                        </div>

                        <div style={{ height: 20 }} />
                    </div>

                    {/* ── Bottom Nav ── */}
                    <div className="hp-bnav-wrap">
                        <div className="hp-bnav">
                            <nav className="hp-bnav-grid">
                                <Link to="/" className={`hp-bnav-item${routerLocation.pathname === '/' ? ' active' : ''}`}>
                                    <IconHome /> Beranda
                                </Link>
                                <Link to="/history" className={`hp-bnav-item${routerLocation.pathname === '/history' ? ' active' : ''}`}>
                                    <IconHistory /> Riwayat
                                </Link>
                                <Link to="/profile" className={`hp-bnav-item${routerLocation.pathname === '/profile' ? ' active' : ''}`}>
                                    <IconUser /> Profil
                                </Link>
                            </nav>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}