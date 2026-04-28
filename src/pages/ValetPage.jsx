import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import useAuthStore from '../store/authStore';

/* ── Office location ─────────────────────────────────────────────── */
const MAX_DIST_M = 100;
const MAX_DIST_HOSPITAL_M = 2000;
const getMaxDistForLoc = (nearestId) => (nearestId && nearestId > 3) ? MAX_DIST_HOSPITAL_M : MAX_DIST_M;

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

function getNearestOfficeInfo(lat, lng, locations) {
  if (!Array.isArray(locations) || locations.length === 0) {
    return { label: '-', distance: Infinity };
  }

  let nearestLocation = null;
  let minDistance = Infinity;

  for (const location of locations) {
    const latitude = parseFloat(location.latitude);
    const longitude = parseFloat(location.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const distance = haversineMeters(lat, lng, latitude, longitude);
    if (distance < minDistance) {
      minDistance = distance;
      nearestLocation = location;
    }
  }

  if (!nearestLocation) {
    return { label: '-', distance: Infinity };
  }

  return {
    label: nearestLocation.location_name || '-',
    distance: minDistance,
    nearestId: nearestLocation.id || null
  };
}

/* ── Shift helpers ───────────────────────────────────────────────── */
function timeStrToMin(t) {
  const parts = String(t).split(':').map(Number);
  return parts[0] * 60 + (parts[1] || 0);
}

function timeStrToLabel(t) {
  const parts = String(t).split(':').map(Number);
  return `${String(parts[0]).padStart(2, '0')}:${String(parts[1] || 0).padStart(2, '0')}`;
}

const SHIFT_STYLES = {
  pagi: { optional: false, bg: '#ECFEFF', border: '#A5F3FC', text: '#155E75', accent: '#06B6D4', iconBg: '#CFFAFE' },
  sore: { optional: false, bg: '#F0FDFA', border: '#99F6E4', text: '#0F766E', accent: '#14B8A6', iconBg: '#CCFBF1' },
};

function buildShiftsFromDB(rows) {
  return rows.map(row => {
    const key   = row.shift_name.toLowerCase();
    const label = row.shift_name.charAt(0).toUpperCase() + row.shift_name.slice(1).toLowerCase();
    const style = SHIFT_STYLES[key] || { optional: false, bg: '#F8FAFC', border: '#E2E8F0', text: '#334155', accent: '#64748B', iconBg: '#F1F5F9' };
    const outStart = timeStrToMin(row.check_out_start);
    const outEnd   = timeStrToMin(row.check_out_end);
    return {
      key,
      label,
      optional:    style.optional,
      inLabel:     `${timeStrToLabel(row.check_in_start)} – ${timeStrToLabel(row.check_in_end)}`,
      outLabel:    row.is_overnight
        ? `${timeStrToLabel(row.check_out_start)} – 03:59`
        : `${timeStrToLabel(row.check_out_start)} – ${timeStrToLabel(row.check_out_end)}`,
      inWin:       [timeStrToMin(row.check_in_start), timeStrToMin(row.check_in_end)],
      outWin:      row.is_overnight ? null : [outStart, outEnd],
      outWinStart: outStart,
      is_overnight: !!row.is_overnight,
      bg: style.bg, border: style.border, text: style.text, accent: style.accent, iconBg: style.iconBg,
    };
  });
}

function getCurrentMin() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function isInWindow(shift, punchType) {
  const m = getCurrentMin();
  if (punchType === 'in') return m >= shift.inWin[0] && m <= shift.inWin[1];
  if (shift.is_overnight) return m >= shift.outWinStart || m <= 239;
  return shift.outWin && m >= shift.outWin[0] && m <= shift.outWin[1];
}

/* ── Small helpers ───────────────────────────────────────────────── */
const initials = name => (!name ? '?' : name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase());
const titleCase = s => (!s ? '' : s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()));
const fmt2 = n => String(n).padStart(2, '0');
const formatTime = v => { if (!v) return null; const d = new Date(v); return `${fmt2(d.getHours())}:${fmt2(d.getMinutes())}`; };
const formatLiveDate = d => d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const formatStamp = (d) => {
  const dateId = d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const hh = fmt2(d.getHours());
  const mm = fmt2(d.getMinutes());
  const ss = fmt2(d.getSeconds());
  return `${dateId} ${hh}:${mm}:${ss} WIB`;
};

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
export default function ValetPage() {
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const authUser = useAuthStore(s => s.user);

  const [profile, setProfile] = useState(authUser || null);
  const [shiftData, setShiftData] = useState({});
  const [loadingShift, setLoadingShift] = useState(null);
  const [msgs, setMsgs] = useState({});
  const [now, setNow] = useState(new Date());
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const locationsRef = useRef([]);
  const lastGpsPosRef = useRef(null);
  const [locations, setLocations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [cameraStreamTick, setCameraStreamTick] = useState(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraErr, setCameraErr] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [pendingPunch, setPendingPunch] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { shiftKey, punchType, label }
  const [deletingPunch, setDeletingPunch] = useState(null);

  /* ── Cross-check warning state ── */
  const [crossWarning, setCrossWarning] = useState(false);
  const [crossDismissed, setCrossDismissed] = useState(false);

  /* ── Today leave lock ── */
  const [todayLeave, setTodayLeave] = useState(undefined);

  const canUseCamera = useMemo(() => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia), []);

  const stopCamera = useCallback(() => {
    const v = videoRef.current;
    const stream = cameraStreamRef.current || v?.srcObject;
    if (stream && typeof stream.getTracks === 'function') {
      stream.getTracks().forEach(t => t.stop());
    }
    if (v) v.srcObject = null;
    cameraStreamRef.current = null;
    setVideoReady(false);
  }, []);

  const openCamera = useCallback(async (mode = 'user') => {
    setCameraErr(null);
    setVideoReady(false);
    if (!canUseCamera) {
      setCameraErr('Browser tidak mendukung kamera.');
      return false;
    }

    const getStream = (videoConstraint) => navigator.mediaDevices.getUserMedia({
      video: videoConstraint,
      audio: false
    });

    try {
      setCameraOpen(true);

      let stream;
      try {
        stream = await getStream({ facingMode: { exact: mode } });
      } catch {
        try {
          stream = await getStream({ facingMode: mode });
        } catch {
          stream = await getStream(true);
        }
      }

      cameraStreamRef.current = stream;
      setCameraStreamTick((v) => v + 1);
      return true;
    } catch (e) {
      const errName = e?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraErr('Izin kamera ditolak.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraErr('Kamera tidak ditemukan di perangkat ini.');
      } else {
        setCameraErr('Izin kamera ditolak / kamera tidak tersedia.');
      }
      setCameraOpen(false);
      return false;
    }
  }, [canUseCamera]);

  const switchCamera = useCallback(async () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    stopCamera();
    setCameraErr(null);
    setVideoReady(false);
    const getStream = (c) => navigator.mediaDevices.getUserMedia({ video: c, audio: false });
    try {
      let stream;
      try { stream = await getStream({ facingMode: { exact: next } }); }
      catch { stream = await getStream(true); }
      cameraStreamRef.current = stream;
      setCameraStreamTick((v) => v + 1);
    } catch {
      setCameraErr('Gagal beralih kamera.');
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    const v = videoRef.current;
    const stream = cameraStreamRef.current;
    if (!cameraOpen || !v || !stream) return;
    if (v.srcObject !== stream) {
      v.srcObject = stream;
    }
    v.play().catch(() => { });
  }, [cameraOpen, cameraStreamTick]);

  const captureSelfieWithTimestamp = useCallback(async (officeLabel) => {
    const v = videoRef.current;
    if (!v) return null;

    const w = v.videoWidth;
    const h = v.videoHeight;
    if (!w || !h) return null;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0, w, h);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const stamp = formatStamp(new Date());
    const locationLine = `Lokasi: ${officeLabel || '-'}`;
    const pad = Math.max(14, Math.floor(Math.min(w, h) * 0.02));
    const primarySize = Math.max(14, Math.floor(Math.min(w, h) * 0.035));
    const secondarySize = Math.max(12, Math.floor(primarySize * 0.78));
    const lineGap = Math.max(4, Math.floor(primarySize * 0.35));
    ctx.textBaseline = 'alphabetic';
    ctx.font = `700 ${primarySize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    const stampW = ctx.measureText(stamp).width;
    ctx.font = `600 ${secondarySize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    const locationW = ctx.measureText(locationLine).width;
    const textW = Math.max(stampW, locationW);
    const boxW = textW + pad * 2;
    const boxH = pad * 2 + primarySize + lineGap + secondarySize;
    const x = pad;
    const y = h - boxH - pad;

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, y, boxW, boxH);
    ctx.fillStyle = 'white';
    ctx.font = `700 ${primarySize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.fillText(stamp, x + pad, y + pad + primarySize);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `600 ${secondarySize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.fillText(locationLine, x + pad, y + pad + primarySize + lineGap + secondarySize);

    return await new Promise(resolve => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
    });
  }, []);

  // GPS state
  const [gpsState, setGpsState] = useState('idle');
  const [gpsDist, setGpsDist] = useState(null);
  const [nearestOfficeLabel, setNearestOfficeLabel] = useState('-');
  const [, setGpsCoord] = useState(null);
  const [gpsRefreshKey, setGpsRefreshKey] = useState(0);
  const [gpsRefreshing, setGpsRefreshing] = useState(false);

  const displayName = titleCase(profile?.full_name || profile?.name || authUser?.full_name || authUser?.name || 'User');
  const role = profile?.position || profile?.department || 'Karyawan';
  const empId = profile?.employee_code || profile?.employee_id || '';

  useEffect(() => { document.title = 'Valet | IKM Mobile'; }, []);

  /* ── Clock tick ── */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── Fetch profile & today valet shifts ── */
  const fetchShifts = useCallback(() => {
    api.get('/valet/today-shifts').then(r => setShiftData(r.data.data || {})).catch(() => { });
  }, []);

  /* ── Auto-refresh shift data every 60 s (window open/close without reload) ── */
  useEffect(() => {
    const t = setInterval(() => fetchShifts(), 60_000);
    return () => clearInterval(t);
  }, [fetchShifts]);

  /* ── Fetch office locations from master ── */
  useEffect(() => {
    api.get('/locations').then(r => {
      const locs = r.data.data || [];
      setLocations(locs);
      locationsRef.current = locs;
    }).catch(() => {});
  }, []);

  /* ── Fetch shift definitions from master ── */
  useEffect(() => {
    api.get('/shifts/valet').then(r => {
      setShifts(buildShiftsFromDB(r.data.data || []));
    }).catch(() => {});
  }, []);

  /* ── Re-check GPS distance when locations load ── */
  useEffect(() => {
    if (locations.length > 0 && lastGpsPosRef.current) {
      const { lat, lng } = lastGpsPosRef.current;
      const officeInfo = getNearestOfficeInfo(lat, lng, locations);
      setGpsDist(officeInfo.distance);
      setNearestOfficeLabel(officeInfo.label);
      setGpsState(officeInfo.distance <= getMaxDistForLoc(officeInfo.nearestId) ? 'ok' : 'out');
      setGpsRefreshing(false);
    }
  }, [locations]);

  useEffect(() => {
    api.get('/auth/profile').then(r => setProfile(r.data.data)).catch(() => { });
    fetchShifts();
    api.get('/leave/today').then(r => setTodayLeave(r.data.data || null)).catch(() => setTodayLeave(null));
  }, [fetchShifts]);

  /* ── Cross-check: warn if user has normal attendance today ── */
  useEffect(() => {
    api.get('/attendance/check-cross').then(r => {
      if (r.data.data?.has_normal) {
        setCrossWarning(true);
      }
    }).catch(() => { });
  }, []);

  /* ── GPS watch ── */
  useEffect(() => {
    if (!navigator.geolocation) { setGpsState('denied'); return; }
    setGpsState('loading');
    setGpsRefreshing(true);

    let watchId = null;

    const onSuccess = (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      lastGpsPosRef.current = { lat, lng };
      setGpsCoord({ lat, lng });
      const locs = locationsRef.current;
      if (locs.length > 0) {
        const officeInfo = getNearestOfficeInfo(lat, lng, locs);
        setGpsDist(officeInfo.distance);
        setNearestOfficeLabel(officeInfo.label);
        setGpsState(officeInfo.distance <= getMaxDistForLoc(officeInfo.nearestId) ? 'ok' : 'out');
        setGpsRefreshing(false);
      }
    };

    const onError = (err) => {
      setGpsRefreshing(false);
      if (err.code === 1) setGpsState('denied');
      else setGpsState('error');
    };

    navigator.geolocation.getCurrentPosition(onSuccess, () => { }, { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 });

    watchId = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      { enableHighAccuracy: true, timeout: 30000, maximumAge: gpsRefreshKey === 0 ? 15000 : 0 }
    );

    return () => { if (watchId != null) navigator.geolocation.clearWatch(watchId); };
  }, [gpsRefreshKey]);

  /* ── Fresh GPS for punch ── */
  const getFreshCoord = () =>
    new Promise(resolve => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {
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

    const locs = locationsRef.current;
    if (locs.length === 0) {
      setMsgs(prev => ({ ...prev, [msgKey]: { text: 'Data lokasi belum tersedia, coba refresh halaman.', type: 'error' } }));
      setLoadingShift(null);
      return;
    }
    const officeInfo = getNearestOfficeInfo(coord.lat, coord.lng, locs);
    const dist = officeInfo.distance;
    if (dist > MAX_DIST_M) {
      setMsgs(prev => ({
        ...prev,
        [msgKey]: { text: `Anda ${Math.round(dist)}m dari lokasi. Maks ${MAX_DIST_M}m.`, type: 'error' },
      }));
      setLoadingShift(null);
      return;
    }

    // Open camera flow (mandatory selfie)
    setPendingPunch({ shiftKey, punchType, coord, msgKey, officeLabel: officeInfo.label });
    const ok = await openCamera(facingMode);
    if (!ok) {
      setMsgs(prev => ({ ...prev, [msgKey]: { text: 'Kamera tidak bisa dibuka. Izinkan akses kamera.', type: 'error' } }));
      setPendingPunch(null);
      setLoadingShift(null);
      return;
    }
  };

  const confirmSelfieAndSubmit = useCallback(async () => {
    if (!pendingPunch) return;
    const { shiftKey, punchType, coord, msgKey, officeLabel } = pendingPunch;

    try {
      setCameraErr(null);
      if (!videoReady) {
        setCameraErr('Kamera belum siap. Tunggu 1-2 detik sampai video tampil, lalu coba lagi.');
        return;
      }

      const blob = await captureSelfieWithTimestamp(officeLabel);
      if (!blob) {
        setCameraErr('Gagal mengambil foto. Pastikan video kamera sudah tampil, lalu coba lagi.');
        return;
      }

      const form = new FormData();
      form.append('shift_type', shiftKey);
      form.append('punch_type', punchType);
      form.append('lat', String(coord.lat));
      form.append('lng', String(coord.lng));
      form.append('selfie', blob, 'selfie.jpg');

      const res = await api.post('/valet/shift-punch-selfie', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMsgs(prev => ({ ...prev, [msgKey]: { text: res.data.message, type: 'success' } }));
      fetchShifts();
    } catch (e) {
      setMsgs(prev => ({
        ...prev,
        [pendingPunch.msgKey]: { text: e.response?.data?.message || e.message || 'Gagal menyimpan absensi', type: 'error' },
      }));
      setCameraErr(e.response?.data?.message || e.message || 'Gagal menyimpan absensi');
      return;
    }

    stopCamera();
    setCameraOpen(false);
    setPendingPunch(null);
    setLoadingShift(null);
  }, [pendingPunch, captureSelfieWithTimestamp, fetchShifts, stopCamera, videoReady]);

  const cancelCamera = useCallback(() => {
    if (pendingPunch?.msgKey) {
      setMsgs(prev => ({ ...prev, [pendingPunch.msgKey]: { text: 'Absen dibatalkan.', type: 'error' } }));
    }
    stopCamera();
    setCameraOpen(false);
    setPendingPunch(null);
    setLoadingShift(null);
  }, [pendingPunch, stopCamera]);

  const openPhotoPreview = useCallback((url, title) => {
    if (!url) return;
    setPhotoPreview({ url, title });
  }, []);

  const closePhotoPreview = useCallback(() => {
    setPhotoPreview(null);
  }, []);

  const handleDeletePunch = useCallback(async () => {
    if (!confirmDelete) return;
    const { shiftKey, punchType } = confirmDelete;
    const msgKey = `${shiftKey}-${punchType}`;
    setDeletingPunch(msgKey);
    try {
      await api.post('/valet/delete-punch', { shift_type: shiftKey, punch_type: punchType });
      setMsgs(prev => ({ ...prev, [msgKey]: { text: 'Absensi dihapus. Silakan absen ulang.', type: 'error' } }));
      fetchShifts();
    } catch (e) {
      setMsgs(prev => ({ ...prev, [msgKey]: { text: e.response?.data?.message || 'Gagal menghapus absensi', type: 'error' } }));
    }
    setDeletingPunch(null);
    setConfirmDelete(null);
  }, [confirmDelete, fetchShifts]);

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
    if (shifts.length === 0) return null;
    const m = getCurrentMin();
    for (const s of shifts) {
      if (m >= s.inWin[0] && m <= s.inWin[1]) return `Shift ${s.label} — Jam Masuk`;
      if (s.is_overnight && (m >= s.outWinStart || m <= 239)) return `Shift ${s.label} — Jam Keluar`;
      if (!s.is_overnight && s.outWin && m >= s.outWin[0] && m <= s.outWin[1]) return `Shift ${s.label} — Jam Keluar`;
    }
    return null;
  })();

  /* ── Live time ── */
  const liveTime = `${fmt2(now.getHours())}:${fmt2(now.getMinutes())}:${fmt2(now.getSeconds())}`;

  const isActive = (p) => routerLocation.pathname === p;

  /* ── Leave lock: full_day blocks valet attendance ── */
  const isLockedByLeave = todayLeave && todayLeave.duration_type === 'full_day';

  return (
    <div className="min-h-[100dvh] bg-slate-100 flex justify-center">
      <div className="w-full max-w-[430px] min-h-[100dvh] bg-slate-50 flex flex-col shadow-[0_0_0_1px_rgba(0,0,0,.04),0_8px_48px_rgba(0,0,0,.08)] relative overflow-hidden">

        {/* ── Leave Lock Modal ── */}
        {isLockedByLeave && (
          <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-[360px] bg-white rounded-[20px] overflow-hidden shadow-[0_16px_64px_rgba(0,0,0,.3)]">
              <div className="px-5 pt-5 pb-3 text-center">
                <div className="w-14 h-14 rounded-[16px] bg-amber-50 border-2 border-amber-200 grid place-items-center mx-auto mb-3">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
                <div className="text-[15px] font-extrabold text-slate-900 mb-1.5">Halaman Terkunci</div>
                <div className="text-[12.5px] text-slate-500 leading-[1.6] font-medium">
                  Anda mengajukan{' '}
                  <span className="font-bold text-amber-600">
                    {todayLeave.leave_type === 'izin' ? 'Izin' : todayLeave.leave_type === 'sakit' ? 'Izin Sakit' : 'Cuti'}
                  </span>{' '}
                  hari ini. Absensi valet tidak dapat dilakukan.{' '}
                  <span className={todayLeave.status === 'disetujui' ? 'text-emerald-600 font-semibold' : 'text-amber-500 font-semibold'}>
                    ({todayLeave.status === 'pengajuan' ? 'Menunggu Persetujuan' : 'Disetujui'})
                  </span>
                </div>
              </div>
              <div className="px-5 pb-5 pt-2 grid grid-cols-2 gap-2">
                <button
                  className="h-[42px] rounded-[12px] border border-slate-200 bg-white text-slate-700 text-[12.5px] font-extrabold transition hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate('/')}
                >
                  Beranda
                </button>
                <button
                  className="h-[42px] rounded-[12px] bg-amber-400 text-slate-900 text-[12.5px] font-extrabold transition hover:bg-amber-300 cursor-pointer"
                  onClick={() => navigate('/leave')}
                >
                  Lihat Izin
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cross-check warning modal */}
        {crossWarning && !crossDismissed && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-[360px] bg-white rounded-[20px] overflow-hidden shadow-[0_16px_64px_rgba(0,0,0,.3)]">
              <div className="px-5 pt-5 pb-3 text-center">
                <div className="w-14 h-14 rounded-[16px] bg-amber-50 border-2 border-amber-200 grid place-items-center mx-auto mb-3">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <div className="text-[15px] font-extrabold text-slate-900 mb-1.5">Peringatan</div>
                <div className="text-[12.5px] text-slate-500 leading-[1.6] font-medium">
                  Anda hari ini sudah melakukan absensi sebagai <span className="font-bold text-slate-700">shift normal</span>.
                  Apakah Anda yakin ingin melanjutkan absensi sebagai <span className="font-bold text-teal-700">Valet</span>?
                </div>
              </div>
              <div className="px-5 pb-5 pt-2 grid grid-cols-2 gap-2">
                <button
                  className="h-[42px] rounded-[12px] border border-slate-200 bg-white text-slate-700 text-[12.5px] font-extrabold transition hover:bg-slate-50"
                  onClick={() => navigate('/')}
                >
                  Kembali
                </button>
                <button
                  className="h-[42px] rounded-[12px] bg-teal-600 text-white text-[12.5px] font-extrabold transition hover:bg-teal-700"
                  onClick={() => setCrossDismissed(true)}
                >
                  Ya, Lanjutkan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Camera modal */}
        {cameraOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:p-4">
            <div className="w-full max-w-[430px] max-h-[calc(100dvh-24px)] bg-white rounded-[18px] overflow-hidden shadow-[0_12px_60px_rgba(0,0,0,.35)] flex flex-col">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                <div className="text-[13px] font-extrabold text-slate-900">Ambil Selfie Absensi Valet</div>
                <button
                  className="w-9 h-9 rounded-[12px] grid place-items-center border border-slate-200 bg-white text-slate-600"
                  onClick={cancelCamera}
                  type="button"
                  aria-label="Tutup"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M5 5l10 10M15 5L5 15" />
                  </svg>
                </button>
              </div>

              <div className="p-3 sm:p-4 overflow-y-auto">
                {cameraErr && (
                  <div className="mb-3 text-[11.5px] font-semibold px-3 py-2 rounded-xl bg-red-50 text-red-900 border border-red-100">
                    {cameraErr}
                  </div>
                )}
                <div className="rounded-[16px] overflow-hidden bg-black relative aspect-[3/4] sm:aspect-[4/5]">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    onLoadedMetadata={() => {
                      setVideoReady(true);
                      videoRef.current?.play?.().catch(() => { });
                    }}
                    onCanPlay={() => setVideoReady(true)}
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/50 grid place-items-center text-white"
                    aria-label="Ganti kamera"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 7h-3.5L14 4h-4L7.5 7H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z"/>
                      <circle cx="12" cy="13" r="3"/>
                    </svg>
                  </button>
                  <div className="absolute left-3 bottom-3 text-white px-2.5 py-1.5 rounded-xl"
                    style={{ background: 'rgba(0,0,0,0.55)' }}>
                    <div className="text-[11px] font-extrabold">{formatStamp(now)}</div>
                    <div className="text-[10px] font-semibold text-white/90 mt-0.5">Lokasi: {pendingPunch?.officeLabel || nearestOfficeLabel}</div>
                  </div>
                </div>
                {!videoReady && (
                  <div className="mt-2 text-[11px] font-semibold text-slate-500">
                    Menyiapkan kamera…
                  </div>
                )}
                <div className="mt-3 text-[11px] text-slate-500 font-medium leading-[1.5]">
                  Foto diambil langsung dari kamera dan akan otomatis diberi timestamp.
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sticky bottom-0 bg-white pt-1.5">
                  <button
                    className="h-[40px] rounded-[12px] border border-slate-200 bg-white text-slate-700 text-[12px] font-extrabold"
                    onClick={cancelCamera}
                    type="button"
                  >
                    Batal
                  </button>
                  <button
                    className="h-[40px] rounded-[12px] bg-teal-600 text-white text-[12px] font-extrabold disabled:opacity-50"
                    onClick={confirmSelfieAndSubmit}
                    type="button"
                    disabled={!pendingPunch || !videoReady}
                  >
                    {videoReady ? 'Ambil & Kirim' : 'Menyiapkan...'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete punch confirmation modal */}
        {confirmDelete && (
          <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-[340px] bg-white rounded-[20px] overflow-hidden shadow-[0_16px_64px_rgba(0,0,0,.3)]">
              <div className="px-5 pt-5 pb-3 text-center">
                <div className="w-14 h-14 rounded-[16px] bg-red-50 border-2 border-red-200 grid place-items-center mx-auto mb-3">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                  </svg>
                </div>
                <div className="text-[15px] font-extrabold text-slate-900 mb-1.5">Hapus & Ulang Absen?</div>
                <div className="text-[12.5px] text-slate-500 leading-[1.6] font-medium">
                  Data absen <span className="font-bold text-slate-700">{confirmDelete.label}</span> akan dihapus.
                  Anda perlu foto selfie ulang. Lanjutkan?
                </div>
              </div>
              <div className="px-5 pb-5 pt-2 grid grid-cols-2 gap-2">
                <button
                  className="h-[42px] rounded-[12px] border border-slate-200 bg-white text-slate-700 text-[12.5px] font-extrabold transition hover:bg-slate-50 cursor-pointer"
                  onClick={() => setConfirmDelete(null)}
                >
                  Batal
                </button>
                <button
                  className="h-[42px] rounded-[12px] bg-red-500 text-white text-[12.5px] font-extrabold transition hover:bg-red-600 disabled:opacity-50 cursor-pointer"
                  onClick={handleDeletePunch}
                  disabled={!!deletingPunch}
                >
                  {deletingPunch ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Photo preview modal */}
        {photoPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-3 py-4"
            onClick={closePhotoPreview}>
            <div className="w-full max-w-[430px] max-h-[calc(100dvh-24px)] bg-white rounded-[18px] overflow-hidden shadow-[0_12px_60px_rgba(0,0,0,.35)] flex flex-col"
              onClick={(e) => e.stopPropagation()}>
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="text-[13px] font-extrabold text-slate-900 truncate pr-3">{photoPreview.title || 'Foto Absensi Valet'}</div>
                <button
                  className="w-9 h-9 rounded-[12px] grid place-items-center border border-slate-200 bg-white text-slate-600"
                  onClick={closePhotoPreview}
                  type="button"
                  aria-label="Tutup"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M5 5l10 10M15 5L5 15" />
                  </svg>
                </button>
              </div>
              <div className="p-3 sm:p-4 overflow-y-auto">
                <div className="rounded-[16px] overflow-hidden bg-slate-100 border border-slate-200">
                  <img
                    src={photoPreview.url}
                    alt={photoPreview.title || 'Foto absensi valet'}
                    className="w-full h-auto max-h-[72dvh] object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Hero ── */}
        <div className="relative overflow-hidden rounded-b-[28px] flex-shrink-0 pb-[22px]"
          style={{ background: 'linear-gradient(160deg, #0F172A 0%, #164E63 35%, #0E7490 70%, #06B6D4 100%)' }}>
          <div className="absolute -top-[70px] -right-[40px] w-[200px] h-[200px] rounded-full animate-pulse"
            style={{ background: 'radial-gradient(circle, rgba(34,211,238,.28) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-[30px] -left-[30px] w-[140px] h-[140px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(45,212,191,.18) 0%, transparent 70%)' }} />
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
        <div className="flex-1 overflow-y-auto px-3 sm:px-[14px] pt-3 sm:pt-[14px] pb-[calc(110px+env(safe-area-inset-bottom))] flex flex-col gap-2.5">

          {/* GPS card */}
          <div className="rounded-[18px] px-[14px] py-3 flex items-center gap-2.5 border-[1.5px] bg-white shadow-[0_1px_4px_rgba(0,0,0,.04)] animate-fade-up"
            style={{ borderColor: gps.border }}>
            <div className="w-[38px] h-[38px] rounded-[12px] grid place-items-center flex-shrink-0"
              style={{ background: gps.bg }}>
              <IconPin />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="text-[12.5px] font-bold" style={{ color: gps.color }}>{gps.text}</div>
              <div className="text-[10.5px] font-medium text-slate-400 mt-px">{nearestOfficeLabel} · maks {MAX_DIST_M}m</div>
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
          <div className="flex items-center justify-between py-1 gap-2">
            <div className="text-[14px] font-extrabold text-teal-800 tracking-[-0.2px]">Absen Karyawan Valet</div>
            <div className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">{shifts.length} shift hari ini</div>
          </div>

          {/* Shift cards */}
          {shifts.map((shift, idx) => {
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
            const checkInPhotoUrl = rec.check_in_photo_url || null;
            const checkOutPhotoUrl = rec.check_out_photo_url || null;
            const canRetryIn = !hasOut && winIn;   // Ulang masuk: hanya saat window masuk masih buka
            const canRetryOut = winOut;            // Ulang keluar: hanya saat window keluar masih buka

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
                <div className="px-[14px] pt-3 pb-2.5 flex items-center gap-2.5 max-[360px]:items-start">
                  <div className="text-[18px] w-[38px] h-[38px] rounded-[12px] grid place-items-center flex-shrink-0"
                    style={{ background: shift.iconBg }}>
                    {shift.key === 'pagi' && '🌅'}
                    {shift.key === 'sore' && '🌆'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-extrabold" style={{ color: shift.text }}>Shift {shift.label}</div>
                    <div className="text-[10.5px] font-medium text-slate-400 mt-px">{shift.inLabel} / {shift.outLabel}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 max-[360px]:flex-col max-[360px]:items-end max-[360px]:gap-1">
                    {shift.optional && <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-slate-50 text-slate-400">Opsional</span>}
                    <span className={`text-[10px] font-bold tracking-[.02em] px-2.5 py-1 rounded-full whitespace-nowrap ${badgeStyle}`}>{badgeText}</span>
                  </div>
                </div>

                {/* Punch row */}
                <div className="grid grid-cols-2 max-[360px]:grid-cols-1 gap-2 px-[14px] pb-[14px]">
                  {/* Masuk */}
                  <div className={`rounded-[14px] p-3 border-[1.5px] transition-[border-color] ${winIn ? 'border-teal-200 bg-[#F0FDFA]' : 'border-slate-100 bg-[#FAFBFC]'}`}>
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
                    {hasIn && checkInPhotoUrl && (
                      <div className={`mt-1.5 ${canRetryIn ? 'grid grid-cols-2 gap-1.5' : ''}`}>
                        <button
                          type="button"
                          onClick={() => openPhotoPreview(checkInPhotoUrl, `Foto Masuk Valet Shift ${shift.label}`)}
                          className={`h-[30px] rounded-[9px] border border-teal-200 bg-teal-50 text-teal-700 text-[10.5px] font-bold tracking-[.02em] flex items-center justify-center gap-1 transition hover:bg-teal-100 active:scale-[.98] ${canRetryIn ? '' : 'w-full'}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1.5 10s3.2-5 8.5-5 8.5 5 8.5 5-3.2 5-8.5 5-8.5-5-8.5-5z" />
                            <circle cx="10" cy="10" r="2.4" />
                          </svg>
                          Lihat Foto
                        </button>
                        {canRetryIn && (
                          <button
                            type="button"
                            onClick={() => setConfirmDelete({ shiftKey: shift.key, punchType: 'in', label: `Masuk Valet Shift ${shift.label}` })}
                            className="h-[30px] rounded-[9px] border border-red-200 bg-red-50 text-red-600 text-[10.5px] font-bold tracking-[.02em] flex items-center justify-center gap-1 transition hover:bg-red-100 active:scale-[.98]"
                          >
                            <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3,6 5,6 17,6"/><path d="M16 6l-.867 11.142A2 2 0 0113.138 19H6.862a2 2 0 01-1.995-1.858L4 6"/>
                            </svg>
                            Ulang
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Keluar */}
                  <div className={`rounded-[14px] p-3 border-[1.5px] transition-[border-color] ${winOut ? 'border-teal-200 bg-[#F0FDFA]' : 'border-slate-100 bg-[#FAFBFC]'}`}>
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
                    {hasOut && checkOutPhotoUrl && (
                      <div className={`mt-1.5 ${canRetryOut ? 'grid grid-cols-2 gap-1.5' : ''}`}>
                        <button
                          type="button"
                          onClick={() => openPhotoPreview(checkOutPhotoUrl, `Foto Keluar Valet Shift ${shift.label}`)}
                          className={`h-[30px] rounded-[9px] border border-teal-200 bg-teal-50 text-teal-700 text-[10.5px] font-bold tracking-[.02em] flex items-center justify-center gap-1 transition hover:bg-teal-100 active:scale-[.98] ${canRetryOut ? '' : 'w-full'}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1.5 10s3.2-5 8.5-5 8.5 5 8.5 5-3.2 5-8.5 5-8.5-5-8.5-5z" />
                            <circle cx="10" cy="10" r="2.4" />
                          </svg>
                          Lihat Foto
                        </button>
                        {canRetryOut && (
                          <button
                            type="button"
                            onClick={() => setConfirmDelete({ shiftKey: shift.key, punchType: 'out', label: `Keluar Valet Shift ${shift.label}` })}
                            className="h-[30px] rounded-[9px] border border-red-200 bg-red-50 text-red-600 text-[10.5px] font-bold tracking-[.02em] flex items-center justify-center gap-1 transition hover:bg-red-100 active:scale-[.98]"
                          >
                            <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3,6 5,6 17,6"/><path d="M16 6l-.867 11.142A2 2 0 0113.138 19H6.862a2 2 0 01-1.995-1.858L4 6"/>
                            </svg>
                            Ulang
                          </button>
                        )}
                      </div>
                    )}
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
                Absensi valet hanya bisa dilakukan dalam radius {MAX_DIST_M}m dari lokasi kantor. Pastikan GPS aktif dan sinyal stabil.
              </div>
            </div>
          </div>

        </div>

        {/* ── Bottom nav ── */}
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center pointer-events-none">
          <div className="pointer-events-auto w-full max-w-[430px] bg-white/92 backdrop-blur-[20px] border-t border-slate-200/60 px-4 sm:px-5 pt-1.5 shadow-[0_-4px_24px_rgba(0,0,0,.06)]"
            style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
            <nav className="grid grid-cols-3 gap-1">
              {[
                { to: '/', label: 'Beranda', Icon: IconHome },
                { to: '/history', label: 'Riwayat', Icon: IconHistory },
                { to: '/profile', label: 'Profil', Icon: IconUser },
              ].map(({ to, label, Icon }) => {
                const active = isActive(to);
                return (
                  <Link key={to} to={to}
                    className={`relative flex flex-col items-center gap-1 px-2 py-2 pb-1.5 rounded-[14px] no-underline text-[10px] font-semibold tracking-[.02em] transition ${active ? 'text-teal-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
                    {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-b-[3px] bg-teal-700"/>}
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
