import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import useAuthStore from '../store/authStore';

/* ── Helpers ─────────────────────────────────────────────────────── */
const fmt2 = n => String(n).padStart(2, '0');
const titleCase = s => (!s ? '' : s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()));
const initials = name => (!name ? '?' : name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase());

const fmtTime = v => {
    if (!v) return null;
    const d = new Date(v);
    return `${fmt2(d.getHours())}:${fmt2(d.getMinutes())}`;
};
const fmtDateFull = v => {
    if (!v) return null;
    const d = new Date(v);
    return `${fmt2(d.getDate())}/${fmt2(d.getMonth() + 1)}/${d.getFullYear()} ${fmt2(d.getHours())}:${fmt2(d.getMinutes())}`;
};
const formatLiveDate = d => d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const formatStamp = d => {
    const dateId = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${dateId} ${fmt2(d.getHours())}:${fmt2(d.getMinutes())}:${fmt2(d.getSeconds())} WIB`;
};

/* ── Icons ───────────────────────────────────────────────────────── */
const IconHome = () => (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" /><path d="M7.5 18V12.5h5V18" />
    </svg>
);
const IconHistory = () => (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="7.5" /><polyline points="10,6 10,10 13,12" />
    </svg>
);
const IconUser = () => (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="7" r="4" /><path d="M3 17c0-3 3.13-5 7-5s7 2 7 5" />
    </svg>
);
const IconCheck = () => (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4,10 8,14 16,6" />
    </svg>
);

/* ══════════════════════════════════════════════════════════════════ */
export default function ManagementAbsensiPage() {
    const routerLocation = useLocation();
    const navigate = useNavigate();
    const authUser = useAuthStore(s => s.user);

    /* ── Role guard ───────────────────────────────────────────────── */
    const [checking, setChecking] = useState(true);
    const [denied, setDenied] = useState(false);

    /* ── Profile & Data ───────────────────────────────────────────── */
    const [profile, setProfile] = useState(authUser || null);
    const [todayData, setTodayData] = useState(null);
    const [now, setNow] = useState(new Date());

    /* ── Camera state (mirrors AbsensiPage) ───────────────────────── */
    const videoRef = useRef(null);
    const cameraStreamRef = useRef(null);
    const [cameraStreamTick, setCameraStreamTick] = useState(0);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [cameraErr, setCameraErr] = useState(null);
    const [videoReady, setVideoReady] = useState(false);
    const [facingMode, setFacingMode] = useState('user');
    const [pendingPunch, setPendingPunch] = useState(null); // { punchType }

    /* ── Messages per punch ───────────────────────────────────────── */
    const [msgIn, setMsgIn] = useState(null);   // { text, type }
    const [msgOut, setMsgOut] = useState(null);
    const [loadingPunch, setLoadingPunch] = useState(null); // 'in' | 'out' | null

    /* ── Photo preview & delete modals ───────────────────────────── */
    const [photoPreview, setPhotoPreview] = useState(null); // { url, title }
    const [confirmDelete, setConfirmDelete] = useState(null); // { punchType, label }
    const [deletingPunch, setDeletingPunch] = useState(null);

    const canUseCamera = useMemo(() => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia), []);

    const displayName = titleCase(profile?.full_name || profile?.name || authUser?.full_name || authUser?.name || 'User');
    const empId = profile?.employee_code || profile?.employee_id || '';
    const liveTime = `${fmt2(now.getHours())}:${fmt2(now.getMinutes())}:${fmt2(now.getSeconds())}`;
    const isActive = (p) => routerLocation.pathname === p;

    /* ── Camera helpers (identical to AbsensiPage) ────────────────── */
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
        if (!canUseCamera) { setCameraErr('Browser tidak mendukung kamera.'); return false; }

        const getStream = c => navigator.mediaDevices.getUserMedia({ video: c, audio: false });
        try {
            setCameraOpen(true);
            let stream;
            try { stream = await getStream({ facingMode: { exact: mode } }); }
            catch { try { stream = await getStream({ facingMode: mode }); } catch { stream = await getStream(true); } }
            cameraStreamRef.current = stream;
            setCameraStreamTick(v => v + 1);
            return true;
        } catch (e) {
            const n = e?.name || '';
            if (n === 'NotAllowedError' || n === 'PermissionDeniedError') setCameraErr('Izin kamera ditolak.');
            else if (n === 'NotFoundError' || n === 'DevicesNotFoundError') setCameraErr('Kamera tidak ditemukan.');
            else setCameraErr('Izin kamera ditolak / kamera tidak tersedia.');
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
        const getStream = c => navigator.mediaDevices.getUserMedia({ video: c, audio: false });
        try {
            let stream;
            try { stream = await getStream({ facingMode: { exact: next } }); }
            catch { stream = await getStream(true); }
            cameraStreamRef.current = stream;
            setCameraStreamTick(v => v + 1);
        } catch {
            setCameraErr('Gagal beralih kamera.');
        }
    }, [facingMode, stopCamera]);

    /* Attach stream when modal + video are ready */
    useEffect(() => {
        const v = videoRef.current;
        const stream = cameraStreamRef.current;
        if (!cameraOpen || !v || !stream) return;
        if (v.srcObject !== stream) v.srcObject = stream;
        v.play().catch(() => { });
    }, [cameraOpen, cameraStreamTick]);

    /* Cleanup on unmount */
    useEffect(() => () => stopCamera(), [stopCamera]);

    /* ── Capture selfie with timestamp overlay (same as AbsensiPage) ── */
    const captureSelfieWithTimestamp = useCallback(async () => {
        const v = videoRef.current;
        if (!v) return null;
        const w = v.videoWidth, h = v.videoHeight;
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
        const locationLine = 'Lokasi: IKM Management';
        const pad = Math.max(14, Math.floor(Math.min(w, h) * 0.02));
        const primarySize = Math.max(14, Math.floor(Math.min(w, h) * 0.035));
        const secondarySize = Math.max(12, Math.floor(primarySize * 0.78));
        const lineGap = Math.max(4, Math.floor(primarySize * 0.35));
        ctx.textBaseline = 'alphabetic';
        ctx.font = `700 ${primarySize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
        const stampW = ctx.measureText(stamp).width;
        ctx.font = `600 ${secondarySize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
        const locW = ctx.measureText(locationLine).width;
        const textW = Math.max(stampW, locW);
        const boxW = textW + pad * 2;
        const boxH = pad * 2 + primarySize + lineGap + secondarySize;
        const x = pad, y = h - boxH - pad;

        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(x, y, boxW, boxH);
        ctx.fillStyle = 'white';
        ctx.font = `700 ${primarySize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
        ctx.fillText(stamp, x + pad, y + pad + primarySize);
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.font = `600 ${secondarySize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
        ctx.fillText(locationLine, x + pad, y + pad + primarySize + lineGap + secondarySize);

        return await new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.9));
    }, []);

    /* ── Fetch today's data ─────────────────────────────────────────── */
    const fetchToday = useCallback(async () => {
        try {
            const r = await api.get('/management-attendance/today');
            setTodayData(r.data?.data || null);
        } catch { /* ignore */ }
    }, []);

    /* ── Init ───────────────────────────────────────────────────────── */
    useEffect(() => {
        document.title = 'Absensi Management | IKM Mobile';
        api.get('/auth/leader-role')
            .then(r => { if (r.data?.data?.role !== 'management') setDenied(true); })
            .catch(() => setDenied(true))
            .finally(() => setChecking(false));
    }, []);

    useEffect(() => {
        if (!checking && !denied) {
            api.get('/auth/profile').then(r => setProfile(r.data.data)).catch(() => { });
            // eslint-disable-next-line react-hooks/set-state-in-effect
            fetchToday();
        }
    }, [checking, denied, fetchToday]);

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    /* ── Punch handler ──────────────────────────────────────────────── */
    const handlePunch = async (punchType) => {
        const setMsg = punchType === 'in' ? setMsgIn : setMsgOut;
        setMsg(null);
        setLoadingPunch(punchType);

        setPendingPunch({ punchType });
        const ok = await openCamera(facingMode);
        if (!ok) {
            setMsg({ text: 'Kamera tidak bisa dibuka. Izinkan akses kamera.', type: 'error' });
            setPendingPunch(null);
            setLoadingPunch(null);
        }
    };

    const confirmSelfieAndSubmit = useCallback(async () => {
        if (!pendingPunch) return;
        const { punchType } = pendingPunch;
        const setMsg = punchType === 'in' ? setMsgIn : setMsgOut;

        if (!videoReady) {
            setCameraErr('Kamera belum siap. Tunggu 1-2 detik sampai video tampil, lalu coba lagi.');
            return;
        }

        setCameraErr(null);
        try {
            const blob = await captureSelfieWithTimestamp();
            if (!blob) { setCameraErr('Gagal mengambil foto. Pastikan video kamera sudah tampil.'); return; }

            const form = new FormData();
            form.append('punch_type', punchType);
            form.append('selfie', blob, 'selfie.jpg');

            const r = await api.post('/management-attendance/punch-selfie', form, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMsg({ text: r.data.message, type: 'success' });
            fetchToday();
        } catch (e) {
            const errMsg = e.response?.data?.message || e.message || 'Gagal menyimpan absensi';
            setMsg({ text: errMsg, type: 'error' });
            setCameraErr(errMsg);
            return;
        }

        stopCamera();
        setCameraOpen(false);
        setPendingPunch(null);
        setLoadingPunch(null);
    }, [pendingPunch, captureSelfieWithTimestamp, fetchToday, stopCamera, videoReady]);

    const cancelCamera = useCallback(() => {
        if (pendingPunch) {
            const setMsg = pendingPunch.punchType === 'in' ? setMsgIn : setMsgOut;
            setMsg({ text: 'Absen dibatalkan.', type: 'error' });
        }
        stopCamera();
        setCameraOpen(false);
        setPendingPunch(null);
        setLoadingPunch(null);
    }, [pendingPunch, stopCamera]);

    /* ── Delete handler ─────────────────────────────────────────────── */
    const handleDeletePunch = useCallback(async () => {
        if (!confirmDelete) return;
        const { punchType } = confirmDelete;
        const setMsg = punchType === 'in' ? setMsgIn : setMsgOut;
        setDeletingPunch(punchType);
        try {
            await api.post('/management-attendance/delete-punch', { punch_type: punchType });
            setMsg({ text: 'Absensi dihapus. Silakan absen ulang.', type: 'error' });
            fetchToday();
        } catch (e) {
            setMsg({ text: e.response?.data?.message || 'Gagal menghapus absensi', type: 'error' });
        }
        setDeletingPunch(null);
        setConfirmDelete(null);
    }, [confirmDelete, fetchToday]);

    /* ── Computed ────────────────────────────────────────────────────── */
    const hasIn  = !!todayData?.check_in_time;
    const hasOut = !!todayData?.check_out_time;
    const isComplete = hasIn && hasOut;

    /* ── Loading state ───────────────────────────────────────────────── */
    if (checking) {
        return (
            <div className="min-h-[100dvh] bg-slate-100 flex justify-center">
                <div className="w-full max-w-[430px] min-h-[100dvh] bg-white flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round">
                            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity=".25" />
                            <path d="M21 12a9 9 0 00-9-9" />
                        </svg>
                        <span className="text-[13px] text-slate-400 font-medium">Memverifikasi akses…</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-slate-100 flex justify-center">
            <div className="w-full max-w-[430px] min-h-[100dvh] bg-slate-50 flex flex-col shadow-[0_0_0_1px_rgba(0,0,0,.04),0_8px_48px_rgba(0,0,0,.08)] relative overflow-hidden">

                {/* ══════════════ MODALS ══════════════ */}

                {/* Camera modal — bottom sheet, same style as AbsensiPage */}
                {cameraOpen && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:p-4">
                        <div className="w-full max-w-[430px] max-h-[calc(100dvh-24px)] bg-white rounded-[18px] overflow-hidden shadow-[0_12px_60px_rgba(0,0,0,.35)] flex flex-col">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                                <div className="text-[13px] font-extrabold text-slate-900">
                                    Selfie — Absen {pendingPunch?.punchType === 'in' ? 'Masuk' : 'Keluar'}
                                </div>
                                <button
                                    className="w-9 h-9 rounded-[12px] grid place-items-center border border-slate-200 bg-white text-slate-600 cursor-pointer"
                                    onClick={cancelCamera} type="button" aria-label="Tutup">
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
                                        playsInline muted autoPlay
                                        onLoadedMetadata={() => { setVideoReady(true); videoRef.current?.play?.().catch(() => { }); }}
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
                                        <div className="text-[10px] font-semibold text-white/90 mt-0.5">Lokasi: IKM Management</div>
                                    </div>
                                </div>
                                {!videoReady && (
                                    <div className="mt-2 text-[11px] font-semibold text-slate-500">Menyiapkan kamera…</div>
                                )}
                                <div className="mt-3 text-[11px] text-slate-500 font-medium leading-[1.5]">
                                    Foto diambil langsung dari kamera dan akan otomatis diberi timestamp.
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2 sticky bottom-0 bg-white pt-1.5">
                                    <button className="h-[40px] rounded-[12px] border border-slate-200 bg-white text-slate-700 text-[12px] font-extrabold cursor-pointer"
                                        onClick={cancelCamera} type="button">
                                        Batal
                                    </button>
                                    <button
                                        className="h-[40px] rounded-[12px] bg-blue-600 text-white text-[12px] font-extrabold disabled:opacity-50 cursor-pointer"
                                        onClick={confirmSelfieAndSubmit} type="button"
                                        disabled={!pendingPunch || !videoReady}>
                                        {videoReady ? 'Ambil & Kirim' : 'Menyiapkan...'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete confirmation modal — same style as AbsensiPage */}
                {confirmDelete && (
                    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 px-4">
                        <div className="w-full max-w-[340px] bg-white rounded-[20px] overflow-hidden shadow-[0_16px_64px_rgba(0,0,0,.3)]">
                            <div className="px-5 pt-5 pb-3 text-center">
                                <div className="w-14 h-14 rounded-[16px] bg-red-50 border-2 border-red-200 grid place-items-center mx-auto mb-3">
                                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3,6 5,6 21,6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                                        <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
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
                                    onClick={() => setConfirmDelete(null)}>
                                    Batal
                                </button>
                                <button
                                    className="h-[42px] rounded-[12px] bg-red-500 text-white text-[12.5px] font-extrabold transition hover:bg-red-600 disabled:opacity-50 cursor-pointer"
                                    onClick={handleDeletePunch} disabled={!!deletingPunch}>
                                    {deletingPunch ? 'Menghapus...' : 'Ya, Hapus'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Photo preview modal — same style as AbsensiPage */}
                {photoPreview && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-3 py-4"
                        onClick={() => setPhotoPreview(null)}>
                        <div className="w-full max-w-[430px] max-h-[calc(100dvh-24px)] bg-white rounded-[18px] overflow-hidden shadow-[0_12px_60px_rgba(0,0,0,.35)] flex flex-col"
                            onClick={e => e.stopPropagation()}>
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                <div className="text-[13px] font-extrabold text-slate-900 truncate pr-3">{photoPreview.title || 'Foto Absensi'}</div>
                                <button
                                    className="w-9 h-9 rounded-[12px] grid place-items-center border border-slate-200 bg-white text-slate-600 cursor-pointer"
                                    onClick={() => setPhotoPreview(null)} type="button" aria-label="Tutup">
                                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <path d="M5 5l10 10M15 5L5 15" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-3 sm:p-4 overflow-y-auto">
                                <div className="rounded-[16px] overflow-hidden bg-slate-100 border border-slate-200">
                                    <img src={photoPreview.url} alt={photoPreview.title} className="w-full h-auto max-h-[72dvh] object-contain" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Denied overlay */}
                {denied && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[3px] px-5">
                        <div className="w-full max-w-[320px] bg-white rounded-[20px] overflow-hidden shadow-[0_16px_64px_rgba(0,0,0,.3)]">
                            <div className="px-5 pt-5 pb-3 text-center">
                                <div className="w-14 h-14 rounded-[16px] bg-red-50 border-2 border-red-200 grid place-items-center mx-auto mb-3">
                                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round">
                                        <circle cx="12" cy="12" r="9" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <circle cx="12" cy="16" r=".6" fill="#EF4444" />
                                    </svg>
                                </div>
                                <div className="text-[15px] font-extrabold text-slate-900 mb-1.5">Akses Ditolak</div>
                                <div className="text-[12.5px] text-slate-500 leading-[1.6] font-medium">
                                    Hanya <span className="font-bold text-slate-700">Tim Manajemen</span> yang bisa membuka halaman ini.
                                </div>
                            </div>
                            <div className="px-5 pb-5 pt-2">
                                <button onClick={() => navigate('/')}
                                    className="w-full h-[42px] rounded-[12px] bg-blue-600 text-white text-[13.5px] font-extrabold cursor-pointer transition hover:bg-blue-700">
                                    Kembali ke Beranda
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════ HERO HEADER ══════════════ */}
                <div className="relative overflow-hidden rounded-b-[28px] flex-shrink-0 pb-[22px]"
                    style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1E3A5F 35%, #1D4ED8 70%, #60A5FA 100%)' }}>
                    <div className="absolute -top-[70px] -right-[40px] w-[200px] h-[200px] rounded-full animate-pulse"
                        style={{ background: 'radial-gradient(circle, rgba(96,165,250,.3) 0%, transparent 70%)' }} />
                    <div className="absolute -bottom-[30px] -left-[30px] w-[140px] h-[140px] rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(147,197,253,.2) 0%, transparent 70%)' }} />
                    <div className="absolute inset-0 pointer-events-none opacity-[.04]"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                    {/* Top row */}
                    <div className="relative z-[1] flex items-center justify-between px-[18px] pt-[14px]">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <Link to="/" aria-label="Kembali"
                                className="w-9 h-9 rounded-[11px] bg-white/10 border border-white/12 text-white grid place-items-center flex-shrink-0 transition hover:bg-white/20 no-underline backdrop-blur-xl">
                                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="12,15 7,10 12,5" />
                                </svg>
                            </Link>
                            <div className="min-w-0 overflow-hidden">
                                <div className="text-[14px] font-extrabold text-white truncate">{displayName}</div>
                                <div className="text-[10.5px] text-white/50 font-medium truncate mt-px">
                                    Management{empId && ` · ${empId}`}
                                </div>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-[12px] bg-white/15 border-2 border-white/20 text-white text-[13px] font-extrabold grid place-items-center flex-shrink-0 backdrop-blur-xl overflow-hidden">
                            {profile?.profile_url
                                ? <img src={profile.profile_url} alt="foto" className="w-full h-full object-cover" />
                                : initials(displayName)}
                        </div>
                    </div>

                    {/* Clock row */}
                    <div className="relative z-[1] flex items-end justify-between px-[18px] pt-[14px]">
                        <div>
                            <div className="font-mono text-[26px] font-bold text-white tracking-[-1px] leading-none">{liveTime}</div>
                            <div className="text-[11.5px] text-white/45 font-medium mt-1">{formatLiveDate(now)}</div>
                        </div>
                        <div className="text-[10px] font-bold tracking-[.03em] px-2.5 py-[5px] rounded-full bg-white/12 text-white/85 border border-white/10 whitespace-nowrap flex-shrink-0 backdrop-blur-md">
                            {isComplete ? '✓ Hadir Lengkap' : hasIn ? 'Sudah Masuk' : 'Belum Absen'}
                        </div>
                    </div>
                </div>

                {/* ══════════════ CONTENT ══════════════ */}
                <div className="flex-1 overflow-y-auto px-3 sm:px-[14px] pt-3 sm:pt-[14px] pb-[calc(110px+env(safe-area-inset-bottom))] flex flex-col gap-2.5">

                    {/* Info notice — no GPS */}
                    <div className="rounded-[18px] px-[14px] py-3 flex items-center gap-2.5 border-[1.5px] bg-white shadow-[0_1px_4px_rgba(0,0,0,.04)] border-blue-100">
                        <div className="w-[38px] h-[38px] rounded-[12px] grid place-items-center flex-shrink-0 bg-blue-50">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="9" />
                                <line x1="12" y1="8" x2="12" y2="8.5" strokeWidth="2.5" />
                                <line x1="12" y1="12" x2="12" y2="17" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[12.5px] font-bold text-blue-700">Absensi Bebas Lokasi</div>
                            <div className="text-[10.5px] font-medium text-slate-400 mt-px">Tim manajemen dapat absen dari mana saja · Selfie wajib</div>
                        </div>
                    </div>

                    {/* Section header */}
                    <div className="flex items-center justify-between py-1 gap-2">
                        <div className="text-[14px] font-extrabold text-slate-900 tracking-[-0.2px]">Absensi Management</div>
                        <div className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">Hari ini</div>
                    </div>

                    {/* Punch cards — 2 columns */}
                    <div className="grid grid-cols-2 gap-2.5">

                        {/* MASUK */}
                        <div className={`bg-white rounded-[20px] overflow-hidden border-[1.5px] shadow-[0_1px_4px_rgba(0,0,0,.04)] ${hasIn ? 'border-blue-200' : 'border-transparent'}`}>
                            <div className="px-[14px] pt-3 pb-2.5 flex items-center gap-2.5">
                                <div className="text-[18px] w-[38px] h-[38px] rounded-[12px] grid place-items-center flex-shrink-0 bg-blue-50">
                                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M13 3h4a1 1 0 011 1v12a1 1 0 01-1 1h-4" /><polyline points="9,7 13,10 9,13" /><line x1="13" y1="10" x2="3" y2="10" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[12.5px] font-extrabold text-blue-700">Masuk</div>
                                    <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${hasIn ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-300'}`}>
                                        {hasIn ? '✓ Tercatat' : 'Belum'}
                                    </span>
                                </div>
                            </div>

                            <div className="px-[14px] pb-[14px]">
                                <div className={`rounded-[14px] p-3 border-[1.5px] ${hasIn ? 'border-blue-100 bg-[#F0F7FF]' : 'border-slate-100 bg-[#FAFBFC]'}`}>
                                    <div className={`font-mono text-[22px] font-bold leading-none tabular-nums ${!hasIn ? 'text-slate-200 font-light' : 'text-slate-900'}`}>
                                        {hasIn ? fmtTime(todayData?.check_in_time) : '--:--'}
                                    </div>
                                    {hasIn && <div className="text-[10px] text-slate-400 font-medium mt-0.5">{fmtDateFull(todayData?.check_in_time)}</div>}
                                    {msgIn && (
                                        <div className={`mt-1.5 text-[10.5px] font-semibold leading-snug px-2 py-1 rounded-lg ${msgIn.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-900'}`}>
                                            {msgIn.text}
                                        </div>
                                    )}
                                    <div className="mt-2">
                                        {hasIn ? (
                                            <button className="w-full h-[34px] rounded-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11.5px] font-bold flex items-center justify-center gap-1.5" disabled>
                                                <IconCheck /> Tercatat
                                            </button>
                                        ) : (
                                            <button
                                                className="w-full h-[34px] rounded-[10px] text-[11.5px] font-bold text-white flex items-center justify-center gap-1.5 transition active:scale-[.96] disabled:opacity-40 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 cursor-pointer"
                                                onClick={() => handlePunch('in')}
                                                disabled={loadingPunch === 'in'}>
                                                {loadingPunch === 'in' ? 'Simpan…' : 'Absen Masuk'}
                                            </button>
                                        )}
                                    </div>
                                    {hasIn && todayData?.check_in_photo_url && (
                                        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                                            <button
                                                onClick={() => setPhotoPreview({ url: todayData.check_in_photo_url, title: 'Foto Masuk Management' })}
                                                className="h-[30px] rounded-[9px] border border-blue-200 bg-blue-50 text-blue-700 text-[10.5px] font-bold flex items-center justify-center gap-1 transition hover:bg-blue-100 active:scale-[.98] cursor-pointer">
                                                <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1.5 10s3.2-5 8.5-5 8.5 5 8.5 5-3.2 5-8.5 5-8.5-5-8.5-5z" /><circle cx="10" cy="10" r="2.4" />
                                                </svg>
                                                Foto
                                            </button>
                                            {!hasOut && (
                                                <button
                                                    onClick={() => setConfirmDelete({ punchType: 'in', label: 'Masuk' })}
                                                    className="h-[30px] rounded-[9px] border border-red-200 bg-red-50 text-red-600 text-[10.5px] font-bold flex items-center justify-center gap-1 transition hover:bg-red-100 active:scale-[.98] cursor-pointer">
                                                    <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3,6 5,6 17,6" /><path d="M16 6l-.867 11.142A2 2 0 0113.138 19H6.862a2 2 0 01-1.995-1.858L4 6" />
                                                    </svg>
                                                    Ulang
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* KELUAR */}
                        <div className={`bg-white rounded-[20px] overflow-hidden border-[1.5px] shadow-[0_1px_4px_rgba(0,0,0,.04)] ${hasOut ? 'border-emerald-200' : 'border-transparent'}`}>
                            <div className="px-[14px] pt-3 pb-2.5 flex items-center gap-2.5">
                                <div className="text-[18px] w-[38px] h-[38px] rounded-[12px] grid place-items-center flex-shrink-0 bg-sky-50">
                                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M7 3H3a1 1 0 00-1 1v12a1 1 0 001 1h4" /><polyline points="11,13 15,10 11,7" /><line x1="15" y1="10" x2="5" y2="10" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[12.5px] font-extrabold text-sky-600">Keluar</div>
                                    <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${hasOut ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-300'}`}>
                                        {hasOut ? '✓ Tercatat' : 'Belum'}
                                    </span>
                                </div>
                            </div>

                            <div className="px-[14px] pb-[14px]">
                                <div className={`rounded-[14px] p-3 border-[1.5px] ${hasOut ? 'border-sky-100 bg-[#F0FAFF]' : 'border-slate-100 bg-[#FAFBFC]'}`}>
                                    <div className={`font-mono text-[22px] font-bold leading-none tabular-nums ${!hasOut ? 'text-slate-200 font-light' : 'text-slate-900'}`}>
                                        {hasOut ? fmtTime(todayData?.check_out_time) : '--:--'}
                                    </div>
                                    {hasOut && <div className="text-[10px] text-slate-400 font-medium mt-0.5">{fmtDateFull(todayData?.check_out_time)}</div>}
                                    {msgOut && (
                                        <div className={`mt-1.5 text-[10.5px] font-semibold leading-snug px-2 py-1 rounded-lg ${msgOut.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-900'}`}>
                                            {msgOut.text}
                                        </div>
                                    )}
                                    <div className="mt-2">
                                        {hasOut ? (
                                            <button className="w-full h-[34px] rounded-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11.5px] font-bold flex items-center justify-center gap-1.5" disabled>
                                                <IconCheck /> Tercatat
                                            </button>
                                        ) : (
                                            <button
                                                className="w-full h-[34px] rounded-[10px] text-[11.5px] font-bold text-white flex items-center justify-center gap-1.5 transition active:scale-[.96] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                                style={{ background: hasIn ? '#0EA5E9' : '#CBD5E1' }}
                                                onClick={() => hasIn && handlePunch('out')}
                                                disabled={loadingPunch === 'out' || !hasIn}>
                                                {loadingPunch === 'out' ? 'Simpan…' : !hasIn ? 'Belum Masuk' : 'Absen Keluar'}
                                            </button>
                                        )}
                                    </div>
                                    {hasOut && todayData?.check_out_photo_url && (
                                        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                                            <button
                                                onClick={() => setPhotoPreview({ url: todayData.check_out_photo_url, title: 'Foto Keluar Management' })}
                                                className="h-[30px] rounded-[9px] border border-blue-200 bg-blue-50 text-blue-700 text-[10.5px] font-bold flex items-center justify-center gap-1 transition hover:bg-blue-100 active:scale-[.98] cursor-pointer">
                                                <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1.5 10s3.2-5 8.5-5 8.5 5 8.5 5-3.2 5-8.5 5-8.5-5-8.5-5z" /><circle cx="10" cy="10" r="2.4" />
                                                </svg>
                                                Foto
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete({ punchType: 'out', label: 'Keluar' })}
                                                className="h-[30px] rounded-[9px] border border-red-200 bg-red-50 text-red-600 text-[10.5px] font-bold flex items-center justify-center gap-1 transition hover:bg-red-100 active:scale-[.98] cursor-pointer">
                                                <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3,6 5,6 17,6" /><path d="M16 6l-.867 11.142A2 2 0 0113.138 19H6.862a2 2 0 01-1.995-1.858L4 6" />
                                                </svg>
                                                Ulang
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary bar */}
                    {(hasIn || hasOut) && (
                        <div className="bg-white rounded-[18px] px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,.04),0_0_0_1px_rgba(0,0,0,.03)]">
                            <div className="flex items-center justify-between">
                                <div className="text-center">
                                    <div className="text-[10px] text-slate-400 font-medium mb-1">Masuk</div>
                                    <div className="text-[16px] font-extrabold text-slate-800 font-mono">{fmtTime(todayData?.check_in_time) || '--:--'}</div>
                                </div>
                                <div className="flex-1 flex items-center justify-center gap-1 px-3">
                                    <div className={`flex-1 h-[2px] rounded-full ${hasIn ? 'bg-blue-300' : 'bg-slate-100'}`} />
                                    <div className={`w-2.5 h-2.5 rounded-full ${isComplete ? 'bg-emerald-400' : hasIn ? 'bg-amber-400' : 'bg-slate-200'}`} />
                                    <div className={`flex-1 h-[2px] rounded-full ${hasOut ? 'bg-sky-300' : 'bg-slate-100'}`} />
                                </div>
                                <div className="text-center">
                                    <div className="text-[10px] text-slate-400 font-medium mb-1">Keluar</div>
                                    <div className="text-[16px] font-extrabold text-slate-800 font-mono">{fmtTime(todayData?.check_out_time) || '--:--'}</div>
                                </div>
                            </div>
                            {isComplete && (
                                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-center gap-1.5 text-[12px] font-bold text-emerald-600">
                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3,8 6.5,11.5 13,5" /></svg>
                                    Absensi Hari Ini Lengkap
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* ══════════════ BOTTOM NAV (from Layout.jsx) ══════════════ */}
                <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center pointer-events-none">
                    <div className="pointer-events-auto w-full max-w-[430px] bg-white/97 backdrop-blur-lg border-t border-slate-200 px-[13px] pt-2.5 shadow-[0_-1px_0_rgba(0,0,0,.04),0_-8px_24px_rgba(0,0,0,.05)]"
                        style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}>
                        <nav className="grid grid-cols-3 gap-1.5">
                            {[
                                { to: '/', label: 'Beranda', Icon: IconHome },
                                { to: '/history', label: 'Riwayat', Icon: IconHistory },
                                { to: '/profile', label: 'Profil', Icon: IconUser },
                            ].map(({ to, label, Icon }) => {
                                const active = isActive(to);
                                return (
                                    <Link key={to} to={to}
                                        className={`flex flex-col items-center gap-0.5 p-2 rounded-xl no-underline text-[10.5px] font-medium transition ${active ? 'bg-[#0B1739] text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-900'}`}>
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
