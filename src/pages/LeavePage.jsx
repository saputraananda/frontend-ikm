import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../lib/api';

/* ──────────────────────────────────────────────────────────────────
   Constants & helpers
────────────────────────────────────────────────────────────────── */
const LEAVE_TYPES = [
    {
        key: 'izin',
        label: 'Izin',
        desc: 'Kepentingan pribadi / keluarga',
        color: '#3B82F6',
        bg: '#EFF6FF',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 3" />
            </svg>
        ),
    },
    {
        key: 'sakit',
        label: 'Sakit',
        desc: 'Wajib sertakan surat dokter',
        color: '#EF4444',
        bg: '#FEF2F2',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" /><line x1="12" y1="8" x2="12" y2="12" /><circle cx="12" cy="16" r=".6" fill="#EF4444" />
            </svg>
        ),
    },
    {
        key: 'cuti',
        label: 'Cuti',
        desc: 'Cuti tahunan (bisa multi-hari)',
        color: '#059669',
        bg: '#ECFDF5',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="17" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" />
            </svg>
        ),
    },
];

const DURATION_TYPES = [
    {
        key: 'full_day',
        label: 'Seharian Penuh',
        desc: 'Tidak masuk seharian — absen terkunci',
        icon: '🌕',
    },
    {
        key: 'half_day_morning',
        label: 'Setengah Hari (Pagi)',
        desc: 'Izin mulai pagi, masuk pada shift siang (12:41)',
        icon: '🌤️',
    },
    {
        key: 'half_day_afternoon',
        label: 'Setengah Hari (Siang)',
        desc: 'Masuk pagi, izin mulai siang (setelah 12:40)',
        icon: '🌥️',
    },
];

const ASSET_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

const STATUS_META = {
    pengajuan: { label: 'Menunggu Persetujuan', color: '#F59E0B', bg: '#FFFBEB' },
    disetujui: { label: 'Disetujui', color: '#059669', bg: '#ECFDF5' },
    ditolak: { label: 'Ditolak', color: '#EF4444', bg: '#FEF2F2' },
};

const LEAVE_TYPE_LABEL = { izin: 'Izin', sakit: 'Sakit', cuti: 'Cuti' };
const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DURATION_LABEL = {
    full_day: 'Seharian Penuh',
    half_day_morning: 'Setengah Hari – Pagi',
    half_day_afternoon: 'Setengah Hari – Siang',
};

const fmt2 = n => String(n).padStart(2, '0');
const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${fmt2(d.getMonth() + 1)}-${fmt2(d.getDate())}`;
};
const formatDateID = (str) => {
    if (!str) return '-';
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};
const formatDateTimeID = (str) => {
    if (!str) return '-';
    const d = new Date(str);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/* ──────────────────────────────────────────────────────────────────
   Sub-components
────────────────────────────────────────────────────────────────── */

function StatusBadge({ status }) {
    const m = STATUS_META[status] || STATUS_META.pengajuan;
    return (
        <span style={{ background: m.bg, color: m.color }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border"
        >
            {m.label}
        </span>
    );
}

function LeaveCard({ item, onCancel, onEdit, onViewDoctorNote }) {
    const lt = LEAVE_TYPES.find(t => t.key === item.leave_type) || LEAVE_TYPES[0];
    const sameDay = item.start_date === item.end_date ||
        (item.start_date?.slice(0, 10) === item.end_date?.slice(0, 10));

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,.06)]">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100" style={{ background: lt.bg }}>
                <span>{lt.icon}</span>
                <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold" style={{ color: lt.color }}>{lt.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                        {DURATION_LABEL[item.duration_type]}
                    </div>
                </div>
                <StatusBadge status={item.status} />
            </div>
            <div className="px-4 py-3 space-y-1.5">
                <div className="flex items-start gap-2 text-[12.5px] text-slate-600">
                    <span className="text-slate-400 shrink-0 mt-0.5">📅</span>
                    <span>
                        {sameDay
                            ? formatDateID(item.start_date)
                            : `${formatDateID(item.start_date)} – ${formatDateID(item.end_date)}`}
                    </span>
                </div>
                <div className="flex items-start gap-2 text-[12.5px] text-slate-600">
                    <span className="text-slate-400 shrink-0 mt-0.5">📝</span>
                    <span className="line-clamp-2">{item.reason}</span>
                </div>
                {item.doctor_note_path && (
                    <button
                        onClick={() => onViewDoctorNote(item)}
                        className="flex items-center gap-2 mt-1 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 text-[12px] font-semibold hover:bg-blue-100 transition cursor-pointer">
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M13 2H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7z"/><polyline points="13,2 13,7 18,7"/><line x1="8" y1="11" x2="12" y2="11"/><line x1="8" y1="14" x2="12" y2="14"/>
                        </svg>
                        Lihat Surat Dokter
                    </button>
                )}
                {item.rejection_note && (
                    <div className="mt-1 text-[11.5px] text-red-600 bg-red-50 rounded-xl px-3 py-2">
                        <span className="font-semibold">Catatan penolakan: </span>{item.rejection_note}
                    </div>
                )}
                <div className="text-[11px] text-slate-400 pt-0.5">
                    Diajukan: {formatDateTimeID(item.created_at)}
                </div>
            </div>
            {item.status === 'pengajuan' && (
                <div className="flex gap-2 px-4 pb-3">
                    <button
                        onClick={() => onEdit(item)}
                        className="flex-1 py-1.5 rounded-xl border border-blue-200 text-blue-600 text-[12px] font-medium bg-blue-50 hover:bg-blue-100 transition cursor-pointer">
                        Edit
                    </button>
                    <button
                        onClick={() => onCancel(item)}
                        className="flex-1 py-1.5 rounded-xl border border-red-200 text-red-500 text-[12px] font-medium bg-red-50 hover:bg-red-100 transition cursor-pointer">
                        Batalkan
                    </button>
                </div>
            )}
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────
   Main Page
────────────────────────────────────────────────────────────────── */
const IconHome = () => (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" /><path d="M7.5 18V12.5h5V18" />
    </svg>
);
const IconHistory = () => (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="7.5" /><polyline points="10,6 10,10 13,12" />
    </svg>
);
const IconUser = () => (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="7" r="4" /><path d="M3 17c0-3 3.13-5 7-5s7 2 7 5" />
    </svg>
);

export default function LeavePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const fileInputRef = useRef(null);

    const isActive = (p) => location.pathname === p;

    /* list state */
    const [items, setItems] = useState([]);
    const [loadingList, setLoadingList] = useState(true);
    const [listError, setListError] = useState(null);

    /* period filter */
    const _now = new Date();
    const [filterMonth, setFilterMonth] = useState(_now.getMonth() + 1);
    const [filterYear, setFilterYear] = useState(_now.getFullYear());
    const [yearOptions, setYearOptions] = useState([_now.getFullYear()]);
    const [stats, setStats] = useState({ izin: 0, sakit: 0, cuti: 0 });

    /* form state */
    const [formOpen, setFormOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null); // existing leave being edited
    const [leaveType, setLeaveType] = useState('izin');
    const [durationType, setDurationType] = useState('full_day');
    const [startDate, setStartDate] = useState(todayStr());
    const [endDate, setEndDate] = useState(todayStr());
    const [reason, setReason] = useState('');
    const [doctorFile, setDoctorFile] = useState(null);   // File obj
    const [doctorPreview, setDoctorPreview] = useState(null); // URL
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    /* cancel confirm modal */
    const [cancelTarget, setCancelTarget] = useState(null);
    const [cancelling, setCancelling] = useState(false);

    /* doctor note preview modal */
    const [doctorNoteItem, setDoctorNoteItem] = useState(null);

    /* ── fetch list ── */
    const fetchList = useCallback(async () => {
        setLoadingList(true);
        setListError(null);
        try {
            const res = await api.get(`/leave/list?limit=50&month=${filterMonth}&year=${filterYear}`);
            setItems(res.data?.data?.items || []);
        } catch {
            setListError('Gagal memuat riwayat pengajuan.');
        } finally {
            setLoadingList(false);
        }
    }, [filterMonth, filterYear]);

    /* ── fetch stats ── */
    const fetchStats = useCallback(async () => {
        try {
            const r = await api.get(`/leave/stats?month=${filterMonth}&year=${filterYear}`);
            setStats(r.data?.data || { izin: 0, sakit: 0, cuti: 0 });
        } catch { setStats({ izin: 0, sakit: 0, cuti: 0 }); }
    }, [filterMonth, filterYear]);

    useEffect(() => { fetchList(); fetchStats(); }, [fetchList, fetchStats]);

    /* ── fetch year options from db ── */
    useEffect(() => {
        api.get('/leave/years')
            .then(r => setYearOptions(r.data?.data || [new Date().getFullYear()]))
            .catch(() => {});
    }, []);

    /* ── open form for new ── */
    const openNew = () => {
        setEditTarget(null);
        setLeaveType('izin');
        setDurationType('full_day');
        setStartDate(todayStr());
        setEndDate(todayStr());
        setReason('');
        setDoctorFile(null);
        setDoctorPreview(null);
        setSubmitError(null);
        setFormOpen(true);
    };

    /* ── open form for edit ── */
    const openEdit = (item) => {
        setEditTarget(item);
        setLeaveType(item.leave_type);
        setDurationType(item.duration_type);
        setStartDate(item.start_date?.slice(0, 10) || todayStr());
        setEndDate(item.end_date?.slice(0, 10) || todayStr());
        setReason(item.reason || '');
        setDoctorFile(null);
        setDoctorPreview(item.doctor_note_path ? ASSET_BASE + item.doctor_note_path : null);
        setSubmitError(null);
        setFormOpen(true);
    };

    /* ── sync end_date when not cuti ── */
    useEffect(() => {
        if (leaveType !== 'cuti') setEndDate(startDate);
    }, [leaveType, startDate]);

    /* ── sync end when duration is half_day ── */
    useEffect(() => {
        if (durationType !== 'full_day') setEndDate(startDate);
    }, [durationType, startDate]);

    /* ── handle file pick ── */
    const handleFilePick = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setDoctorFile(file);
        const url = URL.createObjectURL(file);
        setDoctorPreview(url);
    };

    /* ── submit ── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError(null);

        if (!reason.trim() || reason.trim().length < 5) {
            setSubmitError('Keterangan wajib diisi minimal 5 karakter.');
            return;
        }
        if (leaveType === 'sakit' && !doctorFile && !editTarget?.doctor_note_path) {
            setSubmitError('Foto surat dokter wajib dilampirkan untuk izin sakit.');
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('leave_type', leaveType);
            formData.append('duration_type', durationType);
            formData.append('start_date', startDate);
            formData.append('end_date', endDate);
            formData.append('reason', reason.trim());
            if (doctorFile) formData.append('doctor_note', doctorFile);

            if (editTarget) {
                await api.put(`/leave/${editTarget.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                await api.post('/leave', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            setFormOpen(false);
            fetchList();
        } catch (err) {
            const msg = err.response?.data?.message || 'Terjadi kesalahan, coba lagi.';
            setSubmitError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    /* ── cancel leave ── */
    const handleCancelConfirm = async () => {
        if (!cancelTarget) return;
        setCancelling(true);
        try {
            await api.delete(`/leave/${cancelTarget.id}`);
            setCancelTarget(null);
            fetchList();
        } catch (err) {
            alert(err.response?.data?.message || 'Gagal membatalkan pengajuan.');
        } finally {
            setCancelling(false);
        }
    };

    /* ──────────────────────────────── render ────────────────────── */
    return (
        <div className="min-h-[100dvh] bg-slate-100">
            <div className="mx-auto max-w-[430px] min-h-[100dvh] bg-white flex flex-col shadow-[0_0_0_1px_rgba(0,0,0,.05),0_8px_48px_rgba(0,0,0,.07)]">

                {/* ── Header ── */}
                <header className="sticky top-0 z-20 bg-[#0B1739] h-14 flex items-center gap-3 px-4 border-b border-white/[.06] flex-shrink-0">
                    <button
                        className="w-[34px] h-[34px] rounded-[8px] border border-white/10 bg-white/[.07] text-white/70 grid place-items-center cursor-pointer flex-shrink-0 transition hover:bg-white/[.15] hover:text-white"
                        onClick={() => navigate(-1)} aria-label="Kembali">
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="12,4 6,10 12,16" />
                        </svg>
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="text-[9.5px] font-semibold tracking-[.14em] uppercase text-[#93C5FD] opacity-65">Sistem Absensi</div>
                        <div className="text-[14px] font-bold text-white tracking-[-0.01em] truncate">Izin / Cuti</div>
                    </div>
                    <button
                        onClick={openNew}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-white text-[12px] font-semibold hover:bg-white/20 transition cursor-pointer shrink-0">
                        <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="10" y1="4" x2="10" y2="16" /><line x1="4" y1="10" x2="16" y2="10" />
                        </svg>
                        Ajukan
                    </button>
                </header>

                {/* ── Main content ── */}
                <main className="flex-1 overflow-y-auto px-[13px] pt-[14px] pb-[108px] flex flex-col gap-2.5">

                    {/* ── Period filter ── */}
                    <div className="flex items-center gap-2">
                        <select
                            value={filterMonth}
                            onChange={e => setFilterMonth(Number(e.target.value))}
                            className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-[13px] text-slate-700 bg-slate-50 focus:outline-none focus:border-[#0B1739] transition">
                            {MONTHS_ID.map((m, i) => (
                                <option key={i + 1} value={i + 1}>{m}</option>
                            ))}
                        </select>
                        <select
                            value={filterYear}
                            onChange={e => setFilterYear(Number(e.target.value))}
                            className="w-[90px] border border-slate-200 rounded-xl px-3 py-2 text-[13px] text-slate-700 bg-slate-50 focus:outline-none focus:border-[#0B1739] transition">
                            {yearOptions.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div className="text-[11px] text-slate-400 text-center -mt-1">
                        {(() => {
                            const pm = filterMonth === 1 ? 12 : filterMonth - 1;
                            const py = filterMonth === 1 ? filterYear - 1 : filterYear;
                            return `Periode: 26 ${MONTHS_ID[pm - 1].slice(0, 3)} ${py} – 25 ${MONTHS_ID[filterMonth - 1].slice(0, 3)} ${filterYear}`;
                        })()}
                    </div>

                    {/* ── Stat cards ── */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { key: 'izin',  label: 'Total Izin',  count: stats.izin,  color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
                            { key: 'sakit', label: 'Total Sakit', count: stats.sakit, color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
                            { key: 'cuti',  label: 'Total Cuti',  count: stats.cuti,  color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
                        ].map(s => (
                            <div key={s.key}
                                className="rounded-2xl border p-3 flex flex-col items-center gap-0.5 text-center"
                                style={{ background: s.bg, borderColor: s.border }}>
                                <div className="text-[26px] font-extrabold leading-none" style={{ color: s.color }}>{s.count}</div>
                                <div className="text-[10.5px] font-semibold text-slate-500 mt-1">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* ── Half-day info banner ── */}
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-[12px] text-blue-700 space-y-1">
                        <div className="font-semibold">ℹ️ Izin Setengah Hari</div>
                        <div><b>Setengah Hari (Pagi)</b> — Izin mulai pagi, wajib hadir mulai shift siang <b>(12:41)</b></div>
                        <div><b>Setengah Hari (Siang)</b> — Masuk pagi normal, izin dimulai setelah shift siang <b>(12:40)</b></div>
                        <div className="text-[11px] text-blue-500 mt-1">Izin <b>seharian penuh</b> akan mengunci halaman absensi &amp; valet.</div>
                    </div>

                    {/* ── List ── */}
                    {loadingList ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400">
                            <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" opacity=".25" /><path d="M21 12a9 9 0 00-9-9" /></svg>
                            <span className="text-[13px]">Memuat riwayat…</span>
                        </div>
                    ) : listError ? (
                        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-[13px] text-red-600 text-center">{listError}</div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                                <rect x="3" y="4" width="18" height="17" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="14" x2="16" y2="14" />
                            </svg>
                            <div className="text-[13px] font-medium">Tidak ada pengajuan</div>
                            <div className="text-[12px] text-center leading-relaxed">
                                Tidak ada data pada periode <b>{MONTHS_ID[filterMonth - 1]} {filterYear}</b>.<br />
                                Klik <b>"Ajukan"</b> untuk membuat pengajuan baru.
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {items.map(item => (
                                <LeaveCard
                                    key={item.id}
                                    item={item}
                                    onEdit={openEdit}
                                    onCancel={setCancelTarget}
                                    onViewDoctorNote={setDoctorNoteItem}
                                />
                            ))}
                        </div>
                    )}

                </main>

                {/* ════════════════ FORM MODAL ════════════════ */}
                {formOpen && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px]"
                        onClick={e => { if (e.target === e.currentTarget) setFormOpen(false); }}>
                        <div className="w-full max-w-[430px] bg-white rounded-t-3xl max-h-[92dvh] flex flex-col">
                            {/* handle */}
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 rounded-full bg-slate-200" />
                            </div>

                            {/* title */}
                            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                                <div className="text-[15px] font-bold text-slate-800">
                                    {editTarget ? 'Edit Pengajuan' : 'Buat Pengajuan Izin'}
                                </div>
                                <button onClick={() => setFormOpen(false)}
                                    className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 grid place-items-center hover:bg-slate-200 transition cursor-pointer">
                                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                                        <line x1="4" y1="4" x2="16" y2="16" /><line x1="16" y1="4" x2="4" y2="16" />
                                    </svg>
                                </button>
                            </div>

                            {/* form body – scrollable */}
                            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

                                {/* Leave type */}
                                <div>
                                    <label className="block text-[12px] font-semibold text-slate-600 mb-2">Jenis Izin</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {LEAVE_TYPES.map(lt => (
                                            <button key={lt.key} type="button"
                                                onClick={() => setLeaveType(lt.key)}
                                                className={`rounded-xl border-2 p-2.5 flex flex-col items-center gap-1.5 transition cursor-pointer ${leaveType === lt.key ? 'border-current shadow-sm' : 'border-slate-200 bg-white'}`}
                                                style={leaveType === lt.key ? { background: lt.bg, borderColor: lt.color } : {}}>
                                                {lt.icon}
                                                <span className="text-[11.5px] font-semibold" style={{ color: leaveType === lt.key ? lt.color : '#64748b' }}>
                                                    {lt.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Duration type */}
                                <div>
                                    <label className="block text-[12px] font-semibold text-slate-600 mb-2">Durasi</label>
                                    <div className="space-y-2">
                                        {DURATION_TYPES.map(dt => (
                                            <button key={dt.key} type="button"
                                                onClick={() => setDurationType(dt.key)}
                                                className={`w-full flex items-start gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition cursor-pointer ${durationType === dt.key ? 'border-[#0B1739] bg-slate-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                                <span className="text-base mt-0.5">{dt.icon}</span>
                                                <div>
                                                    <div className={`text-[12.5px] font-semibold ${durationType === dt.key ? 'text-[#0B1739]' : 'text-slate-700'}`}>
                                                        {dt.label}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{dt.desc}</div>
                                                </div>
                                                {durationType === dt.key && (
                                                    <span className="ml-auto mt-0.5 w-4 h-4 rounded-full bg-[#0B1739] grid place-items-center shrink-0">
                                                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="2,6 5,9 10,3" /></svg>
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">
                                            {leaveType === 'cuti' ? 'Tanggal Mulai' : 'Tanggal'}
                                        </label>
                                        <input type="date" value={startDate}
                                            min={todayStr()}
                                            onChange={e => setStartDate(e.target.value)}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] text-slate-800 bg-slate-50 focus:outline-none focus:border-[#0B1739] focus:bg-white transition" />
                                    </div>
                                    {leaveType === 'cuti' && (
                                        <div>
                                            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Tanggal Selesai</label>
                                            <input type="date" value={endDate}
                                                min={startDate}
                                                onChange={e => setEndDate(e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] text-slate-800 bg-slate-50 focus:outline-none focus:border-[#0B1739] focus:bg-white transition" />
                                        </div>
                                    )}
                                </div>

                                {/* Reason */}
                                <div>
                                    <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Keterangan / Alasan</label>
                                    <textarea
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        rows={3}
                                        placeholder="Tuliskan alasan pengajuan izin Anda secara singkat dan jelas..."
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-800 bg-slate-50 focus:outline-none focus:border-[#0B1739] focus:bg-white transition resize-none placeholder:text-slate-400"
                                    />
                                </div>

                                {/* Doctor note – only for sakit */}
                                {leaveType === 'sakit' && (
                                    <div>
                                        <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">
                                            Foto Surat Dokter <span className="text-red-500">*</span>
                                        </label>
                                        {doctorPreview && (
                                            <div className="mb-2 rounded-xl overflow-hidden border border-slate-200 relative">
                                                <img src={doctorPreview} alt="Surat dokter" className="w-full max-h-40 object-contain bg-slate-100" />
                                                <button type="button"
                                                    onClick={() => { setDoctorFile(null); setDoctorPreview(editTarget?.doctor_note_path ? ASSET_BASE + editTarget.doctor_note_path : null); }}
                                                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white grid place-items-center cursor-pointer hover:bg-black/70 transition">
                                                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                                                        <line x1="2" y1="2" x2="10" y2="10" /><line x1="10" y1="2" x2="2" y2="10" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                        <input type="file" ref={fileInputRef} accept="image/*" className="hidden"
                                            onChange={handleFilePick} />
                                        <button type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl py-3 text-[12.5px] text-slate-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition cursor-pointer">
                                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                                <path d="M10 3v11M6 7l4-4 4 4M3 17h14" />
                                            </svg>
                                            {doctorFile ? 'Ganti Foto Surat Dokter' : 'Upload Foto Surat Dokter'}
                                        </button>
                                    </div>
                                )}

                                {/* Error */}
                                {submitError && (
                                    <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-[12.5px] text-red-600 font-medium">
                                        ⚠️ {submitError}
                                    </div>
                                )}

                                {/* Submit */}
                                <button type="submit" disabled={submitting}
                                    className="w-full py-3 rounded-xl bg-[#0B1739] text-white text-[13.5px] font-bold shadow-sm hover:bg-[#162553] disabled:opacity-60 transition cursor-pointer">
                                    {submitting
                                        ? 'Mengirim…'
                                        : editTarget ? 'Simpan Perubahan' : 'Kirim Pengajuan'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* ════════════════ CANCEL CONFIRM MODAL ════════════════ */}
                {cancelTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] px-5">
                        <div className="w-full max-w-[360px] bg-white rounded-3xl p-6 shadow-2xl">
                            <div className="text-center mb-4">
                                <div className="w-14 h-14 rounded-full bg-red-50 grid place-items-center mx-auto mb-3">
                                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round">
                                        <circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="12" /><circle cx="12" cy="16" r=".6" fill="#EF4444" />
                                    </svg>
                                </div>
                                <div className="text-[15px] font-bold text-slate-800">Batalkan Pengajuan?</div>
                                <div className="text-[12.5px] text-slate-500 mt-1.5 leading-relaxed">
                                    Pengajuan izin <b>{LEAVE_TYPE_LABEL[cancelTarget.leave_type]}</b> pada{' '}
                                    <b>{formatDateID(cancelTarget.start_date)}</b> akan dihapus.
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setCancelTarget(null)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-100 transition cursor-pointer">
                                    Kembali
                                </button>
                                <button onClick={handleCancelConfirm} disabled={cancelling}
                                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[13px] font-bold hover:bg-red-600 disabled:opacity-60 transition cursor-pointer">
                                    {cancelling ? 'Membatalkan…' : 'Ya, Batalkan'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Doctor Note Preview Modal ── */}
                {doctorNoteItem && (() => {
                    const imgUrl = ASSET_BASE + doctorNoteItem.doctor_note_path;
                    return (
                        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-[2px]">
                            <div className="w-full max-w-[430px] bg-white rounded-t-3xl pb-safe-6 overflow-hidden">
                                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                                    <div>
                                        <div className="text-[15px] font-bold text-slate-800">Surat Dokter</div>
                                        <div className="text-[11.5px] text-slate-400 mt-0.5">
                                            {LEAVE_TYPE_LABEL[doctorNoteItem.leave_type]} · {formatDateID(doctorNoteItem.start_date)}
                                        </div>
                                    </div>
                                    <button onClick={() => setDoctorNoteItem(null)}
                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition cursor-pointer">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round">
                                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                        </svg>
                                    </button>
                                </div>
                                <div className="px-4 py-3 bg-slate-50 flex items-center justify-center min-h-[240px] max-h-[55vh] overflow-hidden">
                                    <img
                                        src={imgUrl}
                                        alt="Surat Dokter"
                                        className="max-w-full max-h-[52vh] object-contain rounded-xl shadow"
                                        onError={e => { e.currentTarget.src = ''; e.currentTarget.alt = 'Gambar tidak tersedia'; }}
                                    />
                                </div>
                                <div className="px-4 pt-3 pb-2 flex gap-3">
                                    <a href={imgUrl} target="_blank" rel="noreferrer"
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-medium hover:bg-slate-50 transition no-underline">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                        Buka di Tab Baru
                                    </a>
                                    {doctorNoteItem.status === 'pengajuan' && (
                                        <button
                                            onClick={() => { openEdit(doctorNoteItem); setDoctorNoteItem(null); }}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-700 transition cursor-pointer">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                            Ganti Surat
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* ── Bottom nav ── */}
                <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center pointer-events-none">
                    <div className="pointer-events-auto w-full max-w-[430px] bg-white/97 backdrop-blur-lg border-t border-slate-200 px-[13px] pt-2.5 pb-safe-10 shadow-[0_-1px_0_rgba(0,0,0,.04),0_-8px_24px_rgba(0,0,0,.05)]">
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
