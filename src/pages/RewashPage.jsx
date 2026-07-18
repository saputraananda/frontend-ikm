import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import useAuthStore from '../store/authStore';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtDate = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

/* Range default: 1 minggu terakhir (hari ini - 7 hari) */
const getLastWeekRange = () => {
  const today = new Date();
  const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(oneWeekAgo), end: fmt(today) };
};

export default function RewashPage() {
  const navigate = useNavigate();
  const authUser = useAuthStore(s => s.user);

  /* ── Tabs ── */
  const [activeTab, setActiveTab] = useState('form'); /* 'form' | 'history' */

  /* ── Master data ── */
  const [hospitals, setHospitals] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [ownershipFilter, setOwnershipFilter] = useState('');

  /* ── Form fields ── */
  const [reporterName, setReporterName] = useState(authUser?.full_name || authUser?.name || '');
  const [empSearchFocused, setEmpSearchFocused] = useState(false);
  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const [reportDate, setReportDate] = useState(todayStr());
  const [hospitalId, setHospitalId] = useState('');
  const [linens, setLinens] = useState([]);
  const [searchLinen, setSearchLinen] = useState('');
  const [reportNotes, setReportNotes] = useState('');

  /* Sync reporterName when authUser is loaded */
  useEffect(() => {
    if (authUser && !reporterName) {
      setReporterName(authUser.full_name || authUser.name || '');
    }
  }, [authUser, reporterName]);

  /* ── Edit mode ── */
  const [editingId, setEditingId] = useState(null);
  const [editingReport, setEditingReport] = useState(null);
  const [existingReportWarning, setExistingReportWarning] = useState(null);

  /* ── UI state ── */
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  /* ── History state ── */
  const [reports, setReports] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const defaultRange = getLastWeekRange();
  const [historyStart, setHistoryStart] = useState(defaultRange.start);
  const [historyEnd, setHistoryEnd] = useState(defaultRange.end);
  const [historyHospitalId, setHistoryHospitalId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState(null);
  const draftLinensRef = useRef([]);

  /* ── Init ── */
  useEffect(() => {
    document.title = 'Rewash | IKM Mobile';
    Promise.all([
      api.get('/rewash/hospitals'),
      api.get('/rewash/employees'),
    ]).then(([hospitalsRes, empRes]) => {
      setHospitals(hospitalsRes.data?.data || []);
      setEmployees(empRes.data?.data || []);
    }).catch(err => {
      console.error('[RewashInit] error fetching master data', err);
    });

    // Load draft
    const savedDraft = localStorage.getItem('rewash_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.reporterName) setReporterName(draft.reporterName);
        if (draft.reportDate) setReportDate(draft.reportDate);
        if (draft.hospitalId) setHospitalId(draft.hospitalId);
        if (draft.ownershipFilter) setOwnershipFilter(draft.ownershipFilter);
        if (draft.linens) draftLinensRef.current = draft.linens;
        if ('reportNotes' in draft) setReportNotes(draft.reportNotes);
      } catch (err) {
        console.error('Failed to parse rewash draft', err);
      }
    }
  }, []);

  /* ── Fetch linens when hospital or ownership filter changes ── */
  useEffect(() => {
    if (!hospitalId) {
      setLinens([]);
      return;
    }

    const params = { hospital_id: hospitalId };
    if (ownershipFilter) params.ownership_type = ownershipFilter;

    api.get(`/rewash/linens`, { params })
      .then(res => {
        const items = res.data?.data || [];
        setLinens(prev => items.map(item => {
          let qty = 0;
          let detailId = null;
          if (editingId && editingReport && editingReport.items) {
            const editedLinen = editingReport.items.find(el => String(el.hospital_linen_id) === String(item.hospital_linen_id));
            if (editedLinen) {
              qty = editedLinen.qty;
              detailId = editedLinen.id || editedLinen.detail_id;
            }
          } else if (draftLinensRef.current && draftLinensRef.current.length > 0) {
            const draftLinen = draftLinensRef.current.find(dl => String(dl.hospital_linen_id) === String(item.hospital_linen_id));
            if (draftLinen) qty = draftLinen.qty;
          } else {
            const existingItem = prev.find(l => String(l.hospital_linen_id) === String(item.hospital_linen_id));
            if (existingItem) {
              qty = existingItem.qty;
              detailId = existingItem.detail_id;
            }
          }
          return { ...item, detail_id: detailId, qty };
        }));

        draftLinensRef.current = [];
      })
      .catch(err => {
        console.error('[RewashLinens] error fetching linens', err);
      });
  }, [hospitalId, ownershipFilter, editingId, editingReport]);

  /* ── Fetch history ── */
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, historyStart, historyEnd, historyHospitalId]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const params = {};
      if (historyStart) params.startDate = historyStart;
      if (historyEnd) params.endDate = historyEnd;
      if (historyHospitalId) params.hospitalId = historyHospitalId;

      const res = await api.get('/rewash/all-reports', { params });
      setReports(res.data?.data || []);
    } catch (err) {
      console.error('fetchHistory', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleHospitalChange = async (e) => {
    const val = e.target.value;
    setHospitalId(val);
    setLinens([]);
    
    if (val) {
      try {
        const res = await api.get(`/rewash/check-hospital-report`, { params: { hospital_id: val } });
        if (res.data?.data?.exists) {
          const existingReport = res.data.data.report;
          if (editingId && Number(editingId) === Number(existingReport.id)) {
            return;
          }
          setExistingReportWarning(existingReport);
        }
      } catch (err) {
        console.error('Error checking existing hospital report', err);
      }
    }
  };

  const handleQtyChange = (hospitalLinenId, val) => {
    const parsedVal = Math.max(0, parseInt(val) || 0);
    setLinens(prev => prev.map(item =>
      item.hospital_linen_id === hospitalLinenId ? { ...item, qty: parsedVal } : item
    ));
  };

  const handleIncrement = (hospitalLinenId) => {
    setLinens(prev => prev.map(item =>
      item.hospital_linen_id === hospitalLinenId ? { ...item, qty: item.qty + 1 } : item
    ));
  };

  const handleDecrement = (hospitalLinenId) => {
    setLinens(prev => prev.map(item =>
      item.hospital_linen_id === hospitalLinenId ? { ...item, qty: Math.max(0, item.qty - 1) } : item
    ));
  };

  const resetForm = () => {
    setReporterName(authUser?.full_name || authUser?.name || '');
    setReportDate(todayStr());
    setHospitalId('');
    setLinens([]);
    setOwnershipFilter('');
    setSearchLinen('');
    setEditingId(null);
    setEditingReport(null);
    setReportNotes('');
    setSubmitError(null);
    setSuccess(false);
    setSuccessMsg('');
    setExistingReportWarning(null);
  };

  const startEdit = (report) => {
    setEditingId(report.id); // Use rewash.id as the ID
    setEditingReport(report);
    setReporterName(report.reporter_name || '');
    setReportDate(report.report_date || todayStr());
    setHospitalId(String(report.hospital_id));
    setReportNotes(report.notes || '');
    setActiveTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveDraft = () => {
    const draft = {
      reporterName,
      reportDate,
      hospitalId,
      ownershipFilter,
      reportNotes,
      linens: linens.filter(l => l.qty > 0).map(l => ({ hospital_linen_id: l.hospital_linen_id, qty: l.qty }))
    };
    localStorage.setItem('rewash_draft', JSON.stringify(draft));
    setSuccessMsg('Draft berhasil disimpan sementara!');
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setSuccessMsg('');
    }, 1500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!reporterName.trim()) return setSubmitError('Nama pelapor wajib diisi.');
    if (!reportDate) return setSubmitError('Tanggal temuan wajib diisi.');
    if (!hospitalId) return setSubmitError('Rumah sakit wajib dipilih.');

    const activeItems = linens.filter(l => l.qty > 0);

    if (editingId) {
      setSubmitting(true);
      try {
        // PATCH — only send items that already exist in DB or have qty>0
        const patchItems = linens
          .filter(l => l.detail_id || l.qty > 0)
          .map(l => ({
            id: l.detail_id || null,
            hospital_linen_id: l.hospital_linen_id,
            qty: l.qty
          }));
        await api.put(`/rewash/${editingId}`, {
          reporter_name: reporterName.trim(),
          report_date: reportDate,
          hospital_id: hospitalId,
          notes: reportNotes.trim() || null,
          items: patchItems
        });
        setSuccessMsg('Laporan rewash berhasil diperbarui!');
        setSuccess(true);
        setTimeout(() => {
          resetForm();
          setActiveTab('history');
        }, 1500);
      } catch (err) {
        setSubmitError(err?.response?.data?.message || 'Gagal memperbarui data rewash.');
      } finally {
        setSubmitting(false);
      }
    } else {
      if (activeItems.length === 0) {
        return setSubmitError('Harap isi jumlah rewash minimal 1 untuk salah satu linen.');
      }

      setSubmitting(true);
      try {
        await api.post('/rewash', {
          reporter_name: reporterName.trim(),
          report_date: reportDate,
          hospital_id: hospitalId,
          notes: reportNotes.trim() || null,
          items: activeItems.map(l => ({
            hospital_linen_id: l.hospital_linen_id,
            qty: l.qty
          }))
        });
        // Clear draft on successful final submission
        localStorage.removeItem('rewash_draft');

        setSuccessMsg('Data rewash berhasil dikirim!');
        setSuccess(true);
        setTimeout(() => {
          resetForm();
          setActiveTab('history');
        }, 1500);
      } catch (err) {
        setSubmitError(err?.response?.data?.message || 'Gagal mengirim data rewash.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleDelete = async (reportId) => {
    try {
      await api.delete(`/rewash/${reportId}`);
      setDeleteConfirmGroup(null);
      fetchHistory();
    } catch (err) {
      console.error('deleteReport error', err);
    }
  };

  /* Filter linens based on search input */
  const filteredLinens = linens.filter(item => {
    const query = searchLinen.trim().toLowerCase();
    if (!query) return true;
    return (
      (item.hospital_linen_name || '').toLowerCase().includes(query) ||
      (item.linen_name || '').toLowerCase().includes(query)
    );
  });

  /* Shared style classes matching LinenReportPage.jsx */
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
            <div className="text-[14px] font-bold text-white tracking-[-0.01em] truncate">Rewash Linen PT IKM</div>
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
          <main className="flex-1 px-[13px] py-[14px] pb-24 flex flex-col gap-2.5 overflow-y-auto">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Banner */}
              <div className="relative overflow-hidden rounded-[20px] px-5 py-[18px] text-white"
                style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)' }}>
                <div className="relative z-[1]">
                  <div className="text-[10px] font-extrabold uppercase tracking-[.16em] text-blue-200 mb-1">Pencatatan</div>
                  <h2 className="text-[16px] font-extrabold tracking-[-0.02em]">Data Linen Rewash</h2>
                  <p className="mt-1 text-[11px] text-blue-100/75 leading-relaxed max-w-[260px]">
                    Silakan pilih rumah sakit dan masukkan jumlah linen yang perlu di-rewash.
                  </p>
                </div>
                <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
              </div>

              {/* Section 1 – Identitas */}
              <Section color="bg-blue-500" title="Identitas Pelapor">
                <Field label="Nama Pelapor (Karyawan IKM)" required>
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
                      onFocusCapture={() => setEmpSearchFocused(true)}
                      onBlur={() => {
                        setTimeout(() => setEmpSearchFocused(false), 200);
                      }}
                      onChange={e => {
                        setEmpSearchQuery(e.target.value);
                        setReporterName('');
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
                                  e.preventDefault();
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

              {/* Section 2 – Catatan Laporan */}
              <Section color="bg-amber-500" title="Catatan Laporan">
                <Field label="Catatan Rewash" hint="Opsional — isi jika ada keterangan tambahan">
                  <textarea
                    className={inputCls + ' min-h-[80px] resize-none'}
                    placeholder="Tulis catatan apapun terkait laporan rewash kali ini"
                    value={reportNotes}
                    onChange={e => setReportNotes(e.target.value)}
                  />
                </Field>
              </Section>

              {/* Section 3 – Rumah Sakit */}
              <Section color="bg-emerald-500" title="Rumah Sakit">
                <Field label="Pilih Rumah Sakit" required>
                  <select className={selectCls} style={selectStyle}
                    value={hospitalId} onChange={handleHospitalChange}>
                    <option value="">— Pilih Rumah Sakit —</option>
                    {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </Field>

                {hospitalId && (
                  <Field label="Filter Kepemilikan Linen">
                    <div className="flex rounded-[12px] bg-slate-100 p-0.5">
                      {[
                        { value: '', label: 'Semua' },
                        { value: 'MILIK_RS', label: 'RS' },
                        { value: 'SEWA', label: 'Sewa' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setOwnershipFilter(opt.value)}
                          className={`flex-1 h-[36px] rounded-[10px] text-[12px] font-bold border-none cursor-pointer transition ${
                            ownershipFilter === opt.value
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'bg-transparent text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </Field>
                )}
              </Section>

              {/* Section 4 – List Linen */}
              <Section color="bg-violet-500" title="Daftar Linen Rumah Sakit">
                {hospitalId && (
                  <div className="mb-2">
                    <div className="relative">
                      <input
                        className={inputCls + ' pr-9'}
                        type="text"
                        placeholder="Cari linen berdasarkan nama..."
                        value={searchLinen}
                        onChange={e => setSearchLinen(e.target.value)}
                      />
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                    </div>
                  </div>
                )}

                <div className="overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm mt-1">
                  <table className="w-full text-left border-collapse text-[12.5px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="py-2.5 px-3 w-10 text-center">No</th>
                        <th className="py-2.5 px-3">Nama Linen</th>
                        <th className="py-2.5 px-3 w-32 text-center">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLinens.length > 0 ? (
                        filteredLinens.map((item, index) => (
                          <tr key={item.hospital_linen_id} className="border-b border-slate-100 hover:bg-slate-50 transition last:border-0">
                            <td className="py-3 px-2 text-center text-slate-400">{index + 1}</td>
                            <td className="py-3 px-2">
                              {item.hospital_linen_name?.trim() ? (
                                <>
                                  <div className="font-bold text-slate-800 break-words leading-tight flex items-center gap-1.5 flex-wrap">
                                    {item.hospital_linen_name}
                                    <OwnershipBadge type={item.ownership_type} />
                                  </div>
                                  <div className="text-[10.5px] text-slate-400 mt-0.5 break-words">{item.linen_name}</div>
                                </>
                              ) : (
                                <div className="font-bold text-slate-800 break-words leading-tight flex items-center gap-1.5 flex-wrap">
                                  {item.linen_name}
                                  <OwnershipBadge type={item.ownership_type} />
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-1 justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleDecrement(item.hospital_linen_id)}
                                  className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm font-bold grid place-items-center hover:bg-slate-100 transition cursor-pointer select-none"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.qty === 0 ? '' : item.qty}
                                  placeholder="0"
                                  onChange={e => handleQtyChange(item.hospital_linen_id, e.target.value)}
                                  className="w-16 h-7 text-center font-bold text-[12px] border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleIncrement(item.hospital_linen_id)}
                                  className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm font-bold grid place-items-center hover:bg-slate-100 transition cursor-pointer select-none"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="py-10 text-center text-slate-400 font-medium">
                            {hospitalId ? 'Linen tidak ditemukan' : 'Pilih rumah sakit terlebih dahulu'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Section>

              {/* Feedback messages */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-[12px] px-4 py-3 text-[12.5px] text-red-600 font-medium leading-relaxed mb-16">
                  {submitError}
                </div>
              )}

              {success && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-[12px] px-4 py-3 text-[12.5px] text-emerald-600 font-medium leading-relaxed mb-16">
                  {successMsg || (editingId ? 'Data rewash berhasil diperbarui!' : 'Data rewash berhasil dikirim!')}
                </div>
              )}

              {/* Floating Bottom Bar */}
              <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/90 backdrop-blur-md border-t border-slate-200 p-3 z-40 flex gap-2.5 shadow-[0_-8px_32px_rgba(0,0,0,0.08)]">
                {editingId ? (
                  <>
                    <button type="button" onClick={resetForm}
                      className="flex-1 h-12 rounded-[14px] border border-slate-200 bg-white text-slate-600 text-[13px] font-bold cursor-pointer hover:bg-slate-50 transition">
                      Batal
                    </button>
                    <button type="submit" disabled={submitting}
                      className="flex-[2] h-12 rounded-[14px] text-[13px] font-bold text-white flex items-center justify-center gap-2 transition hover:opacity-90 active:scale-[.98] disabled:opacity-60 shadow-[0_4px_14px_rgba(59,130,246,.3)] border-none cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)' }}>
                      {submitting ? 'Memperbarui…' : 'Update Data'}
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={saveDraft}
                      className="flex-1 h-12 rounded-[14px] border border-slate-200 bg-white text-slate-600 text-[13px] font-bold cursor-pointer hover:bg-slate-50 transition">
                      Simpan Sementara
                    </button>
                    <button type="submit" disabled={submitting}
                      className="flex-1 h-12 rounded-[14px] text-[13px] font-bold text-white flex items-center justify-center gap-2 transition hover:opacity-90 active:scale-[.98] disabled:opacity-60 shadow-[0_4px_14px_rgba(59,130,246,.3)] border-none cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)' }}>
                      {submitting ? 'Mengirim…' : 'Kirim Data'}
                    </button>
                  </>
                )}
              </div>
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
                Filter Tanggal & Cari
              </div>

              {/* Search */}
              <div className="mb-2.5">
                <div className="relative">
                  <input
                    className={inputCls + ' pr-9'}
                    type="text"
                    placeholder="Cari berdasarkan linen, rumah sakit, pelapor..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
              </div>

              {/* Hospital Filter */}
              <div className="mb-2.5">
                <select
                  className={selectCls}
                  style={selectStyle}
                  value={historyHospitalId}
                  onChange={e => setHistoryHospitalId(e.target.value)}
                >
                  <option value="">— Semua Rumah Sakit —</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
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
            </div>

            {/* List */}
            {historyLoading ? (
              <div className="py-10 text-center text-[12.5px] text-slate-400 font-medium">Memuat riwayat…</div>
            ) : (
              (() => {
                const q = searchQuery.trim().toLowerCase();
                const filtered = reports.filter(r => {
                  if (q) {
                    const matchesSearch =
                      (r.hospital_name || '').toLowerCase().includes(q) ||
                      (r.reporter_name || '').toLowerCase().includes(q) ||
                      r.items.some(item =>
                        (item.hospital_linen_name || '').toLowerCase().includes(q) ||
                        (item.linen_name || '').toLowerCase().includes(q)
                      );
                    return matchesSearch;
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 bg-white rounded-[20px] border border-slate-200 text-center text-slate-400 text-[12.5px] font-semibold px-4">
                      Belum ada riwayat rewash linen pada tanggal terpilih.
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col gap-3.5">
                    {filtered.map(report => (
                      <div key={report.id}
                        className="bg-white rounded-[20px] border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,.04)] p-4 flex flex-col gap-3 transition hover:shadow-md cursor-pointer"
                        onClick={() => startEdit(report)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 w-full">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[11px] text-slate-400 font-medium">{fmtDate(report.report_date)}</span>
                              <span className="text-[10.5px] text-slate-400">{report.created_at_str.slice(11, 16)}</span>
                            </div>

                            <div className="text-[14px] font-bold text-slate-900 leading-tight">
                              {report.hospital_name}
                            </div>

                            <div className="text-[11px] text-slate-500 mt-1">
                              Dilaporkan Oleh: <span className="font-semibold text-slate-700">{report.reporter_name}</span>
                            </div>

                            {report.notes && (
                              <div className="text-[11px] text-slate-500 mt-1.5 italic leading-relaxed bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                                “{report.notes}”
                              </div>
                            )}

                            {/* Ownership count badges */}
                            {(() => {
                              const rsQty = report.items.reduce((acc, curr) => curr.ownership_type === 'MILIK_RS' ? acc + curr.qty : acc, 0);
                              const sewaQty = report.items.reduce((acc, curr) => curr.ownership_type === 'SEWA' ? acc + curr.qty : acc, 0);
                              
                              return (
                                <div className="mt-2.5 flex flex-wrap gap-2">
                                  {rsQty > 0 && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200 select-none">
                                      RS: <span className="font-extrabold text-blue-700">{rsQty} pcs</span>
                                    </span>
                                  )}
                                  {sewaQty > 0 && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 select-none">
                                      Sewa: <span className="font-extrabold text-emerald-700">{sewaQty} pcs</span>
                                    </span>
                                  )}
                                </div>
                              );
                            })()}

                            <div className="text-[11.5px] text-slate-400 text-right mt-2 font-medium">
                              Total: <span className="text-blue-600 font-bold">{report.items.reduce((acc, curr) => acc + curr.qty, 0)} pcs</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 border-t border-slate-100 pt-3 mt-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => startEdit(report)}
                            className="h-[32px] px-3.5 rounded-[10px] bg-slate-50 border border-slate-200 text-slate-700 text-[11.5px] font-bold flex items-center gap-1.5 hover:bg-slate-100 transition cursor-pointer">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Edit
                          </button>
                          <button onClick={() => setDeleteConfirmGroup({ id: report.id, hospital_name: report.hospital_name })}
                            className="h-[32px] px-3.5 rounded-[10px] bg-red-50 border border-red-200 text-red-600 text-[11.5px] font-bold flex items-center gap-1.5 hover:bg-red-100 transition cursor-pointer">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                            </svg>
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </main>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmGroup && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-[340px] bg-white rounded-[20px] p-5 shadow-[0_10px_40px_rgba(0,0,0,.12)] text-center">
              <div className="w-12 h-12 rounded-[16px] bg-red-50 border border-red-100 flex items-center justify-center text-red-500 mx-auto mb-3.5">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                </svg>
              </div>
              <h3 className="text-[15px] font-extrabold text-slate-900 tracking-[-0.01em] mb-1">Hapus Laporan Rewash</h3>
              <p className="text-[12px] text-slate-400 leading-relaxed mb-5">
                Apakah Anda yakin ingin menghapus seluruh paket laporan rewash untuk <span className="font-bold text-slate-700">{deleteConfirmGroup.hospital_name}</span>? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex gap-2">
                <button onClick={() => handleDelete(deleteConfirmGroup.id)}
                  className="flex-1 py-2.5 rounded-[12px] bg-red-500 text-white text-[12.5px] font-bold border-none cursor-pointer hover:bg-red-600 transition">
                  Ya, Hapus
                </button>
                <button onClick={() => setDeleteConfirmGroup(null)}
                  className="flex-1 py-2.5 rounded-[12px] border border-slate-200 bg-white text-slate-600 text-[12.5px] font-bold cursor-pointer hover:bg-slate-50 transition">
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Existing Report Warning Modal */}
        {existingReportWarning && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-[340px] bg-white rounded-[20px] p-5 shadow-[0_10px_40px_rgba(0,0,0,.12)] text-center">
              <div className="w-12 h-12 rounded-[16px] bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 mx-auto mb-3.5">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h3 className="text-[15px] font-extrabold text-slate-900 tracking-[-0.01em] mb-1">Rumah Sakit Ini Telah Ada Riwayat Laporan</h3>
              <p className="text-[12px] text-slate-400 leading-relaxed mb-5">
                Apakah Anda ingin mengecek dan melengkapinya?
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => {
                  startEdit(existingReportWarning);
                  setExistingReportWarning(null);
                }}
                  className="flex-1 py-2.5 rounded-[12px] bg-blue-500 text-white text-[12.5px] font-bold border-none cursor-pointer hover:bg-blue-600 transition">
                  Cek
                </button>
                <button type="button" onClick={() => {
                  if (editingId) {
                    setHospitalId(String(editingReport.hospital_id));
                  } else {
                    setHospitalId('');
                  }
                  setExistingReportWarning(null);
                }}
                  className="flex-1 py-2.5 rounded-[12px] border border-slate-200 bg-white text-slate-600 text-[12.5px] font-bold cursor-pointer hover:bg-slate-50 transition">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* Helper components matching LinenReportPage.jsx */
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

function OwnershipBadge({ type }) {
  if (!type) return null;
  const isRS = type === 'MILIK_RS';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-wide uppercase border select-none ${
      isRS 
        ? 'bg-blue-50 text-blue-600 border-blue-200' 
        : 'bg-emerald-50 text-emerald-600 border-emerald-200'
    }`}>
      {isRS ? 'RS' : 'Sewa'}
    </span>
  );
}
