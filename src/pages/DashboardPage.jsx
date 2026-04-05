import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import useAuthStore from '../store/authStore';

/* ── Office location ─────────────────────────────────────────────── */
const OFFICE_LAT = -6.3983239;
const OFFICE_LNG = 106.8997063;
const MAX_DIST_M = 200;

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = x => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ── Shift definitions ───────────────────────────────────────────── */
const toMin = (h, m) => h * 60 + m;

const SHIFTS = [
  {
    key: 'pagi', label: 'Pagi', optional: false,
    inLabel: '04:00 – 11:50', outLabel: '11:51 – 12:40',
    inWin: [toMin(4, 0), toMin(11, 50)],
    outWin: [toMin(11, 51), toMin(12, 40)],
    bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', accent: '#F59E0B', iconBg: '#FEF3C7',
  },
  {
    key: 'siang', label: 'Siang', optional: false,
    inLabel: '12:41 – 16:50', outLabel: '16:51 – 18:20',
    inWin: [toMin(12, 41), toMin(16, 50)],
    outWin: [toMin(16, 51), toMin(18, 20)],
    bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', accent: '#3B82F6', iconBg: '#DBEAFE',
  },
  {
    key: 'sore', label: 'Sore', optional: false,
    inLabel: '18:21 – 21:30', outLabel: '21:31 – 22:03',
    inWin: [toMin(18, 21), toMin(21, 30)],
    outWin: [toMin(21, 31), toMin(22, 3)],
    bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6', accent: '#8B5CF6', iconBg: '#EDE9FE',
  },
  {
    key: 'lembur', label: 'Lembur', optional: true,
    inLabel: '22:04 – 22:30', outLabel: '22:31 – 03:59',
    inWin: [toMin(22, 4), toMin(22, 30)],
    outWin: null, // spans midnight — special case
    bg: '#FFF1F2', border: '#FECDD3', text: '#9F1239', accent: '#F43F5E', iconBg: '#FFE4E6',
  },
];

function getCurrentMin() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function isInWindow(shift, punchType) {
  const m = getCurrentMin();
  if (punchType === 'in') return m >= shift.inWin[0] && m <= shift.inWin[1];
  if (shift.key === 'lembur') return m >= toMin(22, 31) || m <= toMin(3, 59);
  return shift.outWin && m >= shift.outWin[0] && m <= shift.outWin[1];
}

/* ── Small helpers ───────────────────────────────────────────────── */
const initials = name => (!name ? '?' : name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase());
const titleCase = s => (!s ? '' : s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()));
const fmt2 = n => String(n).padStart(2, '0');
const formatTime = v => { if (!v) return null; const d = new Date(v); return `${fmt2(d.getHours())}:${fmt2(d.getMinutes())}`; };
const formatLiveDate = d => d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

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
const IconIn = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 3h4a1 1 0 011 1v12a1 1 0 01-1 1h-4" /><polyline points="9,7 13,10 9,13" /><line x1="13" y1="10" x2="3" y2="10" />
  </svg>
);
const IconOut = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 3H3a1 1 0 00-1 1v12a1 1 0 001 1h4" /><polyline points="11,13 15,10 11,7" /><line x1="15" y1="10" x2="5" y2="10" />
  </svg>
);
const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4,10 8,14 16,6" />
  </svg>
);
const IconShield = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V5l7-3z" />
  </svg>
);
const IconPin = () => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2a5 5 0 0 1 5 5c0 3.5-5 9-5 9S5 10.5 5 7a5 5 0 0 1 5-5z" /><circle cx="10" cy="7" r="1.8" />
  </svg>
);
/* ══════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const routerLocation = useLocation();
  const authUser = useAuthStore(s => s.user);

  const [profile, setProfile] = useState(authUser || null);
  const [shiftData, setShiftData] = useState({});   // { pagi: {...}, siang: {...}, ... }
  const [loadingShift, setLoadingShift] = useState(null); // 'pagi-in' | 'sore-out' | null
  const [msgs, setMsgs] = useState({});   // { 'pagi-in': {text,type}, ... }
  const [now, setNow] = useState(new Date());

  // GPS state
  const [gpsState, setGpsState] = useState('idle'); // idle | loading | ok | out | denied
  const [gpsDist, setGpsDist] = useState(null);
  const [, setGpsCoord] = useState(null);
  const [gpsRefreshKey, setGpsRefreshKey] = useState(0);
  const [gpsRefreshing, setGpsRefreshing] = useState(false);

  const displayName = titleCase(profile?.full_name || profile?.name || authUser?.full_name || authUser?.name || 'User');
  const role = profile?.position || profile?.department || 'Karyawan';
  const empId = profile?.employee_code || profile?.employee_id || '';

  /* ── Clock tick ── */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── Fetch profile & today shifts ── */
  const fetchShifts = useCallback(() => {
    api.get('/attendance/today-shifts').then(r => setShiftData(r.data.data || {})).catch(() => { });
  }, []);

  useEffect(() => {
    api.get('/auth/profile').then(r => setProfile(r.data.data)).catch(() => { });
    fetchShifts();
  }, [fetchShifts]);

  /* ── GPS watch ──
     Strategi dua-fase:
     1. Fase cepat (network/WiFi): enableHighAccuracy:false, timeout 5 detik → langsung tampil
     2. Fase presisi (GPS hardware): watchPosition dengan enableHighAccuracy:true → update otomatis
  ── */
  useEffect(() => {
    if (!navigator.geolocation) { setGpsState('denied'); return; }
    setGpsState('loading');
    setGpsRefreshing(true);

    let watchId = null;

    const onSuccess = (pos) => {
      const lat  = pos.coords.latitude;
      const lng  = pos.coords.longitude;
      const dist = haversineMeters(lat, lng, OFFICE_LAT, OFFICE_LNG);
      setGpsCoord({ lat, lng });
      setGpsDist(dist);
      setGpsState(dist <= MAX_DIST_M ? 'ok' : 'out');
      setGpsRefreshing(false);
    };

    const onError = (err) => {
      setGpsRefreshing(false);
      if (err.code === 1) setGpsState('denied');
      else setGpsState('error');
    };

    // Fase 1: quick coarse (network/WiFi) — biasanya selesai < 3 detik
    navigator.geolocation.getCurrentPosition(onSuccess, () => {
      // Jika coarse gagal, langsung coba GPS hardware
    }, { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 });

    // Fase 2: presisi GPS hardware — berjalan terus di background, update badge jika lebih akurat
    watchId = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      { enableHighAccuracy: true, timeout: 30000, maximumAge: gpsRefreshKey === 0 ? 15000 : 0 }
    );

    return () => { if (watchId != null) navigator.geolocation.clearWatch(watchId); };
  }, [gpsRefreshKey]);

  /* ── Fresh GPS for punch (coba coarse dulu agar cepat, lalu fine) ── */
  const getFreshCoord = () =>
    new Promise(resolve => {
      if (!navigator.geolocation) return resolve(null);
      // Coba network/WiFi positioning dulu (cepat)
      navigator.geolocation.getCurrentPosition(
        p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {
          // Fallback: coba GPS hardware
          navigator.geolocation.getCurrentPosition(
            p2 => resolve({ lat: p2.coords.latitude, lng: p2.coords.longitude }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
          );
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 30000 }
      );
    });

  const handleGpsRefresh = () => {
    setGpsCoord(null);
    setGpsDist(null);
    setGpsRefreshKey(k => k + 1);
  };

  /* ── Punch handler ── */
  const handlePunch = async (shiftKey, punchType) => {
    const msgKey = `${shiftKey}-${punchType}`;
    setLoadingShift(msgKey);
    setMsgs(prev => ({ ...prev, [msgKey]: null }));

    const coord = await getFreshCoord();
    if (!coord) {
      setMsgs(prev => ({ ...prev, [msgKey]: { text: 'GPS tidak tersedia. Aktifkan lokasi.', type: 'error' } }));
      setLoadingShift(null);
      return;
    }

    const dist = haversineMeters(coord.lat, coord.lng, OFFICE_LAT, OFFICE_LNG);
    if (dist > MAX_DIST_M) {
      setMsgs(prev => ({
        ...prev,
        [msgKey]: { text: `Anda ${Math.round(dist)}m dari lokasi. Maks ${MAX_DIST_M}m.`, type: 'error' },
      }));
      setLoadingShift(null);
      return;
    }

    try {
      const res = await api.post('/attendance/shift-punch', {
        shift_type: shiftKey, punch_type: punchType, lat: coord.lat, lng: coord.lng,
      });
      setMsgs(prev => ({ ...prev, [msgKey]: { text: res.data.message, type: 'success' } }));
      fetchShifts();
    } catch (e) {
      setMsgs(prev => ({
        ...prev,
        [msgKey]: { text: e.response?.data?.message || 'Gagal menyimpan absensi', type: 'error' },
      }));
    } finally { setLoadingShift(null); }
  };

  /* ── GPS badge ── */
  const gpsBadge = () => {
    if (gpsRefreshing || gpsState === 'loading')
      return { color: '#64748B', bg: '#F1F5F9', border: '#E2E8F0', text: 'Mengambil lokasi…', dot: '#94A3B8' };
    if (gpsState === 'denied')
      return { color: '#9F1239', bg: '#FFF1F2', border: '#FECDD3', text: 'Izin lokasi ditolak — cek pengaturan browser', dot: '#F43F5E' };
    if (gpsState === 'error')
      return { color: '#92400E', bg: '#FFFBEB', border: '#FDE68A', text: 'Gagal mendapatkan sinyal GPS', dot: '#F59E0B' };
    if (gpsState === 'ok')
      return { color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0', text: `Dalam area (${Math.round(gpsDist)}m)`, dot: '#10B981' };
    if (gpsState === 'out')
      return { color: '#92400E', bg: '#FFFBEB', border: '#FDE68A', text: `Di luar area (${Math.round(gpsDist)}m)`, dot: '#F59E0B' };
    return { color: '#64748B', bg: '#F1F5F9', border: '#E2E8F0', text: 'Memeriksa lokasi…', dot: '#94A3B8' };
  };
  const gps = gpsBadge();

  /* ── Active shift window label ── */
  const activeWindowLabel = (() => {
    const m = getCurrentMin();
    for (const s of SHIFTS) {
      if (m >= s.inWin[0] && m <= s.inWin[1]) return `Shift ${s.label} — Jam Masuk`;
      if (s.key !== 'lembur' && s.outWin && m >= s.outWin[0] && m <= s.outWin[1]) return `Shift ${s.label} — Jam Keluar`;
    }
    if (m >= toMin(22, 31) || m <= toMin(3, 59)) return 'Shift Lembur — Jam Keluar';
    return null;
  })();

  /* ── Live time ── */
  const liveTime = `${fmt2(now.getHours())}:${fmt2(now.getMinutes())}:${fmt2(now.getSeconds())}`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #F1F5F9; -webkit-font-smoothing: antialiased; }

        @keyframes d-fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes d-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
        @keyframes d-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .d-shell { min-height: 100dvh; background: #F1F5F9; display: flex; justify-content: center; }
        .d-frame { width: 100%; max-width: 430px; min-height: 100dvh; background: #F8FAFC; display: flex; flex-direction: column; box-shadow: 0 0 0 1px rgba(0,0,0,.04), 0 8px 48px rgba(0,0,0,.08); position: relative; overflow: hidden; }

        /* ── Hero ── */
        .d-hero {
          background: linear-gradient(160deg, #0F172A 0%, #1E3A5F 35%, #1D4ED8 70%, #3B82F6 100%);
          padding: 0 0 22px;
          border-radius: 0 0 28px 28px;
          position: relative; overflow: hidden; flex-shrink: 0;
        }
        .d-hero::before {
          content: '';
          position: absolute; top: -70px; right: -40px;
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(59,130,246,.25) 0%, transparent 70%);
          border-radius: 50%;
          animation: d-pulse 4s ease-in-out infinite;
        }
        .d-hero::after {
          content: '';
          position: absolute; bottom: -30px; left: -30px;
          width: 140px; height: 140px;
          background: radial-gradient(circle, rgba(139,92,246,.15) 0%, transparent 70%);
          border-radius: 50%;
        }
        .d-hero-pattern {
          position: absolute; inset: 0; opacity: .04;
          background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0);
          background-size: 24px 24px;
          pointer-events: none;
        }

        .d-hero-top {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 18px 0;
          position: relative; z-index: 1;
        }
        .d-hero-user { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
        .d-avatar {
          width: 40px; height: 40px; border-radius: 12px;
          background: rgba(255,255,255,.15); border: 2px solid rgba(255,255,255,.2);
          color: #fff; font-size: 13px; font-weight: 800;
          display: grid; place-items: center; flex-shrink: 0;
          backdrop-filter: blur(8px);
        }
        .d-user-name {
          font-size: 14px; font-weight: 800; color: #fff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .d-user-sub {
          font-size: 10.5px; color: rgba(255,255,255,.5); font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-top: 1px;
        }
        .d-hero-back {
          width: 36px; height: 36px; border-radius: 11px;
          background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.12);
          color: #fff; display: grid; place-items: center;
          cursor: pointer; transition: all .15s;
          backdrop-filter: blur(8px); flex-shrink: 0;
          text-decoration: none;
        }
        .d-hero-back:hover { background: rgba(255,255,255,.2); }

        /* Clock + Date row inside hero */
        .d-hero-body {
          padding: 14px 18px 0;
          position: relative; z-index: 1;
          display: flex; align-items: flex-end; justify-content: space-between;
        }
        .d-clock {
          font-family: 'JetBrains Mono', monospace;
          font-size: 26px; font-weight: 700; color: #fff;
          letter-spacing: -1px; line-height: 1;
        }
        .d-clock-date {
          font-size: 11.5px; color: rgba(255,255,255,.45); font-weight: 500; margin-top: 4px;
        }
        .d-hero-pill {
          font-size: 10px; font-weight: 700; letter-spacing: .03em;
          padding: 5px 10px; border-radius: 100px;
          background: rgba(255,255,255,.12); color: rgba(255,255,255,.85);
          border: 1px solid rgba(255,255,255,.1);
          white-space: nowrap; flex-shrink: 0;
          backdrop-filter: blur(6px);
        }

        /* ── Content ── */
        .d-content { flex: 1; overflow-y: auto; padding: 14px 14px 110px; display: flex; flex-direction: column; gap: 10px; }

        /* GPS card */
        .d-gps {
          border-radius: 18px; padding: 12px 14px;
          display: flex; align-items: center; gap: 10px;
          border: 1.5px solid;
          background: #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,.04), 0 0 0 1px rgba(0,0,0,.02);
          animation: d-fadeUp .4s ease-out both;
        }
        .d-gps-icon {
          width: 38px; height: 38px; border-radius: 12px;
          display: grid; place-items: center; flex-shrink: 0;
        }
        .d-gps-text { font-size: 12.5px; font-weight: 700; }
        .d-gps-sub { font-size: 10.5px; font-weight: 500; color: #94A3B8; margin-top: 1px; }
        .d-gps-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .d-gps-dot.pulse { animation: d-pulse 1.8s infinite; }
        .d-gps-refresh {
          width: 32px; height: 32px; border-radius: 10px;
          border: 1.5px solid; background: rgba(255,255,255,.7);
          cursor: pointer; display: grid; place-items: center;
          transition: opacity .15s;
        }
        .d-gps-refresh:disabled { opacity: .4; cursor: not-allowed; }

        /* Section header */
        .d-sec-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 4px 0 2px;
        }
        .d-sec-title { font-size: 14px; font-weight: 800; color: #0F172A; letter-spacing: -.2px; }
        .d-sec-count { font-size: 11px; font-weight: 600; color: #94A3B8; }

        /* Shift card — redesigned */
        .d-shift {
          background: #fff;
          border-radius: 20px;
          overflow: hidden;
          border: 1.5px solid transparent;
          box-shadow: 0 1px 4px rgba(0,0,0,.04), 0 0 0 1px rgba(0,0,0,.03);
          transition: border-color .2s, box-shadow .2s;
          animation: d-fadeUp .45s ease-out both;
        }
        .d-shift.active-window {
          box-shadow: 0 4px 16px rgba(0,0,0,.08), 0 0 0 1px rgba(0,0,0,.04);
        }
        .d-shift-head {
          padding: 12px 14px 10px;
          display: flex; align-items: center; gap: 10px;
        }
        .d-shift-emoji {
          font-size: 18px; width: 38px; height: 38px;
          border-radius: 12px; display: grid; place-items: center; flex-shrink: 0;
        }
        .d-shift-info { flex: 1; min-width: 0; }
        .d-shift-name { font-size: 13.5px; font-weight: 800; }
        .d-shift-window { font-size: 10.5px; font-weight: 500; color: #94A3B8; margin-top: 1px; }
        .d-shift-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .d-shift-optional { font-size: 9.5px; font-weight: 600; padding: 3px 8px; border-radius: 100px; background: #F8FAFC; color: #94A3B8; }
        .d-shift-badge {
          font-size: 10px; font-weight: 700; letter-spacing: .02em;
          padding: 4px 10px; border-radius: 100px;
          display: flex; align-items: center; gap: 4px; white-space: nowrap;
        }
        .d-shift-badge.done { background: #ECFDF5; color: #065F46; }
        .d-shift-badge.active { background: #EFF6FF; color: #1D4ED8; }
        .d-shift-badge.pending { background: #F8FAFC; color: #CBD5E1; }

        /* Punch row */
        .d-punch-row {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 8px;
          padding: 0 14px 14px;
        }
        .d-punch-card {
          border-radius: 14px; padding: 12px;
          border: 1.5px solid #F1F5F9;
          background: #FAFBFC;
          transition: border-color .15s;
        }
        .d-punch-card.highlight { border-color: #BFDBFE; background: #F8FAFF; }
        .d-punch-top {
          display: flex; align-items: center; gap: 5px;
          margin-bottom: 8px;
        }
        .d-punch-label {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: .06em; color: #94A3B8;
        }
        .d-punch-time {
          font-family: 'JetBrains Mono', monospace;
          font-size: 20px; font-weight: 700; color: #0F172A;
          line-height: 1; font-variant-numeric: tabular-nums;
        }
        .d-punch-time.empty { color: #E2E8F0; font-weight: 300; }
        .d-punch-win {
          font-size: 10px; color: #CBD5E1; font-weight: 500; margin-top: 3px;
        }
        .d-punch-msg {
          margin-top: 6px; font-size: 10.5px; font-weight: 600; line-height: 1.4;
          padding: 4px 8px; border-radius: 8px;
        }
        .d-punch-msg.success { background: #ECFDF5; color: #065F46; }
        .d-punch-msg.error   { background: #FEF2F2; color: #7F1D1D; }

        .d-punch-btn {
          margin-top: 8px; width: 100%; height: 34px; border-radius: 10px; border: none;
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11.5px; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;
          transition: opacity .15s, transform .1s;
        }
        .d-punch-btn:active:not(:disabled) { transform: scale(.96); }
        .d-punch-btn:disabled { opacity: .45; cursor: not-allowed; }
        .d-punch-btn.go { color: #fff; }
        .d-punch-btn.done { background: #F0FDF4; color: #65A30D; border: 1px solid #BBF7D0; }
        .d-punch-btn.locked { background: #F8FAFC; color: #CBD5E1; border: 1px solid #F1F5F9; }

        /* Notice card */
        .d-notice {
          background: #fff; border-radius: 18px; padding: 14px 16px;
          display: flex; align-items: flex-start; gap: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,.04), 0 0 0 1px rgba(0,0,0,.03);
          animation: d-fadeUp .5s ease-out both;
          animation-delay: .15s;
        }
        .d-notice-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: #F8FAFC; display: grid; place-items: center;
          color: #94A3B8; flex-shrink: 0;
        }
        .d-notice-title { font-size: 12.5px; font-weight: 700; color: #334155; margin-bottom: 2px; }
        .d-notice-desc { font-size: 11px; color: #94A3B8; line-height: 1.55; font-weight: 500; }

        /* Bottom nav */
        .d-bnav-wrap { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; display: flex; justify-content: center; pointer-events: none; width: 100%; }
        .d-bnav {
          pointer-events: auto; width: 100%; max-width: 430px;
          background: rgba(255,255,255,.92);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(226,232,240,.6);
          padding: 6px 20px calc(env(safe-area-inset-bottom) + 6px);
          box-shadow: 0 -4px 24px rgba(0,0,0,.06);
        }
        .d-bnav-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; width: 100%; }
        .d-bnav-item {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 8px 8px 6px; border-radius: 14px;
          text-decoration: none;
          font-size: 10px; font-weight: 600; letter-spacing: .02em;
          color: #94A3B8; transition: all .2s ease; position: relative;
        }
        .d-bnav-item:hover { color: #475569; }
        .d-bnav-item.active { color: #1D4ED8; }
        .d-bnav-item.active::before {
          content: '';
          position: absolute; top: 0; left: 50%; transform: translateX(-50%);
          width: 20px; height: 3px;
          background: #1D4ED8; border-radius: 0 0 3px 3px;
        }
        .d-bnav-item svg { opacity: .5; transition: opacity .15s; }
        .d-bnav-item.active svg { stroke: #1D4ED8; opacity: 1; }
      `}</style>

      <div className="d-shell">
        <div className="d-frame">

          {/* ── Hero ─────────────────────────────────────────── */}
          <div className="d-hero">
            <div className="d-hero-pattern" />
            <div className="d-hero-top">
              <div className="d-hero-user">
                <Link to="/" className="d-hero-back" aria-label="Kembali">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="12,15 7,10 12,5" />
                  </svg>
                </Link>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <div className="d-user-name">{displayName}</div>
                  <div className="d-user-sub">{role}{empId && ` · ${empId}`}</div>
                </div>
              </div>
              <div className="d-avatar">{initials(displayName)}</div>
            </div>

            <div className="d-hero-body">
              <div>
                <div className="d-clock">{liveTime}</div>
                <div className="d-clock-date">{formatLiveDate(now)}</div>
              </div>
              {activeWindowLabel && <div className="d-hero-pill">{activeWindowLabel}</div>}
            </div>
          </div>

          {/* ── Content ──────────────────────────────────────── */}
          <div className="d-content">

            {/* GPS card */}
            <div className="d-gps" style={{ borderColor: gps.border }}>
              <div className="d-gps-icon" style={{ background: gps.bg }}>
                <IconPin />
              </div>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <div className="d-gps-text" style={{ color: gps.color }}>{gps.text}</div>
                <div className="d-gps-sub">Laundry IKM Pringgondani · maks {MAX_DIST_M}m</div>
              </div>
              <button
                className="d-gps-refresh"
                onClick={handleGpsRefresh}
                disabled={gpsRefreshing}
                style={{ borderColor: gps.border, color: gps.color }}
                title="Refresh lokasi"
              >
                <svg
                  width="14" height="14" viewBox="0 0 20 20" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ animation: gpsRefreshing ? 'd-spin 1s linear infinite' : 'none' }}
                >
                  <path d="M17 10a7 7 0 1 1-1.34-4.09" />
                  <polyline points="17,3 17,8 12,8" />
                </svg>
              </button>
              <div className={`d-gps-dot${gpsRefreshing || gpsState === 'loading' ? ' pulse' : ''}`} style={{ background: gps.dot }} />
            </div>

            {/* Section header */}
            <div className="d-sec-header">
              <div className="d-sec-title">Absensi Shift</div>
              <div className="d-sec-count">{SHIFTS.length} shift hari ini</div>
            </div>

            {/* Shift cards */}
            {SHIFTS.map((shift, idx) => {
              const rec = shiftData[shift.key] || {};
              const hasIn = !!rec.check_in_time;
              const hasOut = !!rec.check_out_time;
              const winIn = isInWindow(shift, 'in');
              const winOut = isInWindow(shift, 'out');
              const loadIn = loadingShift === `${shift.key}-in`;
              const loadOut = loadingShift === `${shift.key}-out`;
              const msgIn = msgs[`${shift.key}-in`];
              const msgOut = msgs[`${shift.key}-out`];
              const inRange = gpsState === 'ok';
              const isActiveWin = winIn || winOut;

              const badgeClass = hasOut ? 'done' : hasIn ? 'active' : 'pending';
              const badgeText = hasOut ? '✓ Selesai' : hasIn ? 'Berjalan' : 'Belum';

              return (
                <div
                  key={shift.key}
                  className={`d-shift${isActiveWin ? ' active-window' : ''}`}
                  style={{ borderColor: isActiveWin ? shift.accent : 'transparent', animationDelay: `${idx * .05}s` }}
                >
                  {/* Header */}
                  <div className="d-shift-head">
                    <div className="d-shift-emoji" style={{ background: shift.iconBg }}>
                      {shift.key === 'pagi' && '🌅'}
                      {shift.key === 'siang' && '☀️'}
                      {shift.key === 'sore' && '🌆'}
                      {shift.key === 'lembur' && '🌙'}
                    </div>
                    <div className="d-shift-info">
                      <div className="d-shift-name" style={{ color: shift.text }}>Shift {shift.label}</div>
                      <div className="d-shift-window">{shift.inLabel} / {shift.outLabel}</div>
                    </div>
                    <div className="d-shift-right">
                      {shift.optional && <span className="d-shift-optional">Opsional</span>}
                      <span className={`d-shift-badge ${badgeClass}`}>{badgeText}</span>
                    </div>
                  </div>

                  {/* Punch cards */}
                  <div className="d-punch-row">
                    {/* Masuk */}
                    <div className={`d-punch-card${winIn ? ' highlight' : ''}`}>
                      <div className="d-punch-top">
                        <IconIn />
                        <span className="d-punch-label">Masuk</span>
                      </div>
                      <div className={`d-punch-time${!hasIn ? ' empty' : ''}`}>
                        {hasIn ? formatTime(rec.check_in_time) : '--:--'}
                      </div>
                      <div className="d-punch-win">{shift.inLabel}</div>

                      {msgIn && <div className={`d-punch-msg ${msgIn.type}`}>{msgIn.text}</div>}

                      {hasIn
                        ? <button className="d-punch-btn done" disabled><IconCheck /> Tercatat</button>
                        : winIn
                          ? <button
                              className="d-punch-btn go"
                              style={{ background: inRange ? shift.accent : '#CBD5E1' }}
                              onClick={() => inRange && handlePunch(shift.key, 'in')}
                              disabled={loadIn || !inRange}
                            >
                              {loadIn ? 'Simpan…' : inRange ? 'Masuk' : 'Diluar'}
                            </button>
                          : <button className="d-punch-btn locked" disabled>Masuk</button>
                      }
                    </div>

                    {/* Keluar */}
                    <div className={`d-punch-card${winOut ? ' highlight' : ''}`}>
                      <div className="d-punch-top">
                        <IconOut />
                        <span className="d-punch-label">Keluar</span>
                      </div>
                      <div className={`d-punch-time${!hasOut ? ' empty' : ''}`}>
                        {hasOut ? formatTime(rec.check_out_time) : '--:--'}
                      </div>
                      <div className="d-punch-win">{shift.outLabel}</div>

                      {msgOut && <div className={`d-punch-msg ${msgOut.type}`}>{msgOut.text}</div>}

                      {hasOut
                        ? <button className="d-punch-btn done" disabled><IconCheck /> Tercatat</button>
                        : winOut
                          ? <button
                              className="d-punch-btn go"
                              style={{ background: inRange && hasIn ? shift.accent : '#CBD5E1' }}
                              onClick={() => inRange && hasIn && handlePunch(shift.key, 'out')}
                              disabled={loadOut || !inRange || !hasIn}
                            >
                              {loadOut ? 'Simpan…' : !hasIn ? 'Belum Masuk' : inRange ? 'Keluar' : 'Diluar'}
                            </button>
                          : <button className="d-punch-btn locked" disabled>Keluar</button>
                      }
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Notice */}
            <div className="d-notice">
              <div className="d-notice-icon"><IconShield /></div>
              <div>
                <div className="d-notice-title">Wajib di area kerja</div>
                <div className="d-notice-desc">
                  Absensi hanya bisa dilakukan dalam radius {MAX_DIST_M}m dari lokasi kantor.
                  Pastikan GPS aktif dan sinyal stabil.
                </div>
              </div>
            </div>

          </div>

          {/* ── Bottom nav ────────────────────────────────────── */}
          <div className="d-bnav-wrap">
            <div className="d-bnav">
              <nav className="d-bnav-grid">
                <Link to="/" className="d-bnav-item">
                  <IconHome /> Beranda
                </Link>
                <Link to="/history" className={`d-bnav-item${routerLocation.pathname === '/history' ? ' active' : ''}`}>
                  <IconHistory /> Riwayat
                </Link>
                <Link to="/profile" className={`d-bnav-item${routerLocation.pathname === '/profile' ? ' active' : ''}`}>
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