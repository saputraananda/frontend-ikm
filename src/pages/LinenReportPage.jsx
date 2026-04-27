import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

const FINDING_TYPES = [
    'Rewash',
    'Robek',
    'Bolong',
    'Jahitan lepas',
    'Tali lepas',
    'Kancing hilang',
    'Resleting rusak',
    'Noda membandel (Sudah dispotting ttp tidak hilang)',
    'Darah / cairan tubuh',
    'Luntur warna',
    'Tipis / aus',
    'Lainnya',
];

const ASSET_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function LinenReportPage() {
    const navigate = useNavigate();
    const fileRef = useRef(null);

    /* Master data */
    const [areas, setAreas] = useState([]);
    const [hospitals, setHospitals] = useState([]);

    /* Form fields */
    const [reporterName, setReporterName] = useState('');
    const [reportDate, setReportDate] = useState(todayStr());
    const [areaId, setAreaId] = useState('');
    const [hospitalId, setHospitalId] = useState('');
    const [findingLocation, setFindingLocation] = useState('');
    const [linenType, setLinenType] = useState('');
    const [findingType, setFindingType] = useState('');
    const [findingOther, setFindingOther] = useState('');
    const [findingQty, setFindingQty] = useState(1);
    const [attachmentFile, setAttachmentFile] = useState(null);
    const [attachmentPreview, setAttachmentPreview] = useState(null);

    /* UI state */
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);

    useEffect(() => {
        document.title = 'Pemeriksaan Linen | IKM Mobile';
        Promise.all([
            api.get('/linen-report/areas'),
            api.get('/linen-report/hospitals'),
            api.get('/linen-report/check-today'),
        ]).then(([areasRes, hospitalsRes, checkRes]) => {
            setAreas(areasRes.data?.data || []);
            setHospitals(hospitalsRes.data?.data || []);
            if (checkRes.data?.data?.submitted) setShowDuplicateModal(true);
        }).catch(() => {});
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAttachmentFile(file);
        setAttachmentPreview(URL.createObjectURL(file));
    };

    const removeFile = () => {
        setAttachmentFile(null);
        if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
        setAttachmentPreview(null);
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError(null);

        const resolvedFinding = findingType === 'Lainnya' ? findingOther.trim() : findingType;

        if (!reporterName.trim()) return setSubmitError('Nama penemu wajib diisi.');
        if (!reportDate) return setSubmitError('Tanggal temuan wajib diisi.');
        if (!findingLocation) return setSubmitError('Lokasi penemuan wajib dipilih.');
        if (!areaId) return setSubmitError('Divisi wajib dipilih.');
        if (!hospitalId) return setSubmitError('Rumah sakit wajib dipilih.');
        if (!linenType.trim()) return setSubmitError('Jenis linen wajib diisi.');
        if (!findingType) return setSubmitError('Jenis temuan wajib dipilih.');
        if (findingType === 'Lainnya' && !resolvedFinding) return setSubmitError('Keterangan jenis temuan lainnya wajib diisi.');
        if (!findingQty || findingQty < 1) return setSubmitError('Jumlah linen minimal 1.');

        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('reporter_name', reporterName.trim());
            fd.append('report_date', reportDate);
            fd.append('area_id', areaId);
            fd.append('hospital_id', hospitalId);
            fd.append('finding_location', findingLocation);
            fd.append('linen_type', linenType.trim());
            fd.append('finding_type', resolvedFinding);
            fd.append('finding_qty', String(findingQty));
            if (attachmentFile) fd.append('attachment', attachmentFile);

            await api.post('/linen-report', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setSuccess(true);
        } catch (err) {
            setSubmitError(err?.response?.data?.message || 'Gagal mengirim laporan, coba lagi.');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setReporterName('');
        setReportDate(todayStr());
        setAreaId('');
        setHospitalId('');
        setFindingLocation('');
        setLinenType('');
        setFindingType('');
        setFindingOther('');
        setFindingQty(1);
        removeFile();
        setSubmitError(null);
        setSuccess(false);
    };

    /* ── Shared input class ── */
    const inputCls = 'w-full px-3 py-2.5 border border-slate-200 rounded-[12px] bg-slate-50 font-[inherit] text-[13px] text-slate-900 outline-none transition focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,.12)] focus:bg-white placeholder:text-slate-400';
    const selectCls = inputCls + ' cursor-pointer appearance-none';
    const selectStyle = {
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: 32,
    };

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
                        <div className="text-[14px] font-bold text-white tracking-[-0.01em] truncate">Pemeriksaan Linen PT IKM</div>
                    </div>
                </header>

                {/* Main */}
                <main className="flex-1 px-[13px] py-[14px] pb-10 flex flex-col gap-2.5 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                        {/* Banner */}
                        <div className="relative overflow-hidden rounded-[20px] px-5 py-[18px] text-white"
                            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)' }}>
                            <div className="absolute -top-8 -right-8 w-[110px] h-[110px] rounded-full bg-white/[.07] pointer-events-none" />
                            <div className="text-[16px] font-bold mb-0.5">Form Temuan Linen</div>
                            <p className="text-[11.5px] opacity-70 leading-relaxed">Catat setiap temuan linen bermasalah secara detail agar dapat segera ditindaklanjuti.</p>
                        </div>

                        {/* Section 1 – Identitas */}
                        <Section color="bg-blue-500" title="Identitas Pelapor">
                            <Field label="Nama Penemu Temuan (Karyawan IKM)" required>
                                <input className={inputCls} type="text" placeholder="Masukkan nama lengkap"
                                    value={reporterName} onChange={e => setReporterName(e.target.value)} />
                            </Field>
                            <Field label="Tanggal Temuan" required>
                                <input className={inputCls} type="date"
                                    value={reportDate} onChange={e => setReportDate(e.target.value)} />
                            </Field>
                        </Section>

                        {/* Section 2 – Lokasi */}
                        <Section color="bg-emerald-500" title="Lokasi & Asal Linen">
                            <Field label="Lokasi Penemuan" required>
                                <div className="flex gap-2">
                                    {['Rumah Sakit', 'IKM'].map(loc => (
                                        <label key={loc}
                                            className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] border cursor-pointer transition ${
                                                findingLocation === loc
                                                    ? 'border-emerald-400 bg-emerald-50'
                                                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                                            }`}
                                            onClick={() => setFindingLocation(loc)}>
                                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 grid place-items-center transition ${
                                                findingLocation === loc ? 'border-emerald-500' : 'border-slate-300'
                                            }`}>
                                                {findingLocation === loc && (
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                )}
                                            </div>
                                            <span className={`text-[12.5px] font-medium ${
                                                findingLocation === loc ? 'text-emerald-800' : 'text-slate-700'
                                            }`}>{loc}</span>
                                        </label>
                                    ))}
                                </div>
                            </Field>
                            <Field label="Divisi Penemuan" required>
                                <select className={selectCls} style={selectStyle}
                                    value={areaId} onChange={e => setAreaId(e.target.value)}>
                                    <option value="">— Pilih Divisi —</option>
                                    {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </Field>
                            <Field label="Linen Rumah Sakit" required>
                                <select className={selectCls} style={selectStyle}
                                    value={hospitalId} onChange={e => setHospitalId(e.target.value)}>
                                    <option value="">— Pilih Rumah Sakit —</option>
                                    {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                </select>
                            </Field>
                        </Section>

                        {/* Section 3 – Detail Linen */}
                        <Section color="bg-violet-500" title="Detail Linen">
                            <Field label="Jenis Linen (+ Sebutkan Ukurannya)" required hint="Contoh: Baju Scrub Dokter -S">
                                <input className={inputCls} type="text" placeholder="Contoh: Baju Scrub Dokter -S"
                                    value={linenType} onChange={e => setLinenType(e.target.value)} />
                            </Field>
                            <Field label="Jumlah Linen Bermasalah" required>
                                <div className="flex items-center gap-2">
                                    <button type="button"
                                        className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-lg font-bold grid place-items-center hover:bg-slate-100 transition cursor-pointer flex-shrink-0"
                                        onClick={() => setFindingQty(q => Math.max(1, q - 1))}>−</button>
                                    <input className={inputCls + ' text-center font-bold text-[15px]'} type="number" min="1"
                                        value={findingQty} onChange={e => setFindingQty(Math.max(1, parseInt(e.target.value) || 1))} />
                                    <button type="button"
                                        className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-lg font-bold grid place-items-center hover:bg-slate-100 transition cursor-pointer flex-shrink-0"
                                        onClick={() => setFindingQty(q => q + 1)}>+</button>
                                </div>
                            </Field>
                        </Section>

                        {/* Section 4 – Jenis Temuan */}
                        <Section color="bg-amber-500" title="Jenis Temuan">
                            <Field label="Pilih jenis temuan" required>
                                <div className="flex flex-col gap-1.5">
                                    {FINDING_TYPES.map(ft => (
                                        <label key={ft}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-[12px] border cursor-pointer transition ${
                                                findingType === ft
                                                    ? 'border-amber-400 bg-amber-50'
                                                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                                            }`}
                                            onClick={() => setFindingType(ft)}>
                                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 grid place-items-center transition ${
                                                findingType === ft ? 'border-amber-500' : 'border-slate-300'
                                            }`}>
                                                {findingType === ft && (
                                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                                )}
                                            </div>
                                            <span className={`text-[12.5px] font-medium ${findingType === ft ? 'text-amber-800' : 'text-slate-700'}`}>
                                                {ft}
                                            </span>
                                        </label>
                                    ))}
                                    {findingType === 'Lainnya' && (
                                        <input className={inputCls + ' mt-1'} type="text"
                                            placeholder="Keterangan jenis temuan lainnya…"
                                            value={findingOther} onChange={e => setFindingOther(e.target.value)} />
                                    )}
                                </div>
                            </Field>
                        </Section>

                        {/* Section 5 – Lampiran */}
                        <Section color="bg-rose-500" title="Bukti Lampiran">
                            <Field label="Foto Bukti (harap lampirkan foto yang jelas untuk memperlihatkan letak kerusakan)">
                                <input type="file" ref={fileRef} accept="image/*" className="hidden"
                                    onChange={handleFileChange} />
                                {attachmentPreview ? (
                                    <div className="relative rounded-xl overflow-hidden border border-slate-200 mb-2">
                                        <img src={attachmentPreview} alt="Lampiran"
                                            className="w-full max-h-48 object-contain bg-slate-100" />
                                        <button type="button" onClick={removeFile}
                                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white grid place-items-center cursor-pointer hover:bg-black/70 transition">
                                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                                                <line x1="2" y1="2" x2="10" y2="10" /><line x1="10" y1="2" x2="2" y2="10" />
                                            </svg>
                                        </button>
                                    </div>
                                ) : null}
                                <button type="button" onClick={() => fileRef.current?.click()}
                                    className="w-full py-3 rounded-[12px] border-2 border-dashed border-slate-300 text-slate-500 text-[12.5px] font-semibold flex items-center justify-center gap-2 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition cursor-pointer">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                        <polyline points="17,8 12,3 7,8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    {attachmentFile ? 'Ganti Foto' : 'Upload Foto Bukti'}
                                </button>
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
                            className="w-full py-[14px] rounded-[16px] text-[14px] font-bold text-white flex items-center justify-center gap-2 transition hover:opacity-90 active:scale-[.98] disabled:opacity-60 shadow-[0_4px_14px_rgba(59,130,246,.35)] border-none cursor-pointer"
                            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)' }}>
                            {submitting ? (
                                <>
                                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity=".3" />
                                        <path d="M21 12a9 9 0 00-9-9" />
                                    </svg>
                                    Mengirim…
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
                                    </svg>
                                    Kirim Laporan
                                </>
                            )}
                        </button>
                    </form>
                </main>

                {/* Duplicate submission warning */}
                {showDuplicateModal && (
                    <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-[4px] grid place-items-center px-6">
                        <div className="bg-white rounded-[24px] p-7 text-center max-w-[300px] w-full shadow-2xl">
                            <div className="w-14 h-14 rounded-full bg-amber-50 border-2 border-amber-200 grid place-items-center mx-auto mb-4">
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                                </svg>
                            </div>
                            <div className="text-[15px] font-bold text-slate-900 mb-2">Laporan Sudah Diisi</div>
                            <p className="text-[12.5px] text-slate-500 leading-relaxed mb-5">
                                Kamu sudah mengisi <span className="font-semibold text-slate-700">Pemeriksaan Linen</span> hari ini. Apakah kamu ingin mengisi ulang?
                            </p>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => setShowDuplicateModal(false)}
                                    className="w-full py-2.5 rounded-[12px] bg-amber-500 text-white text-[13px] font-bold cursor-pointer hover:bg-amber-600 transition">
                                    Ya, Lanjutkan Isi
                                </button>
                                <button onClick={() => navigate(-1)}
                                    className="w-full py-2.5 rounded-[12px] border border-slate-200 text-slate-600 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition">
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
                            <div className="text-[16px] font-bold text-slate-900 mb-1.5">Laporan Terkirim!</div>
                            <div className="text-[12.5px] text-slate-500 leading-relaxed mb-5">
                                Temuan linen berhasil dicatat dan akan segera ditindaklanjuti.
                            </div>
                            <div className="flex flex-col gap-2">
                                <button onClick={resetForm}
                                    className="w-full py-2.5 rounded-[12px] bg-blue-600 text-white text-[13px] font-bold cursor-pointer hover:bg-blue-700 transition">
                                    Buat Laporan Baru
                                </button>
                                <button onClick={() => navigate(-1)}
                                    className="w-full py-2.5 rounded-[12px] border border-slate-200 text-slate-600 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition">
                                    Kembali ke Menu
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
