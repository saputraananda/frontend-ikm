import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import useAuthStore from '../store/authStore';

/* ── Office location ─────────────────────────────────────────────── */
const OFFICE_LAT = -6.3983239;
const OFFICE_LNG = 106.8997063;
const OFFICE_LAT_2 = -6.3848079;
const OFFICE_LNG_2 = 106.8997077;
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
  const [nearestOffice, setNearestOffice] = useState(null); // 1 | 2
  const [, setGpsCoord] = useState(null);
  const [gpsRefreshKey, setGpsRefreshKey] = useState(0);
  const [gpsRefreshing, setGpsRefreshing] = useState(false);

  const displayName = titleCase(profile?.full_name || profile?.name || authUser?.full_name || authUser?.name || 'User');
  const role = profile?.position || profile?.department || 'Karyawan';
  const empId = profile?.employee_code || profile?.employee_id || '';

  useEffect(() => { document.title = 'Absensi | IKM Mobile'; }, []);

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
      const dist1 = haversineMeters(lat, lng, OFFICE_LAT, OFFICE_LNG);
      const dist2 = haversineMeters(lat, lng, OFFICE_LAT_2, OFFICE_LNG_2);
      const dist = Math.min(dist1, dist2);
      setGpsCoord({ lat, lng });
      setGpsDist(dist);
      setNearestOffice(dist1 <= dist2 ? 1 : 2);
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

    const dist1 = haversineMeters(coord.lat, coord.lng, OFFICE_LAT, OFFICE_LNG);
    const dist2 = haversineMeters(coord.lat, coord.lng, OFFICE_LAT_2, OFFICE_LNG_2);
    const dist = Math.min(dist1, dist2);
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

  const isActive = (p) => routerLocation.pathname === p;

  return (
    <div className="min-h-[100dvh] bg-slate-100 flex justify-center">
      <div className="w-full max-w-[430px] min-h-[100dvh] bg-slate-50 flex flex-col shadow-[0_0_0_1px_rgba(0,0,0,.04),0_8px_48px_rgba(0,0,0,.08)] relative overflow-hidden">

        {/* ── Hero ── */}
        <div className="relative overflow-hidden rounded-b-[28px] flex-shrink-0 pb-[22px]"
          style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1E3A5F 35%, #1D4ED8 70%, #3B82F6 100%)' }}>
          <div className="absolute -top-[70px] -right-[40px] w-[200px] h-[200px] rounded-full animate-pulse"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,.25) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-[30px] -left-[30px] w-[140px] h-[140px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,.15) 0%, transparent 70%)' }} />
          <div className="absolute inset-0 pointer-events-none opacity-[.04]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

          <div className="relative z-[1] flex items-center justify-between px-[18px] pt-[14px]">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <Link to="/" aria-label="Kembali"
                className="w-9 h-9 rounded-[11px] bg-white/10 border border-white/12 text-white grid place-items-center flex-shrink-0 transition hover:bg-white/20 no-underline backdrop-blur-xl">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="12,15 7,10 12,5"/>
                </svg>
              </Link>
              <div className="min-w-0 overflow-hidden">
                <div className="text-[14px] font-extrabold text-white truncate">{displayName}</div>
                <div className="text-[10.5px] text-white/50 font-medium truncate mt-px">{role}{empId && ` · ${empId}`}</div>
              </div>
            </div>
            <div className="w-10 h-10 rounded-[12px] bg-white/15 border-2 border-white/20 text-white text-[13px] font-extrabold grid place-items-center flex-shrink-0 backdrop-blur-xl">
              {initials(displayName)}
            </div>
          </div>

          <div className="relative z-[1] flex items-end justify-between px-[18px] pt-[14px]">
            <div>
              <div className="font-mono text-[26px] font-bold text-white tracking-[-1px] leading-none">{liveTime}</div>
              <div className="text-[11.5px] text-white/45 font-medium mt-1">{formatLiveDate(now)}</div>
            </div>
            {activeWindowLabel && (
              <div className="text-[10px] font-bold tracking-[.03em] px-2.5 py-[5px] rounded-full bg-white/12 text-white/85 border border-white/10 whitespace-nowrap flex-shrink-0 backdrop-blur-md">
                {activeWindowLabel}
              </div>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-[14px] pt-[14px] pb-[110px] flex flex-col gap-2.5">

          {/* GPS card */}
          <div className="rounded-[18px] px-[14px] py-3 flex items-center gap-2.5 border-[1.5px] bg-white shadow-[0_1px_4px_rgba(0,0,0,.04)] animate-fade-up"
            style={{ borderColor: gps.border }}>
            <div className="w-[38px] h-[38px] rounded-[12px] grid place-items-center flex-shrink-0"
              style={{ background: gps.bg }}>
              <IconPin />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="text-[12.5px] font-bold" style={{ color: gps.color }}>{gps.text}</div>
              <div className="text-[10.5px] font-medium text-slate-400 mt-px">{nearestOffice === 1 ? 'Head Office Alora' : 'Laundry IKM Pringgondani'} · maks {MAX_DIST_M}m</div>
            </div>
            <button
              className="w-8 h-8 rounded-[10px] border-[1.5px] bg-white/70 grid place-items-center cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={handleGpsRefresh} disabled={gpsRefreshing}
              style={{ borderColor: gps.border, color: gps.color }} title="Refresh lokasi">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ animation: gpsRefreshing ? 'spin 1s linear infinite' : 'none' }}>
                <path d="M17 10a7 7 0 1 1-1.34-4.09"/><polyline points="17,3 17,8 12,8"/>
              </svg>
            </button>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${gpsRefreshing || gpsState === 'loading' ? 'animate-pulse' : ''}`}
              style={{ background: gps.dot }} />
          </div>

          {/* Section header */}
          <div className="flex items-center justify-between py-1">
            <div className="text-[14px] font-extrabold text-slate-900 tracking-[-0.2px]">Absensi Shift</div>
            <div className="text-[11px] font-semibold text-slate-400">{SHIFTS.length} shift hari ini</div>
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

            const badgeStyle = hasOut
              ? 'bg-emerald-50 text-emerald-800'
              : hasIn
              ? 'bg-blue-50 text-blue-700'
              : 'bg-slate-50 text-slate-300';
            const badgeText = hasOut ? '✓ Selesai' : hasIn ? 'Berjalan' : 'Belum';

            return (
              <div key={shift.key}
                className={`bg-white rounded-[20px] overflow-hidden border-[1.5px] shadow-[0_1px_4px_rgba(0,0,0,.04)] transition-[border-color,box-shadow] animate-fade-up ${isActiveWin ? 'shadow-[0_4px_16px_rgba(0,0,0,.08)]' : ''}`}
                style={{ borderColor: isActiveWin ? shift.accent : 'transparent', animationDelay: `${idx * .05}s` }}>

                {/* Header */}
                <div className="px-[14px] pt-3 pb-2.5 flex items-center gap-2.5">
                  <div className="text-[18px] w-[38px] h-[38px] rounded-[12px] grid place-items-center flex-shrink-0"
                    style={{ background: shift.iconBg }}>
                    {shift.key === 'pagi' && '🌅'}
                    {shift.key === 'siang' && '☀️'}
                    {shift.key === 'sore' && '🌆'}
                    {shift.key === 'lembur' && '🌙'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-extrabold" style={{ color: shift.text }}>Shift {shift.label}</div>
                    <div className="text-[10.5px] font-medium text-slate-400 mt-px">{shift.inLabel} / {shift.outLabel}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {shift.optional && <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-slate-50 text-slate-400">Opsional</span>}
                    <span className={`text-[10px] font-bold tracking-[.02em] px-2.5 py-1 rounded-full whitespace-nowrap ${badgeStyle}`}>{badgeText}</span>
                  </div>
                </div>

                {/* Punch row */}
                <div className="grid grid-cols-2 gap-2 px-[14px] pb-[14px]">
                  {/* Masuk */}
                  <div className={`rounded-[14px] p-3 border-[1.5px] transition-[border-color] ${winIn ? 'border-blue-200 bg-[#F8FAFF]' : 'border-slate-100 bg-[#FAFBFC]'}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <IconIn />
                      <span className="text-[10px] font-bold uppercase tracking-[.06em] text-slate-400">Masuk</span>
                    </div>
                    <div className={`font-mono text-[20px] font-bold leading-none tabular-nums ${!hasIn ? 'text-slate-200 font-light' : 'text-slate-900'}`}>
                      {hasIn ? formatTime(rec.check_in_time) : '--:--'}
                    </div>
                    <div className="text-[10px] text-slate-300 font-medium mt-0.5">{shift.inLabel}</div>
                    {msgIn && <div className={`mt-1.5 text-[10.5px] font-semibold leading-snug px-2 py-1 rounded-lg ${msgIn.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-900'}`}>{msgIn.text}</div>}
                    <div className="mt-2">
                      {hasIn
                        ? <button className="w-full h-[34px] rounded-[10px] bg-green-50 text-green-700 border border-green-200 text-[11.5px] font-bold flex items-center justify-center gap-1.5" disabled><IconCheck /> Tercatat</button>
                        : winIn
                        ? <button className="w-full h-[34px] rounded-[10px] text-[11.5px] font-bold text-white flex items-center justify-center gap-1.5 transition active:scale-[.96] disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ background: inRange ? shift.accent : '#CBD5E1' }}
                            onClick={() => inRange && handlePunch(shift.key, 'in')}
                            disabled={loadIn || !inRange}>
                            {loadIn ? 'Simpan…' : inRange ? 'Masuk' : 'Diluar'}
                          </button>
                        : <button className="w-full h-[34px] rounded-[10px] bg-slate-50 text-slate-300 border border-slate-100 text-[11.5px] font-bold flex items-center justify-center" disabled>Masuk</button>
                      }
                    </div>
                  </div>

                  {/* Keluar */}
                  <div className={`rounded-[14px] p-3 border-[1.5px] transition-[border-color] ${winOut ? 'border-blue-200 bg-[#F8FAFF]' : 'border-slate-100 bg-[#FAFBFC]'}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <IconOut />
                      <span className="text-[10px] font-bold uppercase tracking-[.06em] text-slate-400">Keluar</span>
                    </div>
                    <div className={`font-mono text-[20px] font-bold leading-none tabular-nums ${!hasOut ? 'text-slate-200 font-light' : 'text-slate-900'}`}>
                      {hasOut ? formatTime(rec.check_out_time) : '--:--'}
                    </div>
                    <div className="text-[10px] text-slate-300 font-medium mt-0.5">{shift.outLabel}</div>
                    {msgOut && <div className={`mt-1.5 text-[10.5px] font-semibold leading-snug px-2 py-1 rounded-lg ${msgOut.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-900'}`}>{msgOut.text}</div>}
                    <div className="mt-2">
                      {hasOut
                        ? <button className="w-full h-[34px] rounded-[10px] bg-green-50 text-green-700 border border-green-200 text-[11.5px] font-bold flex items-center justify-center gap-1.5" disabled><IconCheck /> Tercatat</button>
                        : winOut
                        ? <button className="w-full h-[34px] rounded-[10px] text-[11.5px] font-bold text-white flex items-center justify-center gap-1.5 transition active:scale-[.96] disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ background: inRange && hasIn ? shift.accent : '#CBD5E1' }}
                            onClick={() => inRange && hasIn && handlePunch(shift.key, 'out')}
                            disabled={loadOut || !inRange || !hasIn}>
                            {loadOut ? 'Simpan…' : !hasIn ? 'Belum Masuk' : inRange ? 'Keluar' : 'Diluar'}
                          </button>
                        : <button className="w-full h-[34px] rounded-[10px] bg-slate-50 text-slate-300 border border-slate-100 text-[11.5px] font-bold flex items-center justify-center" disabled>Keluar</button>
                      }
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Notice */}
          <div className="bg-white rounded-[18px] px-4 py-[14px] flex items-start gap-3 shadow-[0_1px_3px_rgba(0,0,0,.04),0_0_0_1px_rgba(0,0,0,.03)] animate-fade-up">
            <div className="w-9 h-9 rounded-[10px] bg-slate-50 grid place-items-center text-slate-400 flex-shrink-0">
              <IconShield />
            </div>
            <div>
              <div className="text-[12.5px] font-bold text-slate-600 mb-0.5">Wajib di area kerja</div>
              <div className="text-[11px] text-slate-400 leading-[1.55] font-medium">
                Absensi hanya bisa dilakukan dalam radius {MAX_DIST_M}m dari lokasi kantor. Pastikan GPS aktif dan sinyal stabil.
              </div>
            </div>
          </div>

        </div>

        {/* ── Bottom nav ── */}
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center pointer-events-none">
          <div className="pointer-events-auto w-full max-w-[430px] bg-white/92 backdrop-blur-[20px] border-t border-slate-200/60 px-5 pt-1.5 pb-safe-6 shadow-[0_-4px_24px_rgba(0,0,0,.06)]">
            <nav className="grid grid-cols-3 gap-1">
              {[
                { to: '/', label: 'Beranda', Icon: IconHome },
                { to: '/history', label: 'Riwayat', Icon: IconHistory },
                { to: '/profile', label: 'Profil', Icon: IconUser },
              ].map(({ to, label, Icon }) => {
                const active = isActive(to);
                return (
                  <Link key={to} to={to}
                    className={`relative flex flex-col items-center gap-1 px-2 py-2 pb-1.5 rounded-[14px] no-underline text-[10px] font-semibold tracking-[.02em] transition ${active ? 'text-blue-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
                    {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-b-[3px] bg-blue-700"/>}
                    <Icon />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

      </div>
    </div>
  );
}