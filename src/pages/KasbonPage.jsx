import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import useAuthStore from "../store/authStore";

const ASSET_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fmtDate = (iso) => {
    if (!iso) return "-";
    const parts = String(iso).split("T")[0].split("-");
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

const fmtDateTime = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

const fmtRupiah = (n) => {
    const num = Number(n);
    if (!num || isNaN(num)) return "Rp 0";
    return "Rp " + num.toLocaleString("id-ID");
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
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { start: fmt(start), end: fmt(end) };
};

const STATUS_CFG = {
    pengajuan: { label: "Pengajuan", bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200" },
    proses:    { label: "Diproses",  bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
    disetujui: { label: "Disetujui", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    ditolak:   { label: "Ditolak",   bg: "bg-red-50",     text: "text-red-600",     border: "border-red-200" },
};

export default function KasbonPage() {
    const navigate = useNavigate();
    const galleryRef = useRef(null);
    const authUser = useAuthStore(s => s.user);

    /* ── Maintenance popup ── */
    // const [showMaintenance] = useState(true);
    const employeeName = authUser?.full_name || authUser?.name || "";

    const [activeTab, setActiveTab] = useState("form");
    const [editingId, setEditingId] = useState(null);

    const [type, setType] = useState("kasbon");
    const [submissionDate, setSubmissionDate] = useState(todayStr());
    const [purpose, setPurpose] = useState("");
    const [amountStr, setAmountStr] = useState("");
    const [notes, setNotes] = useState("");

    const [proofDoc, setProofDoc] = useState(null);
    const [proofDocPreview, setProofDocPreview] = useState(null);
    const [existingProofPath, setExistingProofPath] = useState(null);
    const [removeProofDoc, setRemoveProofDoc] = useState(false);
    const [showCamera, setShowCamera] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [success, setSuccess] = useState(false);

    const defaultRange = getCutoffRange();
    const [submissions, setSubmissions] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyStart, setHistoryStart] = useState(defaultRange.start);
    const [historyEnd, setHistoryEnd] = useState(defaultRange.end);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [expandedPayments, setExpandedPayments] = useState({});
    const [loadingPayments, setLoadingPayments] = useState({});

    useEffect(() => { document.title = "Kasbon & Pinjaman | IKM Mobile"; }, []);

    useEffect(() => {
        if (activeTab === "history") fetchHistory();
    }, [activeTab, historyStart, historyEnd]);

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const params = {};
            if (historyStart) params.startDate = historyStart;
            if (historyEnd)   params.endDate   = historyEnd;
            const res = await api.get("/kasbon/my-submissions", { params });
            setSubmissions(res.data?.data || []);
        } catch (err) {
            console.error("fetchHistory", err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setProofDoc(file);
        if (proofDocPreview && !existingProofPath) URL.revokeObjectURL(proofDocPreview);
        setProofDocPreview(URL.createObjectURL(file));
        e.target.value = "";
    };

    const removeDoc = () => {
        if (existingProofPath) setRemoveProofDoc(true);
        setProofDoc(null);
        if (proofDocPreview && !existingProofPath) URL.revokeObjectURL(proofDocPreview);
        setProofDocPreview(null);
        setExistingProofPath(null);
    };

    const handleCameraCapture = (file) => {
        setProofDoc(file);
        if (proofDocPreview && !existingProofPath) URL.revokeObjectURL(proofDocPreview);
        setProofDocPreview(URL.createObjectURL(file));
        setShowCamera(false);
    };

    const startEdit = (submission) => {
        if (submission.status !== "pengajuan") return;
        setEditingId(submission.id);
        setType(submission.type);
        setSubmissionDate(String(submission.submission_date).split("T")[0]);
        setPurpose(submission.purpose || "");
        setAmountStr(String(Math.round(Number(submission.amount_requested))));
        setNotes(submission.notes || "");
        if (submission.proof_path) {
            setExistingProofPath(submission.proof_path);
            setProofDocPreview(`${ASSET_BASE}${submission.proof_path}`);
        } else {
            setExistingProofPath(null);
            setProofDocPreview(null);
        }
        setProofDoc(null);
        setRemoveProofDoc(false);
        setSubmitError(null);
        setActiveTab("form");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError(null);
        if (!purpose.trim()) return setSubmitError("Keperluan/tujuan wajib diisi.");
        const amount = Number(amountStr);
        if (!amount || amount <= 0) return setSubmitError("Jumlah pengajuan harus lebih dari 0.");
        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append("type", type);
            fd.append("submission_date", submissionDate);
            fd.append("purpose", purpose.trim());
            fd.append("amount_requested", String(amount));
            fd.append("notes", notes.trim());
            if (proofDoc) fd.append("proof_doc", proofDoc);
            if (editingId && removeProofDoc && !proofDoc) fd.append("remove_proof", "1");
            if (editingId) {
                await api.put(`/kasbon/${editingId}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
            } else {
                await api.post("/kasbon", fd, { headers: { "Content-Type": "multipart/form-data" } });
            }
            setSuccess(true);
        } catch (err) {
            setSubmitError(err?.response?.data?.message || "Gagal mengirim pengajuan, coba lagi.");
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setType("kasbon");
        setSubmissionDate(todayStr());
        setPurpose("");
        setAmountStr("");
        setNotes("");
        setProofDoc(null);
        if (proofDocPreview && !existingProofPath) URL.revokeObjectURL(proofDocPreview);
        setProofDocPreview(null);
        setExistingProofPath(null);
        setRemoveProofDoc(false);
        setEditingId(null);
        setSubmitError(null);
        setSuccess(false);
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/kasbon/${id}`);
            setDeleteConfirmId(null);
            fetchHistory();
        } catch (err) {
            console.error("deleteSubmission", err);
            setDeleteConfirmId(null);
        }
    };

    const togglePayments = async (id) => {
        if (expandedPayments[id] !== undefined) {
            setExpandedPayments(p => { const n = { ...p }; delete n[id]; return n; });
            return;
        }
        setLoadingPayments(p => ({ ...p, [id]: true }));
        try {
            const res = await api.get(`/kasbon/${id}`);
            setExpandedPayments(p => ({ ...p, [id]: res.data?.data?.payments || [] }));
        } catch (err) {
            console.error("togglePayments", err);
        } finally {
            setLoadingPayments(p => { const n = { ...p }; delete n[id]; return n; });
        }
    };

    const inputCls = "w-full px-3 py-2.5 border border-slate-200 rounded-[12px] bg-slate-50 font-[inherit] text-[13px] text-slate-900 outline-none transition focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,.12)] focus:bg-white placeholder:text-slate-400";

    return (
        <div className="min-h-[100dvh] bg-slate-100 flex justify-center">
            <div className="w-full max-w-[430px] min-h-[100dvh] bg-white flex flex-col shadow-[0_0_0_1px_rgba(0,0,0,.05),0_8px_48px_rgba(0,0,0,.07)]">

                {/* ── Maintenance popup ── */}
                {/* {showMaintenance && (
                    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-[4px] grid place-items-center px-6">
                        <div className="bg-white rounded-[24px] p-7 text-center max-w-[320px] w-full shadow-2xl">
                            <div className="w-16 h-16 rounded-full bg-amber-100 grid place-items-center mx-auto mb-4">
                                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="8" x2="12" y2="12"/>
                                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                            </div>
                            <div className="text-[16px] font-extrabold text-slate-900 mb-2">Halaman Sedang Dalam Perbaikan</div>
                            <p className="text-[12.5px] text-slate-500 leading-relaxed mb-5">
                                Fitur ini belum tersedia saat ini. Silakan coba lagi beberapa saat ke depan.
                            </p>
                            <button
                                onClick={() => navigate(-1)}
                                className="w-full h-[44px] rounded-[14px] bg-[#0B1739] text-white text-[13px] font-bold cursor-pointer hover:bg-[#0d1f4a] transition">
                                Kembali
                            </button>
                        </div>
                    </div>
                )} */}

                <header className="sticky top-0 z-20 bg-[#0B1739] h-14 flex items-center gap-3 px-4 border-b border-white/[.06] flex-shrink-0">
                    <button className="w-[34px] h-[34px] rounded-[8px] border border-white/10 bg-white/[.07] text-white/70 grid place-items-center cursor-pointer flex-shrink-0 transition hover:bg-white/[.15] hover:text-white"
                        onClick={() => navigate(-1)} aria-label="Kembali">
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="12,4 6,10 12,16" />
                        </svg>
                    </button>
                    <div className="min-w-0">
                        <div className="text-[9.5px] font-semibold tracking-[.14em] uppercase text-[#93C5FD] opacity-65">Sistem Absensi</div>
                        <div className="text-[14px] font-bold text-white tracking-[-0.01em] truncate">Kasbon &amp; Pinjaman</div>
                    </div>
                </header>

                <div className="bg-white px-4 pt-3 pb-0 flex-shrink-0">
                    <div className="flex rounded-[14px] bg-slate-100 p-1">
                        <button className={`flex-1 h-[38px] rounded-[10px] text-[12.5px] font-bold transition cursor-pointer ${activeTab === "form" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            onClick={() => setActiveTab("form")}>Pengajuan</button>
                        <button className={`flex-1 h-[38px] rounded-[10px] text-[12.5px] font-bold transition cursor-pointer ${activeTab === "history" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            onClick={() => setActiveTab("history")}>Riwayat</button>
                    </div>
                </div>

                {activeTab === "form" && (
                    <main className="flex-1 px-[13px] py-[14px] pb-10 flex flex-col gap-2.5 overflow-y-auto">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                            <div className="relative overflow-hidden rounded-[20px] px-5 py-[18px] text-white"
                                style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)" }}>
                                <div className="absolute -top-8 -right-8 w-[110px] h-[110px] rounded-full bg-white/[.07] pointer-events-none" />
                                <div className="text-[16px] font-bold mb-0.5">{editingId ? "Edit Pengajuan" : "Kasbon & Pinjaman"}</div>
                                <p className="text-[11.5px] opacity-70 leading-relaxed">
                                    {editingId ? "Perbarui data pengajuan kasbon atau pinjaman Anda." : "Ajukan kasbon atau pinjaman dana kepada perusahaan. Proses persetujuan bertingkat oleh manajemen."}
                                </p>
                            </div>

                            {editingId && (
                                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-[12px] px-4 py-2.5">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    <span className="text-[12px] font-semibold text-amber-700">Mode Edit &ndash; Pengajuan #{editingId}</span>
                                    <button type="button" onClick={resetForm} className="ml-auto text-[11px] font-bold text-amber-600 underline cursor-pointer">Batal</button>
                                </div>
                            )}

                            <Section color="bg-violet-500" title="Jenis Pengajuan">
                                <div className="flex gap-2">
                                    {[
                                        { val: "kasbon",   label: "Kasbon",   desc: "Dana cepat / darurat", active: { border: "border-violet-400 bg-violet-50", ring: "border-violet-500", dot: "bg-violet-500", text: "text-violet-800" } },
                                        { val: "pinjaman", label: "Pinjaman", desc: "Bayar cicil / lunas",   active: { border: "border-indigo-400 bg-indigo-50",  ring: "border-indigo-500",  dot: "bg-indigo-500",  text: "text-indigo-800" } },
                                    ].map(({ val, label, desc, active }) => (
                                        <label key={val}
                                            className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] border cursor-pointer transition ${type === val ? active.border : "border-slate-200 bg-slate-50 hover:bg-slate-100"}`}
                                            onClick={() => setType(val)}>
                                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 grid place-items-center transition ${type === val ? active.ring : "border-slate-300"}`}>
                                                {type === val && <div className={`w-2 h-2 rounded-full ${active.dot}`} />}
                                            </div>
                                            <div>
                                                <div className={`text-[12.5px] font-bold leading-tight ${type === val ? active.text : "text-slate-700"}`}>{label}</div>
                                                <div className="text-[10px] text-slate-400 leading-tight">{desc}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                {type === "pinjaman" && (
                                    <div className="bg-indigo-50 border border-indigo-200 rounded-[10px] px-3 py-2 text-[11.5px] text-indigo-700 leading-relaxed">
                                        <span className="font-bold">Pinjaman</span> &mdash; pembayaran dapat dilakukan secara cicilan atau lunas.
                                    </div>
                                )}
                            </Section>

                            <Section color="bg-blue-500" title="Informasi Pengajuan">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[12px] font-semibold text-slate-600">Nama Pemohon</label>
                                    <div className={inputCls + " bg-slate-100 text-slate-500 cursor-not-allowed select-none"}>{employeeName || "–"}</div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[12px] font-semibold text-slate-600">Tanggal Pengajuan <span className="text-red-500">*</span></label>
                                    <input className={inputCls} type="date" value={submissionDate} onChange={e => setSubmissionDate(e.target.value)} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[12px] font-semibold text-slate-600">Keperluan / Tujuan <span className="text-red-500">*</span></label>
                                    <textarea className={inputCls + " resize-none min-h-[80px]"} placeholder="Jelaskan keperluan atau tujuan pengajuan secara singkat…" rows={3} value={purpose} onChange={e => setPurpose(e.target.value)} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[12px] font-semibold text-slate-600">Jumlah Yang Diajukan (Rp) <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-500 font-semibold select-none">Rp</span>
                                        <input className={inputCls + " pl-9"} type="number" min="1" step="1" placeholder="0" value={amountStr} onChange={e => setAmountStr(e.target.value)} />
                                    </div>
                                    {amountStr && Number(amountStr) > 0 && (
                                        <div className="text-[11px] text-slate-500 font-semibold px-1">{fmtRupiah(amountStr)}</div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[12px] font-semibold text-slate-600">Status</label>
                                    <div className="flex">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[12px] font-bold text-blue-700">
                                            <span className="w-2 h-2 rounded-full bg-blue-500" />Pengajuan
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-slate-400">Status diperbarui secara otomatis oleh manajemen.</span>
                                </div>
                            </Section>

                            <Section color="bg-slate-400" title="Catatan Tambahan">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[12px] font-semibold text-slate-600">Catatan <span className="text-slate-400 font-normal">(opsional)</span></label>
                                    <textarea className={inputCls + " resize-none min-h-[70px]"} placeholder="Catatan tambahan jika ada…" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
                                </div>
                            </Section>

                            <Section color="bg-rose-500" title="Foto Bukti">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[12px] font-semibold text-slate-600">Foto Pendukung <span className="text-slate-400 font-normal">(opsional)</span></label>
                                    <input type="file" ref={galleryRef} accept="image/*" className="hidden" onChange={handleFileChange} />
                                    {proofDocPreview && (
                                        <div className="relative rounded-xl overflow-hidden border border-slate-200 mb-2">
                                            <img src={proofDocPreview} alt="Foto Bukti" className="w-full max-h-48 object-contain bg-slate-100" />
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
                                                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" />
                                            </svg>
                                            {proofDocPreview ? "Ambil Ulang" : "Ambil Foto"}
                                        </button>
                                        <button type="button" onClick={() => galleryRef.current?.click()}
                                            className="flex-1 py-3 rounded-[12px] border-2 border-dashed border-slate-300 text-slate-500 text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:border-violet-400 hover:text-violet-500 hover:bg-violet-50/50 transition cursor-pointer">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                                            </svg>
                                            {proofDocPreview ? "Ganti dari Galeri" : "Dari Galeri"}
                                        </button>
                                    </div>
                                </div>
                            </Section>

                            {submitError && (
                                <div className="bg-red-50 border border-red-200 rounded-[12px] px-4 py-3 text-[12.5px] text-red-600 font-medium">{submitError}</div>
                            )}

                            <button type="submit" disabled={submitting}
                                className="w-full py-[14px] rounded-[16px] text-[14px] font-bold text-white flex items-center justify-center gap-2 transition hover:opacity-90 active:scale-[.98] disabled:opacity-60 shadow-[0_4px_14px_rgba(59,130,246,.3)] border-none cursor-pointer"
                                style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)" }}>
                                {submitting ? (
                                    <>
                                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                                            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity=".3" /><path d="M21 12a9 9 0 00-9-9" />
                                        </svg>
                                        {editingId ? "Memperbarui…" : "Mengirim…"}
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
                                        </svg>
                                        {editingId ? "Update Pengajuan" : "Kirim Pengajuan"}
                                    </>
                                )}
                            </button>
                        </form>
                    </main>
                )}

                {activeTab === "history" && (
                    <main className="flex-1 px-[13px] py-[14px] pb-10 flex flex-col gap-3 overflow-y-auto">
                        <div className="bg-white rounded-[16px] border border-slate-200 p-3 shadow-[0_1px_4px_rgba(0,0,0,.04)]">
                            <div className="text-[12px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                                </svg>
                                Filter Riwayat
                            </div>
                            <div className="mb-2">
                                <label className="text-[10px] font-semibold text-slate-400 mb-1 block">Jenis</label>
                                <div className="flex gap-1.5 mb-2">
                                    {[
                                        { val: "",         label: "Semua",   active: "bg-slate-800 text-white" },
                                        { val: "kasbon",   label: "Kasbon",  active: "bg-violet-600 text-white" },
                                        { val: "pinjaman", label: "Pinjaman",active: "bg-indigo-600 text-white" },
                                    ].map(({ val, label, active }) => (
                                        <button key={val} type="button"
                                            onClick={() => setTypeFilter(val)}
                                            className={`flex-1 h-[32px] rounded-[8px] text-[11.5px] font-bold transition cursor-pointer border ${
                                                typeFilter === val
                                                    ? active + " border-transparent"
                                                    : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                                            }`}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="mb-2">
                                <label className="text-[10px] font-semibold text-slate-400 mb-0.5 block">Cari</label>
                                <div className="relative">
                                    <input className={inputCls + " pr-9"} type="text" placeholder="Keperluan, catatan, jenis…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                                    <svg className="absolute right-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-[10px] font-semibold text-slate-400 mb-0.5 block">Dari</label>
                                    <input className={inputCls} type="date" value={historyStart} onChange={e => setHistoryStart(e.target.value)} />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-semibold text-slate-400 mb-0.5 block">Sampai</label>
                                    <input className={inputCls} type="date" value={historyEnd} onChange={e => setHistoryEnd(e.target.value)} />
                                </div>
                            </div>
                            <button onClick={fetchHistory} className="mt-2 w-full h-[36px] rounded-[10px] bg-slate-900 text-white text-[11.5px] font-bold cursor-pointer hover:bg-slate-800 transition">
                                Terapkan Filter
                            </button>
                        </div>

                        {historyLoading ? (
                            <div className="py-10 text-center text-[12.5px] text-slate-400 font-medium">Memuat riwayat…</div>
                        ) : (() => {
                            const q = searchQuery.trim().toLowerCase();
                            const filtered = submissions.filter(s => {
                                if (typeFilter && s.type !== typeFilter) return false;
                                if (!q) return true;
                                return (
                                    (s.purpose || "").toLowerCase().includes(q) ||
                                    (s.notes || "").toLowerCase().includes(q) ||
                                    (s.type || "").toLowerCase().includes(q) ||
                                    (s.status || "").toLowerCase().includes(q)
                                );
                            });
                            if (filtered.length === 0) return (
                                <div className="py-10 text-center">
                                    <div className="w-14 h-14 rounded-full bg-slate-100 grid place-items-center mx-auto mb-3">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" />
                                        </svg>
                                    </div>
                                    <div className="text-[13px] font-bold text-slate-700 mb-1">{q ? "Tidak Ditemukan" : "Belum Ada Pengajuan"}</div>
                                    <div className="text-[11.5px] text-slate-400">{q ? "Tidak ada pengajuan yang cocok dengan pencarian." : "Pengajuan kasbon atau pinjaman akan tampil di sini."}</div>
                                </div>
                            );
                            return (
                                <div className="flex flex-col gap-3">
                                    {filtered.map(s => (
                                        <KasbonCard key={s.id} submission={s} onEdit={() => startEdit(s)} onDelete={() => setDeleteConfirmId(s.id)}
                                            expandedPayments={expandedPayments[s.id]} loadingPayments={!!loadingPayments[s.id]} onTogglePayments={() => togglePayments(s.id)} />
                                    ))}
                                </div>
                            );
                        })()}
                    </main>
                )}

                {showCamera && <CameraModal onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}

                {success && (
                    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[4px] grid place-items-center px-6" onClick={resetForm}>
                        <div className="bg-white rounded-[24px] p-8 text-center max-w-[300px] w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="text-[48px] mb-3">✅</div>
                            <div className="text-[16px] font-bold text-slate-900 mb-1.5">{editingId ? "Pengajuan Diperbarui!" : "Pengajuan Terkirim!"}</div>
                            <div className="text-[12.5px] text-slate-500 leading-relaxed mb-5">
                                {editingId ? "Perubahan berhasil disimpan." : `Pengajuan ${type === "kasbon" ? "kasbon" : "pinjaman"} Anda berhasil dikirim dan menunggu persetujuan manajemen.`}
                            </div>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => { resetForm(); setActiveTab("history"); }} className="w-full py-2.5 rounded-[12px] bg-blue-600 text-white text-[13px] font-bold cursor-pointer hover:bg-blue-700 transition">Lihat Riwayat</button>
                                <button onClick={resetForm} className="w-full py-2.5 rounded-[12px] border border-slate-200 text-slate-600 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition">{editingId ? "Tutup" : "Buat Pengajuan Baru"}</button>
                            </div>
                        </div>
                    </div>
                )}

                {deleteConfirmId && (
                    <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-[4px] grid place-items-center px-6">
                        <div className="bg-white rounded-[24px] p-7 text-center max-w-[300px] w-full shadow-2xl">
                            <div className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-200 grid place-items-center mx-auto mb-4">
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3,6 5,6 21,6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                                    <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                                </svg>
                            </div>
                            <div className="text-[15px] font-bold text-slate-900 mb-2">Batalkan Pengajuan?</div>
                            <p className="text-[12.5px] text-slate-500 leading-relaxed mb-5">Pengajuan ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.</p>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => handleDelete(deleteConfirmId)} className="w-full py-2.5 rounded-[12px] bg-red-500 text-white text-[13px] font-bold cursor-pointer hover:bg-red-600 transition">Ya, Hapus</button>
                                <button onClick={() => setDeleteConfirmId(null)} className="w-full py-2.5 rounded-[12px] border border-slate-200 text-slate-600 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition">Batal</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Section({ color, title, children }) {
    return (
        <div className="bg-white rounded-[20px] border border-slate-200 px-4 py-[18px] shadow-[0_1px_4px_rgba(0,0,0,.04)]">
            <div className="flex items-center gap-2 text-[13px] font-bold text-slate-900 mb-[14px] pb-2.5 border-b border-slate-100">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />{title}
            </div>
            <div className="flex flex-col gap-[14px]">{children}</div>
        </div>
    );
}

function KasbonCard({ submission, onEdit, onDelete, expandedPayments, loadingPayments, onTogglePayments }) {
    const statusCfg = STATUS_CFG[submission.status] || STATUS_CFG.pengajuan;
    const isEditable = submission.status === "pengajuan";
    const isPinjaman = submission.type === "pinjaman";
    const isApproved = submission.status === "disetujui";
    const assetBase  = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");
    const totalPaid  = Number(submission.total_paid) || 0;
    const amtApproved = Number(submission.amount_approved) || 0;
    const sisa = amtApproved > 0 ? amtApproved - totalPaid : 0;

    const cardBorder = isPinjaman ? "border-indigo-200" : "border-violet-200";

    return (
        <div className={`bg-white rounded-[20px] border shadow-[0_1px_4px_rgba(0,0,0,.04)] overflow-hidden ${cardBorder}`}>
            <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium mb-0.5">{fmtDate(submission.submission_date)}</div>
                    <div className="text-[13.5px] font-bold text-slate-900 truncate">{submission.employee_name}</div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>{statusCfg.label}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isPinjaman ? "bg-indigo-50 text-indigo-600 border border-indigo-200" : "bg-violet-50 text-violet-600 border border-violet-200"}`}>{isPinjaman ? "Pinjaman" : "Kasbon"}</span>
                </div>
            </div>

            <div className="px-4 pb-3">
                <div className="bg-slate-50 rounded-[12px] p-3 border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Jumlah Diajukan</div>
                    <div className="text-[18px] font-bold text-slate-900">{fmtRupiah(submission.amount_requested)}</div>
                    {isApproved && amtApproved > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                            <div className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide mb-0.5">Jumlah Disetujui</div>
                            <div className="text-[15px] font-bold text-emerald-700">{fmtRupiah(amtApproved)}</div>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-4 pb-3">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">Keperluan</div>
                <div className="text-[12.5px] text-slate-700 leading-relaxed">{submission.purpose}</div>
                {submission.notes && <div className="mt-1.5 text-[11.5px] text-slate-500 italic">&ldquo;{submission.notes}&rdquo;</div>}
            </div>

            {submission.status === "proses" && submission.process_note && (
                <div className="mx-4 mb-3 px-3 py-2 rounded-[10px] bg-amber-50 border border-amber-100">
                    <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-0.5">Catatan Proses</div>
                    <div className="text-[11.5px] text-amber-800 leading-relaxed">{submission.process_note}</div>
                    {submission.process_by_name && <div className="text-[10px] text-amber-500 mt-0.5">oleh {submission.process_by_name} &middot; {fmtDateTime(submission.process_at)}</div>}
                </div>
            )}
            {submission.status === "disetujui" && submission.approved_note && (
                <div className="mx-4 mb-3 px-3 py-2 rounded-[10px] bg-emerald-50 border border-emerald-100">
                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-0.5">Catatan Persetujuan</div>
                    <div className="text-[11.5px] text-emerald-800 leading-relaxed">{submission.approved_note}</div>
                    {submission.approved_by_name && <div className="text-[10px] text-emerald-500 mt-0.5">oleh {submission.approved_by_name} &middot; {fmtDateTime(submission.approved_at)}</div>}
                </div>
            )}
            {submission.status === "ditolak" && submission.rejection_note && (
                <div className="mx-4 mb-3 px-3 py-2 rounded-[10px] bg-red-50 border border-red-100">
                    <div className="text-[10px] font-bold text-red-500 uppercase tracking-wide mb-0.5">Alasan Penolakan</div>
                    <div className="text-[11.5px] text-red-700 leading-relaxed">{submission.rejection_note}</div>
                </div>
            )}

            {isPinjaman && isApproved && amtApproved > 0 && (
                <div className="mx-4 mb-3">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-[12px] p-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[11px] font-bold text-indigo-700">Pembayaran Pinjaman</div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sisa <= 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{sisa <= 0 ? "LUNAS" : `Sisa ${fmtRupiah(sisa)}`}</span>
                        </div>
                        <div className="flex gap-4 mb-2">
                            <div>
                                <div className="text-[10px] text-slate-400">Sudah Dibayar</div>
                                <div className="text-[12px] font-bold text-slate-700">{fmtRupiah(totalPaid)}</div>
                            </div>
                            <div className="w-px bg-indigo-200" />
                            <div>
                                <div className="text-[10px] text-slate-400">Jumlah Cicilan</div>
                                <div className="text-[12px] font-bold text-slate-700">{Number(submission.payment_count) || 0}x</div>
                            </div>
                        </div>
                        <button onClick={onTogglePayments} className="w-full text-[11.5px] font-bold text-indigo-600 flex items-center justify-center gap-1.5 cursor-pointer py-1 hover:text-indigo-800 transition">
                            {loadingPayments ? (<><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity=".2" /><path d="M21 12a9 9 0 00-9-9" /></svg>Memuat…</>)
                                : expandedPayments !== undefined ? <>&#9650; Sembunyikan Detail</> : <>&#9660; Lihat Detail Pembayaran</>}
                        </button>
                        {expandedPayments !== undefined && (
                            <div className="mt-2 flex flex-col gap-1.5">
                                {expandedPayments.length === 0 ? (
                                    <div className="text-[11.5px] text-slate-400 text-center py-2">Belum ada pembayaran tercatat.</div>
                                ) : expandedPayments.map(p => (
                                    <div key={p.id} className="flex items-start justify-between bg-white rounded-[8px] px-3 py-2 border border-indigo-100">
                                        <div className="min-w-0">
                                            <div className="text-[11.5px] font-bold text-slate-800">{fmtRupiah(p.amount)}</div>
                                            <div className="text-[10px] text-slate-400">{fmtDate(p.payment_date)} &middot; {(p.payment_method || "").replace("_", " ")}</div>
                                            {p.recorded_by_name && <div className="text-[10px] text-slate-400">oleh {p.recorded_by_name}</div>}
                                        </div>
                                        {p.notes && <div className="text-[10.5px] text-slate-500 text-right max-w-[110px] truncate ml-2 flex-shrink-0">{p.notes}</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {submission.proof_path && (
                <div className="mx-4 mb-3">
                    <img src={`${assetBase}${submission.proof_path}`} alt="Foto Bukti" className="w-full max-h-32 object-cover rounded-[10px] border border-slate-200" />
                </div>
            )}

            <div className="px-4 pb-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <span className="text-[10.5px] text-slate-400">{fmtDateTime(submission.created_at)}</span>
                <div className="flex gap-2 items-center">
                    {isEditable ? (
                        <>
                            <button onClick={onEdit} className="h-[32px] px-3 rounded-[10px] bg-slate-50 border border-slate-200 text-slate-700 text-[11.5px] font-bold flex items-center gap-1.5 hover:bg-slate-100 transition cursor-pointer">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>Edit
                            </button>
                            <button onClick={onDelete} className="h-[32px] px-3 rounded-[10px] bg-red-50 border border-red-200 text-red-600 text-[11.5px] font-bold flex items-center gap-1.5 hover:bg-red-100 transition cursor-pointer">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3,6 5,6 21,6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                                </svg>Hapus
                            </button>
                        </>
                    ) : (
                        <span className="text-[10.5px] text-slate-400 italic">Tidak dapat diubah</span>
                    )}
                </div>
            </div>
        </div>
    );
}

function LiveTimestamp() {
    const [ts, setTs] = useState("");
    useEffect(() => {
        const fmt = () => {
            const n = new Date();
            const pad = (v) => String(v).padStart(2, "0");
            setTs(`${pad(n.getDate())}/${pad(n.getMonth() + 1)}/${n.getFullYear()} ${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`);
        };
        fmt();
        const id = setInterval(fmt, 1000);
        return () => clearInterval(id);
    }, []);
    return (
        <div className="absolute bottom-20 right-3 px-2.5 py-1 rounded-[6px] bg-black/55 text-white text-[12px] font-mono font-bold pointer-events-none select-none">{ts}</div>
    );
}

function CameraModal({ onCapture, onClose }) {
    const videoRef  = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [ready, setReady]           = useState(false);
    const [camError, setCamError]     = useState(null);
    const [facingMode, setFacingMode] = useState("environment");

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
                    videoRef.current.play().then(() => { if (!cancelled) { setReady(true); setCamError(null); } });
                }
            })
            .catch(err => { if (!cancelled) { setReady(false); setCamError("Tidak dapat mengakses kamera: " + err.message); } });
        return () => { cancelled = true; streamRef.current?.getTracks().forEach(t => t.stop()); };
    }, [facingMode]);

    const flipCamera = () => { setReady(false); setCamError(null); setFacingMode(p => p === "environment" ? "user" : "environment"); };

    const capture = () => {
        const video = videoRef.current; const canvas = canvasRef.current;
        if (!video || !canvas) return;
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (facingMode === "user") { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
        ctx.drawImage(video, 0, 0);
        if (facingMode === "user") ctx.setTransform(1, 0, 0, 1, 0, 0);
        const n = new Date(); const pad = (v) => String(v).padStart(2, "0");
        const label = `${pad(n.getDate())}/${pad(n.getMonth() + 1)}/${n.getFullYear()} ${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
        const fontSize = Math.max(14, Math.floor(canvas.width / 28));
        ctx.font = `bold ${fontSize}px monospace`;
        const tw = ctx.measureText(label).width; const pd = 10;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(canvas.width - tw - pd * 2 - 6, canvas.height - fontSize - pd * 2 - 6, tw + pd * 2, fontSize + pd);
        ctx.fillStyle = "#ffffff"; ctx.fillText(label, canvas.width - tw - pd - 6, canvas.height - pd - 6);
        canvas.toBlob(blob => {
            if (!blob) return;
            onCapture(new File([blob], `kasbon_${Date.now()}.jpg`, { type: "image/jpeg" }));
        }, "image/jpeg", 0.9);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/75 flex items-center justify-center p-4">
            <div className="w-full max-w-[360px] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
                    <span className="text-white text-[14px] font-bold">Ambil Foto Bukti</span>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 text-white/70 grid place-items-center hover:bg-white/20 hover:text-white transition cursor-pointer">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="2" y1="2" x2="10" y2="10" /><line x1="10" y1="2" x2="2" y2="10" />
                        </svg>
                    </button>
                </div>
                <div className="relative w-full" style={{ aspectRatio: "4/3", background: "#111" }}>
                    {camError ? (
                        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                            <div>
                                <div className="text-red-400 text-[13px] font-semibold mb-1">Kamera Tidak Tersedia</div>
                                <div className="text-white/50 text-[11px] leading-relaxed">{camError}</div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" style={facingMode === "user" ? { transform: "scaleX(-1)" } : undefined} playsInline muted />
                            {ready && <LiveTimestamp />}
                            <canvas ref={canvasRef} className="hidden" />
                        </>
                    )}
                </div>
                <div className="flex-shrink-0 flex justify-between items-center px-8 py-5">
                    <button onClick={onClose} className="w-11 h-11 rounded-full bg-white/10 text-white/60 grid place-items-center hover:bg-white/20 transition cursor-pointer">
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="12,4 6,10 12,16" />
                        </svg>
                    </button>
                    <button onClick={capture} disabled={!ready || !!camError}
                        className="w-[68px] h-[68px] rounded-full border-4 border-white grid place-items-center shadow-lg transition hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer">
                        <div className="w-[52px] h-[52px] rounded-full bg-white" />
                    </button>
                    <button onClick={flipCamera} disabled={!!camError} className="w-11 h-11 rounded-full bg-white/10 text-white/70 grid place-items-center hover:bg-white/20 hover:text-white transition cursor-pointer disabled:opacity-30">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 4v6h6" /><path d="M23 20v-6h-6" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}