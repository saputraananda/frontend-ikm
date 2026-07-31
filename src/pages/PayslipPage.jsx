import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

const ASSET_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
const buildAssetUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${ASSET_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
};

const IconBack = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12,19 5,12 12,5" />
  </svg>
);

const IconDownload = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconEye = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconFilePdf = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M9 15h3a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2H9v5z" />
  </svg>
);

const formatPayslipMonth = (monthStr) => {
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return monthStr;
  const [year, month] = monthStr.split('-');
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const mIndex = parseInt(month, 10) - 1;
  return `${monthNames[mIndex] || month} ${year}`;
};

export default function PayslipPage() {
  const navigate = useNavigate();
  const [payslips, setPayslips] = useState([]);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState({});
  const [previewSlip, setPreviewSlip] = useState(null); // null or payslip object
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    document.title = 'Slip Gaji | IKM Mobile';
    fetchMonths();
  }, []);

  useEffect(() => {
    fetchPayslips();
  }, [selectedMonth]);

  const fetchMonths = async () => {
    try {
      const res = await api.get('/payslips/months');
      if (res.data?.success) {
        setMonths(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching payslip months', err);
    }
  };

  const fetchPayslips = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = selectedMonth ? { month: selectedMonth } : {};
      const res = await api.get('/payslips', { params });
      if (res.data?.success) {
        setPayslips(res.data.data || []);
      } else {
        setErrorMsg('Gagal memuat slip gaji');
      }
    } catch (err) {
      console.error('Error fetching payslips', err);
      setErrorMsg(err.response?.data?.message || 'Gagal memuat slip gaji dari server');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (slip) => {
    const slipId = slip.id;
    setDownloading(p => ({ ...p, [slipId]: true }));
    const fileUrl = buildAssetUrl(slip.file_url);
    const fileName = slip.file_name || `${slip.payslip_month}_payslip.pdf`;

    try {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch (err) {
      console.error('CORS blob download blocked, falling back to new window tab:', err);
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(p => ({ ...p, [slipId]: false }));
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-100 flex justify-center">
      <div className="w-full max-w-[430px] min-h-[100dvh] bg-slate-50 flex flex-col shadow-[0_0_0_1px_rgba(0,0,0,.04),0_8px_48px_rgba(0,0,0,.08)] relative overflow-hidden">
        
        {/* Header */}
        <div className="relative overflow-hidden rounded-b-[28px] flex-shrink-0 pb-5"
          style={{ background: 'linear-gradient(165deg, #0F172A 0%, #1E3A5F 50%, #1E40AF 100%)' }}>
          
          {/* Blob designs */}
          <div className="absolute -top-12 -right-8 w-40 h-40 rounded-full animate-pulse"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,.2) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,.12) 0%, transparent 70%)' }} />

          <div className="relative z-10 flex items-center justify-between px-5 pt-5">
            <button
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-[12px] bg-white/10 border border-white/12 text-white grid place-items-center cursor-pointer transition hover:bg-white/20 active:scale-95 flex-shrink-0 backdrop-blur-xl"
              aria-label="Kembali ke Beranda"
            >
              <IconBack />
            </button>
            <h1 className="text-[17px] font-extrabold text-white tracking-tight leading-none">Slip Gaji</h1>
            <div className="w-10 h-10" /> {/* Spacer */}
          </div>

          <div className="relative z-10 px-5 mt-5">
            <div className="text-[11px] text-white/55 font-medium tracking-[0.05em] uppercase">Filter Slip Gaji</div>
            <div className="relative mt-1.5">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="w-full h-11 rounded-[12px] bg-white/10 border border-white/15 px-3.5 pr-10 text-[13.5px] font-bold text-white outline-none appearance-none cursor-pointer transition hover:bg-white/15 focus:border-blue-400 backdrop-blur-xl"
              >
                <option value="" className="text-slate-900 font-semibold">Semua Bulan</option>
                {months.map(m => (
                  <option key={m} value={m} className="text-slate-900 font-semibold">
                    {formatPayslipMonth(m)}
                  </option>
                ))}
              </select>
              {/* Custom arrow indicator */}
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2,3 5,6 8,3" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto px-4 pt-5 pb-8">
          
          {errorMsg && (
            <div className="mb-4 bg-red-50 border border-red-100 rounded-[16px] p-4 text-center">
              <div className="text-[12.5px] text-red-600 font-semibold">{errorMsg}</div>
            </div>
          )}

          {loading ? (
            /* Loading states */
            <div className="flex flex-col gap-3.5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[92px] bg-white rounded-[20px] border border-slate-100 p-4 flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-[14px] bg-slate-100" />
                    <div className="flex flex-col gap-1.5">
                      <div className="w-24 h-4 bg-slate-100 rounded" />
                      <div className="w-36 h-3 bg-slate-50 rounded" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-100" />
                    <div className="w-8 h-8 rounded-lg bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : payslips.length === 0 ? (
            /* Empty state */
            <div className="bg-white rounded-[22px] border border-slate-100 py-12 px-6 text-center shadow-[0_1px_4px_rgba(0,0,0,0.03)] mt-2">
              <div className="w-16 h-16 rounded-[22px] bg-slate-50 text-slate-300 grid place-items-center mx-auto mb-4 border border-slate-100">
                <IconFilePdf />
              </div>
              <h2 className="text-[14.5px] font-extrabold text-slate-800">Tidak Ada Slip Gaji</h2>
              <p className="text-[12px] text-slate-400 font-medium leading-relaxed max-w-[240px] mx-auto mt-1.5">
                {selectedMonth 
                  ? `Tidak ada slip gaji yang ditemukan untuk bulan ${formatPayslipMonth(selectedMonth)}.`
                  : 'Dokumen slip gaji Anda belum diunggah oleh admin.'
                }
              </p>
            </div>
          ) : (
            /* Payslip list */
            <div className="flex flex-col gap-3.5">
              {payslips.map(slip => (
                <div 
                  key={slip.id}
                  className="bg-white rounded-[20px] border border-slate-100 p-4 flex items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.02)] transition hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-[14px] bg-rose-50 border border-rose-100 text-rose-500 grid place-items-center flex-shrink-0">
                      <IconFilePdf />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-extrabold text-slate-800 leading-tight">
                        {formatPayslipMonth(slip.payslip_month)}
                      </div>
                      <div className="text-[11px] text-slate-400 font-semibold truncate mt-1">
                        {slip.file_name || 'Slip Gaji.pdf'}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {/* View Button */}
                    <button
                      onClick={() => setPreviewSlip(slip)}
                      className="w-9 h-9 rounded-[10px] bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-600 grid place-items-center cursor-pointer transition active:scale-95"
                      title="Pratinjau Slip Gaji"
                    >
                      <IconEye />
                    </button>
                    {/* Download Button */}
                    <button
                      onClick={() => handleDownload(slip)}
                      disabled={!!downloading[slip.id]}
                      className="w-9 h-9 rounded-[10px] bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-600 grid place-items-center cursor-pointer transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Unduh Slip Gaji"
                    >
                      {downloading[slip.id] ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-600/30 border-t-blue-600 animate-spin" />
                      ) : (
                        <IconDownload />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {previewSlip && (
          <div 
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-[3px]"
            onClick={() => setPreviewSlip(null)}
          >
            <div 
              className="relative w-full max-w-[430px] bg-white rounded-t-[28px] sm:rounded-[24px] flex flex-col overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,.4)] animate-fade-up"
              style={{ maxHeight: '92dvh' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-3 flex-shrink-0">
                <div className="w-10 h-10 rounded-[12px] flex-shrink-0 grid place-items-center text-white bg-gradient-to-tr from-rose-500 to-rose-600 shadow-md">
                  <IconFilePdf />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-extrabold text-slate-800 leading-tight truncate">
                    Slip Gaji {formatPayslipMonth(previewSlip.payslip_month)}
                  </div>
                  <div className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">
                    {previewSlip.file_name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewSlip(null)}
                  className="w-8 h-8 rounded-[10px] bg-slate-100 hover:bg-slate-200 text-slate-500 grid place-items-center cursor-pointer transition flex-shrink-0"
                >
                  <IconClose />
                </button>
              </div>

              {/* Modal Divider */}
              <div className="h-px bg-slate-100 flex-shrink-0 mx-4" />

              {/* PDF Viewer Body */}
              <div className="flex-1 overflow-auto bg-[#F8F9FB] p-4 flex justify-center" style={{ minHeight: 250 }}>
                <iframe
                  src={buildAssetUrl(previewSlip.file_url)}
                  title={previewSlip.file_name || 'Slip Gaji'}
                  className="w-full rounded-[14px] bg-white border border-slate-200 shadow-sm"
                  style={{ height: '55dvh' }}
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center gap-2.5 px-4 pt-3 pb-safe-4 flex-shrink-0 bg-white border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPreviewSlip(null)}
                  className="flex-1 h-[46px] rounded-[13px] border border-slate-200 bg-slate-50 text-slate-700 text-[13px] font-extrabold flex items-center justify-center gap-1.5 transition hover:bg-slate-100 active:scale-95 cursor-pointer"
                >
                  <IconClose /> Tutup
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(previewSlip)}
                  disabled={!!downloading[previewSlip.id]}
                  className="flex-[1.6] h-[46px] rounded-[13px] text-white text-[13px] font-extrabold flex items-center justify-center gap-1.5 transition hover:opacity-95 active:scale-95 disabled:opacity-60 cursor-pointer shadow-md bg-gradient-to-r from-blue-600 to-blue-500"
                >
                  {downloading[previewSlip.id] ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <IconDownload /> Unduh Slip Gaji
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
