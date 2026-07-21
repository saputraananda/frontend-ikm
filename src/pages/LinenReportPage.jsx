import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import useAuthStore from '../store/authStore';

const FINDING_TYPES = [
  'Rewash', 'Robek', 'Bolong', 'Jahitan lepas', 'Tali lepas',
  'Kancing hilang', 'Resleting rusak',
  'Noda membandel (Sudah dispotting ttp tidak hilang)',
  'Darah / cairan tubuh', 'Luntur warna', 'Tipis / aus', 'Lainnya',
];

const ASSET_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtDate = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtDateTime = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

/* Cutoff: 26 bulan sebelumnya – 25 bulan berikutnya */
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

const STATUS_META = {
  terkirim: { label: 'Terkirim', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', accent: '#3B82F6' },
  proses:   { label: 'Proses',   color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', accent: '#F59E0B' },
  selesai:  { label: 'Selesai',  color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', accent: '#10B981' },
};

export default function LinenReportPage() {
  const navigate = useNavigate();
  const galleryRef = useRef(null);
  const statusFileRef = useRef(null);
  const authUser = useAuthStore(s => s.user);
  const myEmployeeId = authUser?.employee_id;

  /* ── Tabs ── */
  const [activeTab, setActiveTab] = useState('form'); /* 'form' | 'history' */

  /* ── Master data ── */
  const [areas, setAreas] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [leaders, setLeaders] = useState([]); /* leaders/deputies for reporter filter */
  const [employees, setEmployees] = useState([]);

  /* ── Form fields ── */
  const [reporterName, setReporterName] = useState(authUser?.full_name || authUser?.name || '');
  const [empSearchFocused, setEmpSearchFocused] = useState(false);
  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const [reportDate, setReportDate] = useState(todayStr());
  const [areaId, setAreaId] = useState('');
  const [hospitalId, setHospitalId] = useState('');

  /* Sync reporterName when authUser is loaded */
  useEffect(() => {
    if (authUser && !reporterName) {
      setReporterName(authUser.full_name || authUser.name || '');
    }
  }, [authUser, reporterName]);
  const [findingLocation, setFindingLocation] = useState('');
  const [ownershipType, setOwnershipType] = useState(''); // 'hospital' | 'rental'
  const [linenType, setLinenType] = useState('');
  const [findingType, setFindingType] = useState('');
  const [findingOther, setFindingOther] = useState('');
  const [findingQty, setFindingQty] = useState(1);
  const [sendingNote, setSendingNote] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [existingAttachmentPath, setExistingAttachmentPath] = useState(null); /* for edit mode */
  const [removeExistingAttachment, setRemoveExistingAttachment] = useState(false);

  /* ── Edit mode ── */
  const [editingId, setEditingId] = useState(null);

  /* ── UI state ── */
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  /* ── History state ── */
  const [reports, setReports] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const defaultRange = getCutoffRange();
  const [historyStart, setHistoryStart] = useState(defaultRange.start);
  const [historyEnd, setHistoryEnd] = useState(defaultRange.end);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reporterFilter, setReporterFilter] = useState(''); /* '' = semua | 'mine' | employee_id string */
  const [statusNote, setStatusNote] = useState('');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusTargetId, setStatusTargetId] = useState(null);
  const [statusTargetNext, setStatusTargetNext] = useState(''); /* 'proses' | 'selesai' */
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [statusFile, setStatusFile] = useState(null);
  const [statusFilePreview, setStatusFilePreview] = useState(null);

  /* ── Photo preview modal ── */
  const [photoModal, setPhotoModal] = useState(null); // { url, title }

  /* ── Init ── */
  useEffect(() => {
    document.title = 'Pemeriksaan Linen | IKM Mobile';
    Promise.all([
      api.get('/linen-report/areas'),
      api.get('/linen-report/hospitals'),
      api.get('/linen-report/check-today'),
      api.get('/linen-report/leaders'),
      api.get('/linen-report/employees'),
    ]).then(([areasRes, hospitalsRes, checkRes, leadersRes, empRes]) => {
      setAreas(areasRes.data?.data || []);
      setHospitals(hospitalsRes.data?.data || []);
      setLeaders(leadersRes.data?.data || []);
      setEmployees(empRes.data?.data || []);
      if (checkRes.data?.data?.submitted) setShowDuplicateModal(true);
    }).catch(() => {});
  }, []);

  /* ── Fetch history when tab switches or filter changes ── */
  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, historyStart, historyEnd, reporterFilter]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const params = {};
      if (historyStart) params.startDate = historyStart;
      if (historyEnd) params.endDate = historyEnd;

      let endpoint;
      if (reporterFilter === 'mine') {
        endpoint = '/linen-report/my-reports';
      } else {
        endpoint = '/linen-report/all-reports';
        if (reporterFilter) params.reportedBy = reporterFilter; /* specific leader */
      }

      const res = await api.get(endpoint, { params });
      setReports(res.data?.data || []);
    } catch (err) {
      console.error('fetchHistory', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachmentFile(file);
    if (attachmentPreview && !existingAttachmentPath) URL.revokeObjectURL(attachmentPreview);
    setAttachmentPreview(URL.createObjectURL(file));
    setRemoveExistingAttachment(false);
    e.target.value = '';
  };

  const removeFile = () => {
    setAttachmentFile(null);
    if (attachmentPreview && !existingAttachmentPath) URL.revokeObjectURL(attachmentPreview);
    setAttachmentPreview(null);
    setRemoveExistingAttachment(true);
    if (galleryRef.current) galleryRef.current.value = '';
  };

  const handleCameraCapture = (file) => {
    setAttachmentFile(file);
    if (attachmentPreview && !existingAttachmentPath) URL.revokeObjectURL(attachmentPreview);
    setAttachmentPreview(URL.createObjectURL(file));
    setShowCamera(false);
    setRemoveExistingAttachment(false);
  };

  const resetForm = () => {
    setReporterName(authUser?.full_name || authUser?.name || '');
    setReportDate(todayStr());
    setAreaId('');
    setHospitalId('');
    setFindingLocation('');
    setOwnershipType('');
    setLinenType('');
    setFindingType('');
    setFindingOther('');
    setFindingQty(1);
    setSendingNote('');
    setAttachmentFile(null);
    setAttachmentPreview(null);
    setExistingAttachmentPath(null);
    setRemoveExistingAttachment(false);
    setEditingId(null);
    setSubmitError(null);
    setSuccess(false);
    if (galleryRef.current) galleryRef.current.value = '';
  };

  const populateForm = (report) => {
    setReporterName(report.reporter_name || '');
    setReportDate(report.report_date || todayStr());
    setAreaId(String(report.area_id || ''));
    setHospitalId(String(report.hospital_id || ''));
    setFindingLocation(report.finding_location || '');
    setOwnershipType(report.ownership_type || '');
    setLinenType(report.linen_type || '');
    const isOther = !FINDING_TYPES.includes(report.finding_type);
    if (isOther) {
      setFindingType('Lainnya');
      setFindingOther(report.finding_type || '');
    } else {
      setFindingType(report.finding_type || '');
      setFindingOther('');
    }
    setFindingQty(report.finding_qty || 1);
    setSendingNote(report.sending_note || '');
    setExistingAttachmentPath(report.attachment_path || null);
    setRemoveExistingAttachment(false);
    setAttachmentFile(null);
    setAttachmentPreview(report.attachment_path ? `${ASSET_BASE}${report.attachment_path}` : null);
  };

  const startEdit = (report) => {
    setEditingId(report.id);
    populateForm(report);
    setActiveTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const resolvedFinding = findingType === 'Lainnya' ? findingOther.trim() : findingType;

    if (!reporterName.trim()) return setSubmitError('Nama penemu wajib diisi (Pilih dari daftar karyawan).');
    if (!reportDate) return setSubmitError('Tanggal temuan wajib diisi.');
    if (!findingLocation) return setSubmitError('Lokasi penemuan wajib dipilih.');
    if (!areaId) return setSubmitError('Divisi wajib dipilih.');
    if (!hospitalId) return setSubmitError('Rumah sakit wajib dipilih.');
    if (!ownershipType) return setSubmitError('Kepemilikan linen wajib dipilih.');
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
      fd.append('ownership_type', ownershipType);
      fd.append('linen_type', linenType.trim());
      fd.append('finding_type', resolvedFinding);
      fd.append('finding_qty', String(findingQty));
      fd.append('sending_note', sendingNote.trim());
      if (attachmentFile) fd.append('attachment', attachmentFile);

      if (editingId) {
        await api.put(`/linen-report/${editingId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setSuccess(true);
      } else {
        await api.post('/linen-report', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setSuccess(true);
      }
    } catch (err) {
      setSubmitError(err?.response?.data?.message || 'Gagal mengirim laporan, coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/linen-report/${id}`);
      setDeleteConfirmId(null);
      fetchHistory();
    } catch (err) {
      console.error('deleteReport', err);
    }
  };

  const openStatusModal = (id, nextStatus) => {
    setStatusTargetId(id);
    setStatusTargetNext(nextStatus);
    setStatusNote('');
    setStatusFile(null);
    setStatusFilePreview(null);
    setStatusModalOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!statusTargetId || !statusTargetNext) return;
    setStatusSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('status', statusTargetNext);
      if (statusNote.trim()) fd.append('note', statusNote.trim());
      if (statusFile) fd.append('attachment', statusFile);
      await api.patch(`/linen-report/${statusTargetId}/status`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStatusModalOpen(false);
      setStatusFile(null);
      setStatusFilePreview(null);
      fetchHistory();
    } catch (err) {
      console.error('updateStatus', err);
    } finally {
      setStatusSubmitting(false);
    }
  };

  /* ── Shared styles ── */
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
        <header className="bg-[#0B1739] h-14 flex items-center gap-3 px-4 border-b border-white/[.06] flex-shrink-0">
          <button
            className="w-[34px] h-[34px] rounded-[8px] border border-white/10 bg-white/[.07] text-white/70 grid place-items-center cursor-pointer flex-shrink-0 transition hover:bg-white/[.15] hover:text-white"
            onClick={() => navigate(-1)} aria-label="Kembali">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="12,4 6,10 12,16"/>
            </svg>
          </button>
          <div className="min-w-0">
            <div className="text-[9.5px] font-semibold tracking-[.14em] uppercase text-[#93C5FD] opacity-65">Sistem Absensi</div>
            <div className="text-[14px] font-bold text-white tracking-[-0.01em] truncate">Pemeriksaan Linen PT IKM</div>
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
                style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)' }}>
                <div className="absolute -top-8 -right-8 w-[110px] h-[110px] rounded-full bg-white/[.07] pointer-events-none"/>
                <div className="text-[16px] font-bold mb-0.5">{editingId ? 'Edit Laporan' : 'Form Temuan Linen'}</div>
                <p className="text-[11.5px] opacity-70 leading-relaxed">
                  {editingId ? 'Perbarui data laporan temuan linen.' : 'Catat setiap temuan linen bermasalah secara detail agar dapat segera ditindaklanjuti.'}
                </p>
              </div>

              {/* Edit badge */}
              {editingId && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-[12px] px-4 py-2.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  <span className="text-[12px] font-semibold text-amber-700">Mode Edit – Laporan #{editingId}</span>
                  <button type="button" onClick={resetForm}
                    className="ml-auto text-[11px] font-bold text-amber-600 underline cursor-pointer">Batal</button>
                </div>
              )}

              {/* Section 1 – Identitas */}
              <Section color="bg-blue-500" title="Identitas Pelapor">
                <Field label="Nama Penemu Temuan (Karyawan IKM)" required>
                  <div className="relative">
                    <input
                      className={inputCls + ' pr-8'}
                      type="text"
                      placeholder="Cari & pilih nama karyawan..."
                      value={empSearchFocused ? empSearchQuery : reporterName}
                      onFocus={() => {
                        setEmpSearchFocused(true);
                        setEmpSearchQuery(reporterName);
                      }}
                      onBlur={() => {
                        setTimeout(() => setEmpSearchFocused(false), 200);
                      }}
                      onChange={e => {
                        setEmpSearchQuery(e.target.value);
                        setReporterName(''); // clear when typing to force re-selection
                      }}
                    />
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1l4 4 4-4" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>

                    {empSearchFocused && (
                      <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,.08)] z-50">
                        {(() => {
                          const q = empSearchQuery.trim().toLowerCase();
                          const filtered = employees.filter(emp => {
                            if (q === (reporterName || '').trim().toLowerCase()) return true;
                            return emp.full_name.toLowerCase().includes(q);
                          });

                          if (filtered.length > 0) {
                            return filtered.map(emp => (
                              <div
                                key={emp.employee_id}
                                className="px-3 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition"
                                onMouseDown={(e) => {
                                  e.preventDefault(); // prevent blur before click
                                  setReporterName(emp.full_name);
                                  setEmpSearchFocused(false);
                                }}
                              >
                                {emp.full_name}
                              </div>
                            ));
                          }
                          return (
                            <div className="px-3 py-3 text-[12.5px] text-slate-400 text-center">
                              Karyawan tidak ditemukan
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
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
                          findingLocation === loc ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        }`}
                        onClick={() => setFindingLocation(loc)}>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 grid place-items-center transition ${
                          findingLocation === loc ? 'border-emerald-500' : 'border-slate-300'
                        }`}>
                          {findingLocation === loc && <div className="w-2 h-2 rounded-full bg-emerald-500"/>}
                        </div>
                        <span className={`text-[12.5px] font-medium ${findingLocation === loc ? 'text-emerald-800' : 'text-slate-700'}`}>{loc}</span>
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
                <Field label="Kepemilikan Linen" required>
                  <div className="flex gap-2">
                    {[{ value: 'rental', label: 'Linen Sewa' }, { value: 'hospital', label: 'Linen Rumah Sakit' }].map(opt => (
                      <label key={opt.value}
                        className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] border cursor-pointer transition ${
                          ownershipType === opt.value ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        }`}
                        onClick={() => setOwnershipType(opt.value)}>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 grid place-items-center transition ${
                          ownershipType === opt.value ? 'border-emerald-500' : 'border-slate-300'
                        }`}>
                          {ownershipType === opt.value && <div className="w-2 h-2 rounded-full bg-emerald-500"/>}
                        </div>
                        <span className={`text-[12.5px] font-medium ${ownershipType === opt.value ? 'text-emerald-800' : 'text-slate-700'}`}>{opt.label}</span>
                      </label>
                    ))}
                  </div>
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
                          findingType === ft ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        }`}
                        onClick={() => setFindingType(ft)}>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 grid place-items-center transition ${
                          findingType === ft ? 'border-amber-500' : 'border-slate-300'
                        }`}>
                          {findingType === ft && <div className="w-2 h-2 rounded-full bg-amber-500"/>}
                        </div>
                        <span className={`text-[12.5px] font-medium ${findingType === ft ? 'text-amber-800' : 'text-slate-700'}`}>{ft}</span>
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

              {/* Section 5 – Catatan Terkirim */}
              <Section color="bg-sky-500" title="Catatan">
                <Field label="Catatan / Keterangan Tambahan">
                  <textarea className={inputCls + ' resize-none'} rows={3}
                    placeholder="Contoh: Linen terdeteksi saat proses sorting…"
                    value={sendingNote} onChange={e => setSendingNote(e.target.value)} />
                </Field>
              </Section>

              {/* Section 6 – Lampiran */}
              <Section color="bg-rose-500" title="Bukti Lampiran">
                <Field label="Foto Bukti (harap lampirkan foto yang jelas untuk memperlihatkan letak kerusakan)">
                  <input type="file" ref={galleryRef} accept="image/*" className="hidden"
                    onChange={handleFileChange} />
                  {attachmentPreview && !removeExistingAttachment ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 mb-2">
                      <img src={attachmentPreview} alt="Lampiran"
                        className="w-full max-h-48 object-contain bg-slate-100" />
                      <button type="button" onClick={removeFile}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white grid place-items-center cursor-pointer hover:bg-black/70 transition">
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/>
                        </svg>
                      </button>
                    </div>
                  ) : null}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowCamera(true)}
                      className="flex-1 py-3 rounded-[12px] border-2 border-dashed border-slate-300 text-slate-500 text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition cursor-pointer">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      {attachmentPreview && !removeExistingAttachment ? 'Ambil Ulang' : 'Ambil Foto'}
                    </button>
                    <button type="button" onClick={() => galleryRef.current?.click()}
                      className="flex-1 py-3 rounded-[12px] border-2 border-dashed border-slate-300 text-slate-500 text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:border-violet-400 hover:text-violet-500 hover:bg-violet-50/50 transition cursor-pointer">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      {attachmentPreview && !removeExistingAttachment ? 'Ganti dari Galeri' : 'Dari Galeri'}
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
                className="w-full py-[14px] rounded-[16px] text-[14px] font-bold text-white flex items-center justify-center gap-2 transition hover:opacity-90 active:scale-[.98] disabled:opacity-60 shadow-[0_4px_14px_rgba(59,130,246,.35)] border-none cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)' }}>
                {submitting ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity=".3"/>
                      <path d="M21 12a9 9 0 00-9-9"/>
                    </svg>
                    {editingId ? 'Memperbarui…' : 'Mengirim…'}
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
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
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                Filter Tanggal
              </div>
              {/* Search */}
              <div className="mb-2">
                <label className="text-[10px] font-semibold text-slate-400 mb-0.5 block">Cari</label>
                <div className="relative">
                  <input
                    className={inputCls + ' pr-9'}
                    type="text"
                    placeholder="Jenis linen, temuan, lokasi, nama…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
              </div>
              {/* Status filter buttons */}
              <div className="mb-2">
                <label className="text-[10px] font-semibold text-slate-400 mb-0.5 block">Status</label>
                <div className="flex gap-1.5">
                  {['terkirim', 'proses', 'selesai'].map(s => {
                    const meta = STATUS_META[s];
                    const isActive = statusFilter === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(isActive ? '' : s)}
                        className={`flex-1 h-[32px] rounded-[10px] text-[11.5px] font-bold transition cursor-pointer ${
                          isActive
                            ? `${meta.bg} ${meta.color} ${meta.border} border`
                            : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}>
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Reporter filter */}
              <div className="mb-2">
                <label className="text-[10px] font-semibold text-slate-400 mb-0.5 block">Pelapor</label>
                <div className="flex gap-1.5 mb-1.5">
                  {[
                    { value: '', label: 'Semua' },
                    { value: 'mine', label: 'Laporan Saya' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setReporterFilter(opt.value)}
                      className={`h-[32px] px-3 rounded-[10px] text-[11.5px] font-bold transition cursor-pointer ${
                        reporterFilter === opt.value
                          ? 'bg-slate-800 text-white border border-slate-800'
                          : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {leaders.length > 0 && (
                  <select
                    className={selectCls}
                    style={selectStyle}
                    value={reporterFilter === '' || reporterFilter === 'mine' ? '' : reporterFilter}
                    onChange={e => setReporterFilter(e.target.value || '')}>
                    <option value="">— Pilih Leader / Deputi —</option>
                    {leaders.map(l => (
                      <option key={l.employee_id} value={String(l.employee_id)}>
                        {l.full_name} ({l.role === 'management' ? 'Manajemen' : l.role === 'deputi' ? 'Deputi' : 'Leader'})
                      </option>
                    ))}
                  </select>
                )}
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
                  // Status filter
                  if (statusFilter && r.status !== statusFilter) return false;
                  // Search filter
                  if (q) {
                    const areaName = areas.find(a => String(a.id) === String(r.area_id))?.name || '';
                    const hospitalName = hospitals.find(h => String(h.id) === String(r.hospital_id))?.name || '';
                    const statusLabel = (STATUS_META[r.status]?.label || '').toLowerCase();
                    const matchesSearch =
                      (r.linen_type || '').toLowerCase().includes(q) ||
                      (r.finding_type || '').toLowerCase().includes(q) ||
                      (r.reporter_name || '').toLowerCase().includes(q) ||
                      (r.finding_location || '').toLowerCase().includes(q) ||
                      areaName.toLowerCase().includes(q) ||
                      hospitalName.toLowerCase().includes(q) ||
                      statusLabel.includes(q) ||
                      (r.sending_note || '').toLowerCase().includes(q) ||
                      (r.process_note || '').toLowerCase().includes(q) ||
                      (r.completed_note || '').toLowerCase().includes(q);
                    if (!matchesSearch) return false;
                  }
                  return true;
                });
                if (filtered.length === 0) {
                  return (
                    <div className="py-10 text-center">
                      <div className="w-14 h-14 rounded-full bg-slate-100 grid place-items-center mx-auto mb-3">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                          <polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/>
                        </svg>
                      </div>
                      <div className="text-[13px] font-bold text-slate-700 mb-1">
                        {q ? 'Tidak Ditemukan' : 'Belum Ada Laporan'}
                      </div>
                      <div className="text-[11.5px] text-slate-400">
                        {q ? 'Tidak ada laporan yang cocok dengan pencarian.' : 'Laporan temuan linen yang pernah kamu buat akan muncul di sini.'}
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="flex flex-col gap-3">
                    {filtered.map((r) => (
                      <ReportCard
                        key={r.id}
                        report={r}
                        areas={areas}
                        hospitals={hospitals}
                        isOwn={Number(r.reported_by) === Number(myEmployeeId)}
                        onEdit={() => startEdit(r)}
                        onDelete={() => setDeleteConfirmId(r.id)}
                        onStatus={openStatusModal}
                        onPhotoPreview={(url, title) => setPhotoModal({ url, title })}
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
              <div className="text-[16px] font-bold text-slate-900 mb-1.5">
                {editingId ? 'Laporan Diperbarui!' : 'Laporan Terkirim!'}
              </div>
              <div className="text-[12.5px] text-slate-500 leading-relaxed mb-5">
                {editingId
                  ? 'Perubahan berhasil disimpan.'
                  : 'Temuan linen berhasil dicatat dan akan segera ditindaklanjuti.'}
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => { resetForm(); setActiveTab('history'); }}
                  className="w-full py-2.5 rounded-[12px] bg-blue-600 text-white text-[13px] font-bold cursor-pointer hover:bg-blue-700 transition">
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
                  <polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
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

        {/* Status update note modal */}
        {statusModalOpen && (
          <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-[4px] grid place-items-center px-6">
            <div className="bg-white rounded-[24px] p-6 text-center max-w-[340px] w-full shadow-2xl">
              <div className="text-[15px] font-bold text-slate-900 mb-1">
                {statusTargetNext === 'proses' ? 'Proses Laporan' : 'Selesaikan Laporan'}
              </div>
              <p className="text-[12px] text-slate-500 leading-relaxed mb-4">
                {statusTargetNext === 'proses'
                  ? 'Tandai laporan ini sedang diproses. Tambahkan catatan jika diperlukan.'
                  : 'Tandai laporan ini sudah selesai ditangani. Tambahkan catatan jika diperlukan.'}
              </p>
              <textarea
                className="w-full px-3 py-2.5 border border-slate-200 rounded-[12px] bg-slate-50 text-[13px] text-slate-900 outline-none resize-none focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,.12)] focus:bg-white placeholder:text-slate-400 mb-3"
                rows={3}
                placeholder="Catatan opsional…"
                value={statusNote}
                onChange={e => setStatusNote(e.target.value)}
              />
              {/* Photo evidence upload */}
              <input type="file" ref={statusFileRef} accept="image/*" className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setStatusFile(f);
                  setStatusFilePreview(URL.createObjectURL(f));
                }}
              />
              {statusFilePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 mb-3">
                  <img src={statusFilePreview} alt="Bukti" className="w-full max-h-36 object-contain bg-slate-100" />
                  <button type="button"
                    onClick={() => { setStatusFile(null); setStatusFilePreview(null); if (statusFileRef.current) statusFileRef.current.value = ''; }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white grid place-items-center cursor-pointer hover:bg-black/70 transition">
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/>
                    </svg>
                  </button>
                </div>
              ) : null}
              <button type="button" onClick={() => statusFileRef.current?.click()}
                className="w-full mb-4 py-2 rounded-[12px] border-2 border-dashed border-slate-300 text-slate-500 text-[11.5px] font-semibold flex items-center justify-center gap-1.5 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition cursor-pointer">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {statusFile ? 'Ganti Foto Bukti' : 'Upload Foto Bukti (Opsional)'}
              </button>
              <div className="flex flex-col gap-2">
                <button onClick={handleStatusUpdate} disabled={statusSubmitting}
                  className="w-full py-2.5 rounded-[12px] text-white text-[13px] font-bold cursor-pointer transition disabled:opacity-60"
                  style={{ background: statusTargetNext === 'proses' ? '#F59E0B' : '#10B981' }}>
                  {statusSubmitting ? 'Memperbarui…' : (statusTargetNext === 'proses' ? 'Tandai Proses' : 'Tandai Selesai')}
                </button>
                <button onClick={() => { setStatusModalOpen(false); setStatusFile(null); setStatusFilePreview(null); }}
                  className="w-full py-2.5 rounded-[12px] border border-slate-200 text-slate-600 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition">
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Photo preview modal */}
        {photoModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 px-3 py-4"
            onClick={() => setPhotoModal(null)}>
            <div className="w-full max-w-[430px] max-h-[calc(100dvh-24px)] bg-white rounded-[18px] overflow-hidden shadow-[0_12px_60px_rgba(0,0,0,.35)] flex flex-col"
              onClick={e => e.stopPropagation()}>
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="text-[13px] font-extrabold text-slate-900 truncate pr-3">{photoModal.title || 'Foto Bukti'}</div>
                <button className="w-9 h-9 rounded-[12px] grid place-items-center border border-slate-200 bg-white text-slate-600 cursor-pointer"
                  onClick={() => setPhotoModal(null)} type="button" aria-label="Tutup">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M5 5l10 10M15 5L5 15"/>
                  </svg>
                </button>
              </div>
              <div className="p-3 sm:p-4 overflow-y-auto">
                <div className="rounded-[16px] overflow-hidden bg-slate-100 border border-slate-200">
                  <img src={photoModal.url} alt={photoModal.title || 'Foto bukti'} className="w-full h-auto max-h-[72dvh] object-contain"/>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────
   Report Card with Progress Tracking
─────────────────────────────────────────── */
function ReportCard({ report, areas, hospitals, isOwn, onEdit, onDelete, onStatus, onPhotoPreview }) {
  const meta = STATUS_META[report.status] || STATUS_META.terkirim;
  const areaName = areas.find(a => String(a.id) === String(report.area_id))?.name || '—';
  const hospitalName = hospitals.find(h => String(h.id) === String(report.hospital_id))?.name || '—';

  const steps = [
    {
      key: 'terkirim',
      label: 'Terkirim',
      active: true,
      by: report.reporter_name,
      at: report.created_at,
      note: report.sending_note,
      path: report.attachment_path,
    },
    {
      key: 'proses',
      label: 'Proses',
      active: report.status === 'proses' || report.status === 'selesai',
      by: report.process_by_name,
      at: report.process_at,
      note: report.process_note,
      path: report.process_path,
    },
    {
      key: 'selesai',
      label: 'Selesai',
      active: report.status === 'selesai',
      by: report.completed_by_name,
      at: report.completed_at,
      note: report.completed_note,
      path: report.completed_path,
    },
  ];

  return (
    <div className="bg-white rounded-[20px] border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,.04)] overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] text-slate-400 font-medium mb-0.5">{fmtDate(report.report_date)}</div>
          <div className="text-[13.5px] font-bold text-slate-900 truncate">{report.linen_type}</div>
          <div className="text-[11.5px] text-slate-500 mt-0.5">
            {report.finding_type} • {report.finding_qty} pcs • {report.finding_location}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {areaName} • {hospitalName}
            {report.ownership_type && (
              <span className="ml-1.5">
                • {report.ownership_type === 'hospital' ? 'Linen RS' : 'Linen Sewa'}
              </span>
            )}
          </div>
        </div>
        <span className={`text-[10.5px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${meta.bg} ${meta.color} ${meta.border} border`}>
          {meta.label}
        </span>
      </div>

      {/* Progress Timeline */}
      <div className="px-4 pt-4 pb-3">
        <div className="relative pl-2">
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;
            const stepColor = step.active
              ? (step.key === 'terkirim' ? '#3B82F6' : step.key === 'proses' ? '#F59E0B' : '#10B981')
              : '#CBD5E1';
            return (
              <div key={step.key} className="flex gap-3 relative">
                {/* Line + Dot */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-[22px] h-[22px] rounded-full border-2 grid place-items-center bg-white"
                    style={{ borderColor: stepColor }}>
                    {step.active ? (
                      <div className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: stepColor }}/>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-slate-200"/>
                    )}
                  </div>
                  {!isLast && (
                    <div className="w-[2px] flex-1 my-0.5"
                      style={{ backgroundColor: step.active && steps[idx + 1].active ? stepColor : '#E2E8F0' }}/>
                  )}
                </div>

                {/* Content */}
                <div className={`pb-3 ${!isLast ? '' : ''}`}>
                  <div className="text-[11.5px] font-bold" style={{ color: step.active ? '#1E293B' : '#94A3B8' }}>
                    {step.label}
                  </div>
                  {step.active && step.by ? (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Oleh <span className="font-semibold text-slate-700">{step.by}</span>
                      {step.at && <span className="text-slate-400"> • {fmtDateTime(step.at)}</span>}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 mt-0.5">Menunggu…</div>
                  )}
                  {step.active && step.note && (
                    <div className="mt-1 text-[11px] text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100 leading-relaxed">
                      “{step.note}”
                    </div>
                  )}
                  {step.active && step.path && (
                    <button
                      type="button"
                      onClick={() => onPhotoPreview(`${ASSET_BASE}${step.path}`, `Foto ${step.label}`)}
                      className="mt-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1 hover:bg-blue-100 transition cursor-pointer">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/>
                      </svg>
                      Lihat Foto Bukti
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action bar */}
      <div className="px-4 pb-4 flex items-center gap-2">
        {/* Edit / Delete - only if not completed and own report */}
        {isOwn && report.status !== 'selesai' && (
          <>
            <button onClick={onEdit}
              className="h-[34px] px-3 rounded-[10px] bg-slate-50 border border-slate-200 text-slate-700 text-[11.5px] font-bold flex items-center gap-1.5 hover:bg-slate-100 transition cursor-pointer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
            </button>
            <button onClick={onDelete}
              className="h-[34px] px-3 rounded-[10px] bg-red-50 border border-red-200 text-red-600 text-[11.5px] font-bold flex items-center gap-1.5 hover:bg-red-100 transition cursor-pointer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
              Hapus
            </button>
          </>
        )}

        {/* Status update buttons */}
        <div className="ml-auto flex gap-2">
          {report.status === 'terkirim' && (
            <button onClick={() => onStatus(report.id, 'proses')}
              className="h-[34px] px-3 rounded-[10px] bg-amber-500 text-white text-[11.5px] font-bold hover:bg-amber-600 transition cursor-pointer">
              Proses
            </button>
          )}
          {report.status === 'proses' && (
            <button onClick={() => onStatus(report.id, 'selesai')}
              className="h-[34px] px-3 rounded-[10px] bg-emerald-500 text-white text-[11.5px] font-bold hover:bg-emerald-600 transition cursor-pointer">
              Selesai
            </button>
          )}
        </div>
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
      const file = new File([blob], `linen_${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file);
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-[360px] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
          <span className="text-white text-[14px] font-bold">Ambil Foto Bukti</span>
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
