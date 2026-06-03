import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import useAuthStore from '../store/authStore';

const ABSENCE_REASONS = ['Izin', 'Sakit', 'Alfa'];
const ABSENCE_REASON_STYLE = {
    Izin:  { active: 'border-blue-400 bg-blue-50 text-blue-700',    inactive: 'border-slate-200 bg-white text-slate-500' },
    Sakit: { active: 'border-amber-400 bg-amber-50 text-amber-700', inactive: 'border-slate-200 bg-white text-slate-500' },
    Alfa:  { active: 'border-red-400 bg-red-50 text-red-700',       inactive: 'border-slate-200 bg-white text-slate-500' },
};

const ASSET_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const toTitleCase = (str) =>
    (str || '').replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

const fmtDate = (iso) => {
    if (!iso) return '-';
    const parts = String(iso).split('T')[0].split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtDateTime = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
};

const getCutoffRange = () => {
    const today = new Date();
    const day = today.getDate();
    let start, end;
    if (day <= 25) {
        start = new Date(today.getFullYear(), today.getMonth() - 1, 26);
        end   = new Date(today.getFullYear(), today.getMonth(), 25);
    } else {
        start = new Date(today.getFullYear(), today.getMonth(), 26);
        end   = new Date(today.getFullYear(), today.getMonth() + 1, 25);
    }
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { start: fmt(start), end: fmt(end) };
};

let _kc = 0;
const nk = () => ++_kc;

export default function DailyReportPage() {
    const navigate = useNavigate();
    const galleryRef = useRef(null);
    const authUser = useAuthStore(s => s.user);

    /* ── Tabs ── */
    const [activeTab, setActiveTab] = useState('form');

    /* Master data */
    const [areas, setAreas] = useState([]);
    const [employees, setEmployees] = useState([]);

    /* Edit mode */
    const [editingId, setEditingId] = useState(null);

    /* Identitas */
    const [reportDate, setReportDate] = useState(todayStr());
    const [areaId, setAreaId] = useState('');
    const [picName, setPicName] = useState(authUser?.full_name ? toTitleCase(authUser.full_name) : '');
    const [picSearchFocused, setPicSearchFocused] = useState(false);
    const [picSearchQuery, setPicSearchQuery] = useState('');
    const [role, setRole] = useState('');

    /* Kedisiplinan */
    const [presentCount, setPresentCount] = useState(0);
    const [absentMembers, setAbsentMembers] = useState([]);
    const [productionStartTime, setProductionStartTime] = useState('');
    const [isLate, setIsLate] = useState('');
    const [lateMembers, setLateMembers] = useState([]);
    const [areaCleanliness, setAreaCleanliness] = useState('');
    const [constraintNotes, setConstraintNotes] = useState('');

    /* Foto briefing */
    const [briefingDoc, setBriefingDoc] = useState(null);
    const [briefingDocPreview, setBriefingDocPreview] = useState(null);
    const [existingBriefingPath, setExistingBriefingPath] = useState(null);
    const [removeBriefingDoc, setRemoveBriefingDoc] = useState(false);
    const [showCamera, setShowCamera] = useState(false);

    /* UI */
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);

    /* ── History state ── */
    const [reports, setReports] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const defaultRange = getCutoffRange();
    const [historyStart, setHistoryStart] = useState(defaultRange.start);
    const [historyEnd, setHistoryEnd] = useState(defaultRange.end);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    useEffect(() => {
        document.title = 'Laporan Harian Leader | IKM Mobile';
        Promise.all([
            api.get('/daily-report/areas'),
            api.get('/daily-report/employees'),
            api.get('/daily-report/check-today'),
        ]).then(([areasRes, empRes, checkRes]) => {
            setAreas(areasRes.data?.data || []);
            setEmployees(
                (empRes.data?.data || []).map(e => ({ ...e, full_name: toTitleCase(e.full_name) }))
            );
            if (checkRes.data?.data?.submitted) setShowDuplicateModal(true);
        }).catch(() => {});
    }, []);

    /* Fetch history when tab becomes active or date range changes */
    useEffect(() => {
        if (activeTab === 'history') fetchHistory();
    }, [activeTab, historyStart, historyEnd]);

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const params = {};
            if (historyStart) params.startDate = historyStart;
            if (historyEnd)   params.endDate   = historyEnd;
            const res = await api.get('/daily-report/my-reports', { params });
            setReports(res.data?.data || []);
        } catch (err) {
            console.error('fetchHistory', err);
        } finally {
            setHistoryLoading(false);
        }
    };

    /* Absent members */
    const addAbsent = () => setAbsentMembers(p => [...p, { _key: nk(), employee_id: '', absence_reason: '' }]);
    const updateAbsent = (_key, field, val) => setAbsentMembers(p => p.map(m => m._key === _key ? { ...m, [field]: val } : m));
    const removeAbsent = (_key) => setAbsentMembers(p => p.filter(m => m._key !== _key));

    /* Late members */
    const addLate = () => setLateMembers(p => [...p, { _key: nk(), employee_id: '', late_time: '' }]);
    const updateLate = (_key, field, val) => setLateMembers(p => p.map(m => m._key === _key ? { ...m, [field]: val } : m));
    const removeLate = (_key) => setLateMembers(p => p.filter(m => m._key !== _key));

    /* File handling */
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBriefingDoc(file);
        if (briefingDocPreview && !existingBriefingPath) URL.revokeObjectURL(briefingDocPreview);
        setBriefingDocPreview(URL.createObjectURL(file));
        e.target.value = '';
    };
    const removeDoc = () => {
        if (existingBriefingPath) setRemoveBriefingDoc(true);
        setBriefingDoc(null);
        if (briefingDocPreview && !existingBriefingPath) URL.revokeObjectURL(briefingDocPreview);
        setBriefingDocPreview(null);
        setExistingBriefingPath(null);
    };

    const handleCameraCapture = (file) => {
        setBriefingDoc(file);
        if (briefingDocPreview && !existingBriefingPath) URL.revokeObjectURL(briefingDocPreview);
        setBriefingDocPreview(URL.createObjectURL(file));
        setShowCamera(false);
    };

    const startEdit = async (report) => {
        try {
            const res = await api.get(`/daily-report/${report.id}`);
            const r = res.data?.data;
            if (!r) return;

            setEditingId(r.id);
            setReportDate(r.report_date ? String(r.report_date).split('T')[0] : todayStr());
            setAreaId(String(r.area_id || ''));
            setPicName(r.pic_name || '');
            setRole(r.role || '');
            setPresentCount(r.present_count || 0);
            // MySQL time type returns "HH:MM:SS" — input needs "HH:MM"
            setProductionStartTime((r.production_start_time || '').slice(0, 5));
            setIsLate(r.is_late ? 'Ya' : 'Tidak');
            setAreaCleanliness(r.area_cleanliness || '');
            setConstraintNotes(r.constraint_notes || '');

            setAbsentMembers(
                (r.absent_members || []).map(m => ({
                    _key: nk(),
                    employee_id: String(m.employee_id),
                    absence_reason: m.absence_reason,
                }))
            );
            setLateMembers(
                (r.late_members || []).map(m => ({
                    _key: nk(),
                    employee_id: String(m.employee_id),
                    late_time: (m.late_time || '').slice(0, 5),
                }))
            );

            if (r.briefing_doc_path) {
                setExistingBriefingPath(r.briefing_doc_path);
                setBriefingDocPreview(`${ASSET_BASE}${r.briefing_doc_path}`);
            } else {
                setExistingBriefingPath(null);
                setBriefingDocPreview(null);
            }
            setBriefingDoc(null);

            setActiveTab('form');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error('startEdit', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError(null);

        if (!reportDate) return setSubmitError('Tanggal wajib diisi.');
        if (!areaId) return setSubmitError('Area/Bagian wajib dipilih.');
        if (!picName.trim()) return setSubmitError('Nama penanggung jawab wajib diisi (Pilih dari daftar karyawan).');
        if (!role) return setSubmitError('Peran wajib dipilih.');
        if (!productionStartTime) return setSubmitError('Waktu mulai produksi wajib diisi.');
        if (!isLate) return setSubmitError('Status keterlambatan wajib dipilih.');
        if (!areaCleanliness) return setSubmitError('Kebersihan area produksi wajib dipilih.');

        for (const m of absentMembers) {
            if (!m.employee_id) return setSubmitError('Pilih nama untuk setiap anggota yang tidak hadir.');
            if (!m.absence_reason) return setSubmitError('Pilih keterangan untuk setiap anggota yang tidak hadir.');
        }
        if (isLate === 'Ya') {
            if (lateMembers.length === 0) return setSubmitError('Tambahkan nama anggota yang terlambat.');
            for (const m of lateMembers) {
                if (!m.employee_id) return setSubmitError('Pilih nama anggota yang terlambat.');
                if (!m.late_time) return setSubmitError('Masukkan jam keterlambatan untuk setiap anggota.');
            }
        }

        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('report_date', reportDate);
            fd.append('area_id', areaId);
            fd.append('pic_name', picName.trim());
            fd.append('role', role);
            fd.append('present_count', String(presentCount));
            fd.append('production_start_time', productionStartTime);
            fd.append('is_late', isLate === 'Ya' ? '1' : '0');
            fd.append('area_cleanliness', areaCleanliness);
            fd.append('constraint_notes', constraintNotes.trim());
            fd.append('absent_members', JSON.stringify(
                absentMembers.map(({ employee_id, absence_reason }) => ({ employee_id: Number(employee_id), absence_reason }))
            ));
            fd.append('late_members', JSON.stringify(
                isLate === 'Ya'
                    ? lateMembers.map(({ employee_id, late_time }) => ({ employee_id: Number(employee_id), late_time }))
                    : []
            ));
            if (briefingDoc) fd.append('briefing_doc', briefingDoc);
            if (editingId && removeBriefingDoc && !briefingDoc) fd.append('remove_briefing_doc', '1');

            if (editingId) {
                await api.put(`/daily-report/${editingId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else {
                await api.post('/daily-report', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            }
            setSuccess(true);
        } catch (err) {
            setSubmitError(err?.response?.data?.message || 'Gagal mengirim laporan, coba lagi.');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setReportDate(todayStr()); setAreaId(''); setPicName(authUser?.full_name ? toTitleCase(authUser.full_name) : ''); setRole('');
        setPresentCount(0); setAbsentMembers([]); setProductionStartTime('');
        setIsLate(''); setLateMembers([]); setAreaCleanliness(''); setConstraintNotes('');
        setBriefingDoc(null);
        if (briefingDocPreview && !existingBriefingPath) URL.revokeObjectURL(briefingDocPreview);
        setBriefingDocPreview(null);
        setExistingBriefingPath(null);
        setRemoveBriefingDoc(false);
        setEditingId(null);
        setSubmitError(null);
        setSuccess(false);
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/daily-report/${id}`);
            setDeleteConfirmId(null);
            fetchHistory();
        } catch (err) {
            console.error('deleteReport', err);
        }
    };

    const inputCls = 'w-full px-3 py-2.5 border border-slate-200 rounded-[12px] bg-slate-50 font-[inherit] text-[13px] text-slate-900 outline-none transition focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,.12)] focus:bg-white placeholder:text-slate-400';
    const selectCls = inputCls + ' cursor-pointer appearance-none';
    const selectStyle = {
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: 32,
    };

    /* Reusable radio-card row */
    const RadioCard = ({ value, current, onChange, activeStyle, children }) => (
        <label
            className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] border cursor-pointer transition ${current === value ? activeStyle.border : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
            onClick={() => onChange(value)}>
            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 grid place-items-center transition ${current === value ? activeStyle.ring : 'border-slate-300'}`}>
                {current === value && <div className={`w-2 h-2 rounded-full ${activeStyle.dot}`} />}
            </div>
            <span className={`text-[12.5px] font-medium ${current === value ? activeStyle.text : 'text-slate-700'}`}>{children}</span>
        </label>
    );

    const DeleteBtn = ({ onClick }) => (
        <button type="button" onClick={onClick}
            className="w-8 h-8 rounded-lg border border-red-200 bg-red-50 text-red-500 grid place-items-center hover:bg-red-100 transition cursor-pointer flex-shrink-0">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="2" y1="2" x2="10" y2="10" /><line x1="10" y1="2" x2="2" y2="10" />
            </svg>
        </button>
    );

    const AddRowBtn = ({ onClick, color, children }) => (
        <button type="button" onClick={onClick}
            className={`w-full py-2.5 rounded-[12px] border-2 border-dashed border-slate-300 text-slate-500 text-[12.5px] font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${color}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {children}
        </button>
    );

    return (
        <div className="min-h-[100dvh] bg-slate-100 flex justify-center">
            <div className="w-full max-w-[430px] min-h-[100dvh] bg-white flex flex-col shadow-[0_0_0_1px_rgba(0,0,0,.05),0_8px_48px_rgba(0,0,0,.07)]">

                {/* Header */}
                <header className="sticky top-0 z-20 bg-[#0B1739] h-14 flex items-center gap-3 px-4 border-b border-white/[.06] flex-shrink-0">
                    <button
                        className="w-[34px] h-[34px] rounded-[8px] border border-white/10 bg-white/[.07] text-white/70 grid place-items-center cursor-pointer flex-shrink-0 transition hover:bg-white/[.15] hover:text-white"
                        onClick={() => navigate(-1)} aria-label="Kembali">
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="12,4 6,10 12,16" />
                        </svg>
                    </button>
                    <div className="min-w-0">
                        <div className="text-[9.5px] font-semibold tracking-[.14em] uppercase text-[#93C5FD] opacity-65">Sistem Absensi</div>
                        <div className="text-[14px] font-bold text-white tracking-[-0.01em] truncate">Laporan Harian Leader</div>
                    </div>
                </header>

                {/* Tab Switcher */}
                <div className="bg-white px-4 pt-3 pb-0 flex-shrink-0">
                    <div className="flex rounded-[14px] bg-slate-100 p-1">
                        <button
                            className={`flex-1 h-[38px] rounded-[10px] text-[12.5px] font-bold transition cursor-pointer ${
                                activeTab === 'form' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                            onClick={() => setActiveTab('form')}>
                            Form Laporan
                        </button>
                        <button
                            className={`flex-1 h-[38px] rounded-[10px] text-[12.5px] font-bold transition cursor-pointer ${
                                activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                            onClick={() => setActiveTab('history')}>
                            Riwayat
                        </button>
                    </div>
                </div>

                {/* ── FORM TAB ── */}
                {activeTab === 'form' && (
                    <main className="flex-1 px-[13px] py-[14px] pb-10 flex flex-col gap-2.5 overflow-y-auto">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                            {/* Banner */}
                            <div className="relative overflow-hidden rounded-[20px] px-5 py-[18px] text-white"
                                style={{ background: 'linear-gradient(135deg, #065F46 0%, #10B981 100%)' }}>
                                <div className="absolute -top-8 -right-8 w-[110px] h-[110px] rounded-full bg-white/[.07] pointer-events-none" />
                                <div className="text-[16px] font-bold mb-0.5">
                                    {editingId ? 'Edit Laporan' : 'Laporan Harian Leader'}
                                </div>
                                <p className="text-[11.5px] opacity-70 leading-relaxed">
                                    {editingId
                                        ? 'Perbarui data laporan harian leader.'
                                        : 'Catat aktivitas harian, kedisiplinan tim, dan kondisi area produksi secara detail.'}
                                </p>
                            </div>

                            {/* Edit badge */}
                            {editingId && (
                                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-[12px] px-4 py-2.5">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    <span className="text-[12px] font-semibold text-amber-700">Mode Edit – Laporan #{editingId}</span>
                                    <button type="button" onClick={resetForm}
                                        className="ml-auto text-[11px] font-bold text-amber-600 underline cursor-pointer">Batal</button>
                                </div>
                            )}

                            {/* ── Section 1 – Identitas ── */}
                            <Section color="bg-blue-500" title="Identitas Laporan">
                                <Field label="Tanggal" required>
                                    <input className={inputCls} type="date"
                                        value={reportDate} onChange={e => setReportDate(e.target.value)} />
                                </Field>
                                <Field label="Area / Bagian" required>
                                    <select className={selectCls} style={selectStyle}
                                        value={areaId} onChange={e => setAreaId(e.target.value)}>
                                        <option value="">— Pilih Area —</option>
                                        {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </Field>
                                <Field label="Nama Penanggung Jawab" required>
                                    <div className="relative">
                                        <input
                                            className={inputCls + ' pr-8'}
                                            type="text"
                                            placeholder="Cari & pilih nama penanggung jawab..."
                                            value={picSearchFocused ? picSearchQuery : picName}
                                            onFocus={() => {
                                                setPicSearchFocused(true);
                                                setPicSearchQuery('');
                                            }}
                                            onBlur={() => {
                                                setTimeout(() => setPicSearchFocused(false), 200);
                                            }}
                                            onChange={e => {
                                                setPicSearchQuery(e.target.value);
                                                setPicName(''); // clear when typing to force re-selection
                                            }}
                                        />
                                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 1l4 4 4-4" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>

                                        {picSearchFocused && (
                                            <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,.08)] z-50">
                                                {employees.filter(emp => emp.full_name.toLowerCase().includes(picSearchQuery.toLowerCase())).length > 0 ? (
                                                    employees
                                                        .filter(emp => emp.full_name.toLowerCase().includes(picSearchQuery.toLowerCase()))
                                                        .map(emp => (
                                                            <div
                                                                key={emp.employee_id}
                                                                className="px-3 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition"
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault(); // prevent blur before click
                                                                    setPicName(emp.full_name);
                                                                    setPicSearchFocused(false);
                                                                }}
                                                            >
                                                                {emp.full_name}
                                                            </div>
                                                        ))
                                                ) : (
                                                    <div className="px-3 py-3 text-[12.5px] text-slate-400 text-center">
                                                        Karyawan tidak ditemukan
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </Field>
                                <Field label="Peran" required>
                                    <div className="flex gap-2">
                                        <RadioCard value="Leader" current={role} onChange={setRole}
                                            activeStyle={{ border: 'border-blue-400 bg-blue-50', ring: 'border-blue-500', dot: 'bg-blue-500', text: 'text-blue-800' }}>
                                            Leader
                                        </RadioCard>
                                        <RadioCard value="Deputi" current={role} onChange={setRole}
                                            activeStyle={{ border: 'border-blue-400 bg-blue-50', ring: 'border-blue-500', dot: 'bg-blue-500', text: 'text-blue-800' }}>
                                            Deputi
                                        </RadioCard>
                                    </div>
                                </Field>
                            </Section>

                            {/* ── Section 2 – Kedisiplinan ── */}
                            <Section color="bg-emerald-500" title="Kedisiplinan Harian">

                                {/* Jumlah hadir */}
                                <Field label="Jumlah Anggota Yang Hadir" required>
                                    <div className="flex items-center gap-2">
                                        <button type="button"
                                            className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-lg font-bold grid place-items-center hover:bg-slate-100 transition cursor-pointer flex-shrink-0"
                                            onClick={() => setPresentCount(q => Math.max(0, q - 1))}>−</button>
                                        <input className={inputCls + ' text-center font-bold text-[15px]'} type="number" min="0"
                                            value={presentCount} onChange={e => setPresentCount(Math.max(0, parseInt(e.target.value) || 0))} />
                                        <button type="button"
                                            className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-lg font-bold grid place-items-center hover:bg-slate-100 transition cursor-pointer flex-shrink-0"
                                            onClick={() => setPresentCount(q => q + 1)}>+</button>
                                    </div>
                                </Field>

                                {/* Anggota tidak hadir */}
                                <Field label="Nama Anggota Yang Tidak Hadir">
                                    <div className="flex flex-col gap-2">
                                        {absentMembers.map((m) => (
                                            <div key={m._key} className="p-3 rounded-[12px] border border-slate-200 bg-slate-50 flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <EmployeeSearch
                                                        employees={employees}
                                                        value={m.employee_id}
                                                        onChange={v => updateAbsent(m._key, 'employee_id', v)}
                                                        placeholder="— Pilih Anggota —"
                                                    />
                                                    <DeleteBtn onClick={() => removeAbsent(m._key)} />
                                                </div>
                                                <div className="flex gap-1.5">
                                                    {ABSENCE_REASONS.map(reason => {
                                                        const s = ABSENCE_REASON_STYLE[reason];
                                                        const active = m.absence_reason === reason;
                                                        return (
                                                            <button key={reason} type="button"
                                                                onClick={() => updateAbsent(m._key, 'absence_reason', reason)}
                                                                className={`flex-1 py-1.5 rounded-[8px] border text-[11.5px] font-semibold transition cursor-pointer ${active ? s.active : s.inactive + ' hover:bg-slate-50'}`}>
                                                                {reason}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                        <AddRowBtn onClick={addAbsent} color="hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/50">
                                            Tambah Anggota Tidak Hadir
                                        </AddRowBtn>
                                    </div>
                                </Field>

                                {/* Waktu mulai produksi */}
                                <Field label="Waktu Mulai Produksi" required>
                                    <input className={inputCls} type="time"
                                        value={productionStartTime} onChange={e => setProductionStartTime(e.target.value)} />
                                </Field>

                                {/* Keterlambatan */}
                                <Field label="Apakah Ada Keterlambatan?" required>
                                    <div className="flex gap-2">
                                        <RadioCard value="Ya" current={isLate}
                                            onChange={(v) => { setIsLate(v); if (v === 'Tidak') setLateMembers([]); }}
                                            activeStyle={{ border: 'border-red-400 bg-red-50', ring: 'border-red-500', dot: 'bg-red-500', text: 'text-red-800' }}>
                                            Ya
                                        </RadioCard>
                                        <RadioCard value="Tidak" current={isLate}
                                            onChange={(v) => { setIsLate(v); if (v === 'Tidak') setLateMembers([]); }}
                                            activeStyle={{ border: 'border-emerald-400 bg-emerald-50', ring: 'border-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-800' }}>
                                            Tidak
                                        </RadioCard>
                                    </div>
                                </Field>

                                {/* Nama yang terlambat */}
                                {isLate === 'Ya' && (
                                    <Field label="Nama Yang Terlambat" required>
                                        <div className="flex flex-col gap-2">
                                            {lateMembers.map((m) => (
                                                <div key={m._key} className="flex items-center gap-2">
                                                    <EmployeeSearch
                                                        employees={employees}
                                                        value={m.employee_id}
                                                        onChange={v => updateLate(m._key, 'employee_id', v)}
                                                        placeholder="— Pilih Anggota —"
                                                    />
                                                    <input
                                                        className="w-[88px] flex-shrink-0 px-2 py-2.5 border border-slate-200 rounded-[12px] bg-slate-50 font-[inherit] text-[12.5px] text-slate-900 text-center outline-none transition focus:border-blue-400 focus:bg-white"
                                                        type="time"
                                                        value={m.late_time}
                                                        onChange={e => updateLate(m._key, 'late_time', e.target.value)} />
                                                    <DeleteBtn onClick={() => removeLate(m._key)} />
                                                </div>
                                            ))}
                                            <AddRowBtn onClick={addLate} color="hover:border-red-400 hover:text-red-500 hover:bg-red-50/50">
                                                Tambah Anggota Terlambat
                                            </AddRowBtn>
                                        </div>
                                    </Field>
                                )}

                                {/* Kebersihan area */}
                                <Field label="Kebersihan Area Produksi (Lantai, Mesin dan atau Area Kerja Terkait)" required>
                                    <div className="flex gap-2">
                                        <RadioCard value="Bersih" current={areaCleanliness} onChange={setAreaCleanliness}
                                            activeStyle={{ border: 'border-emerald-400 bg-emerald-50', ring: 'border-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-800' }}>
                                            Bersih
                                        </RadioCard>
                                        <RadioCard value="Kotor" current={areaCleanliness} onChange={setAreaCleanliness}
                                            activeStyle={{ border: 'border-red-400 bg-red-50', ring: 'border-red-500', dot: 'bg-red-500', text: 'text-red-800' }}>
                                            Kotor
                                        </RadioCard>
                                    </div>
                                </Field>

                                {/* Uraikan kendala */}
                                <Field label="Uraikan Kendala Yang Terjadi Jika Ada (Mesin, Alur, Manusia/Timnya, dll)">
                                    <textarea
                                        className={inputCls + ' resize-none min-h-[80px]'}
                                        placeholder="Uraikan kendala jika ada…"
                                        rows={3}
                                        value={constraintNotes}
                                        onChange={e => setConstraintNotes(e.target.value)} />
                                </Field>
                            </Section>

                            {/* ── Section 3 – Dokumentasi Briefing ── */}
                            <Section color="bg-rose-500" title="Dokumentasi Briefing">
                                <Field label="Foto Briefing (opsional)">
                                    <input type="file" ref={galleryRef} accept="image/*"
                                        className="hidden" onChange={handleFileChange} />

                                    {briefingDocPreview && (
                                        <div className="relative rounded-xl overflow-hidden border border-slate-200 mb-2">
                                            <img src={briefingDocPreview} alt="Dokumentasi Briefing"
                                                className="w-full max-h-48 object-contain bg-slate-100" />
                                            <button type="button" onClick={removeDoc}
                                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white grid place-items-center cursor-pointer hover:bg-black/70 transition">
                                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                                                    <line x1="2" y1="2" x2="10" y2="10" /><line x1="10" y1="2" x2="2" y2="10" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setShowCamera(true)}
                                            className="flex-1 py-3 rounded-[12px] border-2 border-dashed border-slate-300 text-slate-500 text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition cursor-pointer">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                                                <circle cx="12" cy="13" r="4" />
                                            </svg>
                                            {briefingDocPreview ? 'Ambil Ulang' : 'Ambil Foto'}
                                        </button>
                                        <button type="button" onClick={() => galleryRef.current?.click()}
                                            className="flex-1 py-3 rounded-[12px] border-2 border-dashed border-slate-300 text-slate-500 text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:border-violet-400 hover:text-violet-500 hover:bg-violet-50/50 transition cursor-pointer">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                <circle cx="8.5" cy="8.5" r="1.5" />
                                                <polyline points="21 15 16 10 5 21" />
                                            </svg>
                                            {briefingDocPreview ? 'Ganti dari Galeri' : 'Dari Galeri'}
                                        </button>
                                    </div>
                                </Field>
                            </Section>

                            {/* Error */}
                            {submitError && (
                                <div className="bg-red-50 border border-red-200 rounded-[12px] px-4 py-3 text-[12.5px] text-red-600 font-medium">
                                    {submitError}
                                </div>
                            )}

                            {/* Submit */}
                            <button type="submit" disabled={submitting}
                                className="w-full py-[14px] rounded-[16px] text-[14px] font-bold text-white flex items-center justify-center gap-2 transition hover:opacity-90 active:scale-[.98] disabled:opacity-60 shadow-[0_4px_14px_rgba(16,185,129,.3)] border-none cursor-pointer"
                                style={{ background: 'linear-gradient(135deg, #065F46 0%, #10B981 100%)' }}>
                                {submitting ? (
                                    <>
                                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                                            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity=".3" />
                                            <path d="M21 12a9 9 0 00-9-9" />
                                        </svg>
                                        {editingId ? 'Memperbarui…' : 'Mengirim…'}
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
                                        </svg>
                                        {editingId ? 'Update Laporan' : 'Kirim Laporan'}
                                    </>
                                )}
                            </button>
                        </form>
                    </main>
                )}

                {/* ── HISTORY TAB ── */}
                {activeTab === 'history' && (
                    <main className="flex-1 px-[13px] py-[14px] pb-10 flex flex-col gap-3 overflow-y-auto">
                        {/* Filter */}
                        <div className="bg-white rounded-[16px] border border-slate-200 p-3 shadow-[0_1px_4px_rgba(0,0,0,.04)]">
                            <div className="text-[12px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                                </svg>
                                Filter Riwayat
                            </div>
                            {/* Search */}
                            <div className="mb-2">
                                <label className="text-[10px] font-semibold text-slate-400 mb-0.5 block">Cari</label>
                                <div className="relative">
                                    <input
                                        className={inputCls + ' pr-9'}
                                        type="text"
                                        placeholder="Area, PIC, kendala…"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                    <svg className="absolute right-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-[10px] font-semibold text-slate-400 mb-0.5 block">Dari</label>
                                    <input className={inputCls} type="date"
                                        value={historyStart} onChange={e => setHistoryStart(e.target.value)} />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-semibold text-slate-400 mb-0.5 block">Sampai</label>
                                    <input className={inputCls} type="date"
                                        value={historyEnd} onChange={e => setHistoryEnd(e.target.value)} />
                                </div>
                            </div>
                            <button onClick={fetchHistory}
                                className="mt-2 w-full h-[36px] rounded-[10px] bg-slate-900 text-white text-[11.5px] font-bold cursor-pointer hover:bg-slate-800 transition">
                                Terapkan Filter
                            </button>
                        </div>

                        {/* List */}
                        {historyLoading ? (
                            <div className="py-10 text-center text-[12.5px] text-slate-400 font-medium">Memuat riwayat…</div>
                        ) : (
                            (() => {
                                const q = searchQuery.trim().toLowerCase();
                                const filtered = reports.filter(r => {
                                    if (!q) return true;
                                    return (
                                        (r.area_name || '').toLowerCase().includes(q) ||
                                        (r.pic_name || '').toLowerCase().includes(q) ||
                                        (r.role || '').toLowerCase().includes(q) ||
                                        (r.area_cleanliness || '').toLowerCase().includes(q) ||
                                        (r.constraint_notes || '').toLowerCase().includes(q)
                                    );
                                });

                                if (filtered.length === 0) {
                                    return (
                                        <div className="py-10 text-center">
                                            <div className="w-14 h-14 rounded-full bg-slate-100 grid place-items-center mx-auto mb-3">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                                    <polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                                                </svg>
                                            </div>
                                            <div className="text-[13px] font-bold text-slate-700 mb-1">
                                                {q ? 'Tidak Ditemukan' : 'Belum Ada Laporan'}
                                            </div>
                                            <div className="text-[11.5px] text-slate-400">
                                                {q ? 'Tidak ada laporan yang cocok dengan pencarian.' : 'Laporan harian yang pernah kamu buat akan muncul di sini.'}
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="flex flex-col gap-3">
                                        {filtered.map((r) => (
                                            <DailyReportCard
                                                key={r.id}
                                                report={r}
                                                onEdit={() => startEdit(r)}
                                                onDelete={() => setDeleteConfirmId(r.id)}
                                            />
                                        ))}
                                    </div>
                                );
                            })()
                        )}
                    </main>
                )}

                {/* Camera modal */}
                {showCamera && (
                    <CameraModal onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />
                )}

                {/* Duplicate submission warning */}
                {showDuplicateModal && (
                    <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-[4px] grid place-items-center px-6">
                        <div className="bg-white rounded-[24px] p-7 text-center max-w-[300px] w-full shadow-2xl">
                            <div className="w-14 h-14 rounded-full bg-amber-50 border-2 border-amber-200 grid place-items-center mx-auto mb-4">
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                            </div>
                            <div className="text-[15px] font-bold text-slate-900 mb-2">Laporan Sudah Diisi</div>
                            <p className="text-[12.5px] text-slate-500 leading-relaxed mb-5">
                                Kamu sudah mengisi <span className="font-semibold text-slate-700">Laporan Harian Leader</span> hari ini. Apakah kamu ingin mengisi ulang?
                            </p>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => setShowDuplicateModal(false)}
                                    className="w-full py-2.5 rounded-[12px] bg-amber-500 text-white text-[13px] font-bold cursor-pointer hover:bg-amber-600 transition">
                                    Ya, Lanjutkan Isi
                                </button>
                                <button onClick={() => { setShowDuplicateModal(false); setActiveTab('history'); }}
                                    className="w-full py-2.5 rounded-[12px] border border-slate-200 text-slate-600 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition">
                                    Lihat Riwayat
                                </button>
                                <button onClick={() => navigate(-1)}
                                    className="w-full py-2.5 rounded-[12px] border border-slate-200 text-slate-500 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition">
                                    Batal, Kembali
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Success modal */}
                {success && (
                    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[4px] grid place-items-center px-6"
                        onClick={resetForm}>
                        <div className="bg-white rounded-[24px] p-8 text-center max-w-[300px] w-full shadow-2xl"
                            onClick={e => e.stopPropagation()}>
                            <div className="text-[48px] mb-3">✅</div>
                            <div className="text-[16px] font-bold text-slate-900 mb-1.5">
                                {editingId ? 'Laporan Diperbarui!' : 'Laporan Terkirim!'}
                            </div>
                            <div className="text-[12.5px] text-slate-500 leading-relaxed mb-5">
                                {editingId
                                    ? 'Perubahan berhasil disimpan.'
                                    : 'Laporan harian leader berhasil dicatat dan tersimpan.'}
                            </div>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => { resetForm(); setActiveTab('history'); }}
                                    className="w-full py-2.5 rounded-[12px] bg-emerald-600 text-white text-[13px] font-bold cursor-pointer hover:bg-emerald-700 transition">
                                    Lihat Riwayat
                                </button>
                                <button onClick={resetForm}
                                    className="w-full py-2.5 rounded-[12px] border border-slate-200 text-slate-600 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition">
                                    {editingId ? 'Tutup' : 'Buat Laporan Baru'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete confirmation modal */}
                {deleteConfirmId && (
                    <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-[4px] grid place-items-center px-6">
                        <div className="bg-white rounded-[24px] p-7 text-center max-w-[300px] w-full shadow-2xl">
                            <div className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-200 grid place-items-center mx-auto mb-4">
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3,6 5,6 21,6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                                    <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                                </svg>
                            </div>
                            <div className="text-[15px] font-bold text-slate-900 mb-2">Hapus Laporan?</div>
                            <p className="text-[12.5px] text-slate-500 leading-relaxed mb-5">
                                Laporan ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
                            </p>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => handleDelete(deleteConfirmId)}
                                    className="w-full py-2.5 rounded-[12px] bg-red-500 text-white text-[13px] font-bold cursor-pointer hover:bg-red-600 transition">
                                    Ya, Hapus
                                </button>
                                <button onClick={() => setDeleteConfirmId(null)}
                                    className="w-full py-2.5 rounded-[12px] border border-slate-200 text-slate-600 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition">
                                    Batal
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Helper components ── */
function Section({ color, title, children }) {
    return (
        <div className="bg-white rounded-[20px] border border-slate-200 px-4 py-[18px] shadow-[0_1px_4px_rgba(0,0,0,.04)]">
            <div className="flex items-center gap-2 text-[13px] font-bold text-slate-900 mb-[14px] pb-2.5 border-b border-slate-100">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                {title}
            </div>
            <div className="flex flex-col gap-[14px]">{children}</div>
        </div>
    );
}

function Field({ label, required, hint, children }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-slate-600 flex items-center gap-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
        </div>
    );
}

/* ── Daily Report History Card ── */
function DailyReportCard({ report, onEdit, onDelete }) {
    const isLate    = report.is_late === 1 || report.is_late === true;
    const isClean   = report.area_cleanliness === 'Bersih';
    const absentCnt = Number(report.absent_count) || 0;
    const lateCnt   = Number(report.late_count) || 0;
    const assetBase = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

    return (
        <div className="bg-white rounded-[20px] border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,.04)] overflow-hidden">
            {/* Card header */}
            <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium mb-0.5">{fmtDate(report.report_date)}</div>
                    <div className="text-[13.5px] font-bold text-slate-900 truncate">{report.area_name || '—'}</div>
                    <div className="text-[11.5px] text-slate-500 mt-0.5 truncate">{report.pic_name}</div>
                </div>
                <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                    report.role === 'Leader'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-violet-50 text-violet-700 border border-violet-200'
                }`}>
                    {report.role}
                </span>
            </div>

            {/* Stats row */}
            <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                    {report.present_count} hadir
                </span>

                {absentCnt > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                        {absentCnt} tidak hadir
                    </span>
                )}

                {lateCnt > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
                        </svg>
                        {lateCnt} terlambat
                    </span>
                )}

                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
                    </svg>
                    Mulai {(report.production_start_time || '').slice(0, 5)}
                </span>

                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border ${
                    isClean
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-600 border-red-200'
                }`}>
                    {isClean ? '✓' : '✗'} {report.area_cleanliness}
                </span>

                {isLate && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
                        ⚠ Terlambat
                    </span>
                )}
            </div>

            {/* Kendala */}
            {report.constraint_notes && (
                <div className="mx-4 mb-3 px-3 py-2 rounded-[10px] bg-slate-50 border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Kendala</div>
                    <div className="text-[11.5px] text-slate-600 leading-relaxed line-clamp-2">{report.constraint_notes}</div>
                </div>
            )}

            {/* Briefing doc thumbnail */}
            {report.briefing_doc_path && (
                <div className="mx-4 mb-3">
                    <img
                        src={`${assetBase}${report.briefing_doc_path}`}
                        alt="Foto Briefing"
                        className="w-full max-h-32 object-cover rounded-[10px] border border-slate-200"
                    />
                </div>
            )}

            {/* Footer */}
            <div className="px-4 pb-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <span className="text-[10.5px] text-slate-400">{fmtDateTime(report.created_at)}</span>
                <div className="flex gap-2">
                    <button onClick={onEdit}
                        className="h-[32px] px-3 rounded-[10px] bg-slate-50 border border-slate-200 text-slate-700 text-[11.5px] font-bold flex items-center gap-1.5 hover:bg-slate-100 transition cursor-pointer">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit
                    </button>
                    <button onClick={onDelete}
                        className="h-[32px] px-3 rounded-[10px] bg-red-50 border border-red-200 text-red-600 text-[11.5px] font-bold flex items-center gap-1.5 hover:bg-red-100 transition cursor-pointer">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3,6 5,6 21,6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                            <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                        </svg>
                        Hapus
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Searchable employee dropdown ── */
function EmployeeSearch({ employees, value, onChange, placeholder }) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const selected = employees.find(e => String(e.employee_id) === String(value));
    const filtered = query.trim()
        ? employees.filter(e => e.full_name.toLowerCase().includes(query.toLowerCase()))
        : employees;

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative flex-1 min-w-0">
            <div
                className="flex items-center justify-between px-3 py-2.5 border border-slate-200 rounded-[12px] bg-slate-50 text-[12.5px] cursor-pointer select-none transition hover:bg-white hover:border-blue-400"
                onClick={() => { setOpen(o => !o); setQuery(''); }}>
                <span className={selected ? 'text-slate-900 truncate' : 'text-slate-400 truncate'}>
                    {selected ? selected.full_name : placeholder}
                </span>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="flex-shrink-0 ml-2">
                    <path d="M1 1l4 4 4-4" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
            {open && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-[12px] shadow-lg overflow-hidden">
                    <div className="px-2.5 pt-2.5 pb-1.5">
                        <input
                            autoFocus
                            className="w-full px-3 py-2 border border-slate-200 rounded-[8px] bg-slate-50 text-[12.5px] outline-none focus:border-blue-400 focus:bg-white placeholder:text-slate-400"
                            placeholder="Cari nama…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                    </div>
                    <div className="max-h-44 overflow-y-auto pb-1.5">
                        {filtered.length === 0 ? (
                            <div className="px-4 py-3 text-[12px] text-slate-400 text-center">Tidak ditemukan</div>
                        ) : filtered.map(emp => (
                            <div
                                key={emp.employee_id}
                                className={`px-4 py-2 text-[12.5px] cursor-pointer transition ${
                                    String(emp.employee_id) === String(value)
                                        ? 'bg-blue-50 text-blue-700 font-semibold'
                                        : 'text-slate-700 hover:bg-slate-50'
                                }`}
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => { onChange(emp.employee_id); setOpen(false); setQuery(''); }}>
                                {emp.full_name}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Live timestamp overlay ── */
function LiveTimestamp() {
    const [ts, setTs] = useState('');
    useEffect(() => {
        const fmt = () => {
            const n = new Date();
            const pad = (v) => String(v).padStart(2, '0');
            setTs(`${pad(n.getDate())}/${pad(n.getMonth()+1)}/${n.getFullYear()} ${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`);
        };
        fmt();
        const id = setInterval(fmt, 1000);
        return () => clearInterval(id);
    }, []);
    return (
        <div className="absolute bottom-20 right-3 px-2.5 py-1 rounded-[6px] bg-black/55 text-white text-[12px] font-mono font-bold pointer-events-none select-none">
            {ts}
        </div>
    );
}

/* ── In-browser camera modal ── */
function CameraModal({ onCapture, onClose }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [camError, setCamError] = useState(null);
    const [facingMode, setFacingMode] = useState('environment');

    useEffect(() => {
        let cancelled = false;
        streamRef.current?.getTracks().forEach(t => t.stop());

        navigator.mediaDevices
            .getUserMedia({ video: { facingMode: { ideal: facingMode } }, audio: false })
            .then(stream => {
                if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().then(() => {
                        if (!cancelled) { setReady(true); setCamError(null); }
                    });
                }
            })
            .catch(err => {
                if (!cancelled) { setReady(false); setCamError('Tidak dapat mengakses kamera: ' + err.message); }
            });

        return () => {
            cancelled = true;
            streamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, [facingMode]);

    const flipCamera = () => {
        setReady(false);
        setCamError(null);
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    };

    const capture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0);
        if (facingMode === 'user') {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        const n = new Date();
        const pad = (v) => String(v).padStart(2, '0');
        const label = `${pad(n.getDate())}/${pad(n.getMonth()+1)}/${n.getFullYear()} ${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
        const fontSize = Math.max(14, Math.floor(canvas.width / 28));
        ctx.font = `bold ${fontSize}px monospace`;
        const tw = ctx.measureText(label).width;
        const pad8 = 10;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(canvas.width - tw - pad8 * 2 - 6, canvas.height - fontSize - pad8 * 2 - 6, tw + pad8 * 2, fontSize + pad8);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, canvas.width - tw - pad8 - 6, canvas.height - pad8 - 6);

        canvas.toBlob(blob => {
            if (!blob) return;
            const file = new File([blob], `briefing_${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(file);
        }, 'image/jpeg', 0.9);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/75 flex items-center justify-center p-4">
            <div className="w-full max-w-[360px] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
                    <span className="text-white text-[14px] font-bold">Ambil Foto Briefing</span>
                    <button onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 text-white/70 grid place-items-center hover:bg-white/20 hover:text-white transition cursor-pointer">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="2" y1="2" x2="10" y2="10" /><line x1="10" y1="2" x2="2" y2="10" />
                        </svg>
                    </button>
                </div>

                <div className="relative w-full" style={{ aspectRatio: '4/3', background: '#111' }}>
                    {camError ? (
                        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                            <div>
                                <div className="text-red-400 text-[13px] font-semibold mb-1">Kamera Tidak Tersedia</div>
                                <div className="text-white/50 text-[11px] leading-relaxed">{camError}</div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                className="absolute inset-0 w-full h-full object-cover"
                                style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : undefined}
                                playsInline
                                muted
                            />
                            {ready && <LiveTimestamp />}
                            <canvas ref={canvasRef} className="hidden" />
                        </>
                    )}
                </div>

                <div className="flex-shrink-0 flex justify-between items-center px-8 py-5">
                    <button onClick={onClose}
                        className="w-11 h-11 rounded-full bg-white/10 text-white/60 grid place-items-center hover:bg-white/20 transition cursor-pointer">
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="12,4 6,10 12,16" />
                        </svg>
                    </button>

                    <button onClick={capture} disabled={!ready || !!camError}
                        className="w-[68px] h-[68px] rounded-full border-4 border-white grid place-items-center shadow-lg transition hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer">
                        <div className="w-[52px] h-[52px] rounded-full bg-white" />
                    </button>

                    <button onClick={flipCamera} disabled={!!camError}
                        className="w-11 h-11 rounded-full bg-white/10 text-white/70 grid place-items-center hover:bg-white/20 hover:text-white transition cursor-pointer disabled:opacity-30">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 4v6h6" />
                            <path d="M23 20v-6h-6" />
                            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
