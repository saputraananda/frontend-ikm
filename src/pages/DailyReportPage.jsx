import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DailyReportPage() {
    const navigate = useNavigate();

    useEffect(() => { document.title = 'Laporan Harian | IKM Mobile'; }, []);

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

                {/* Placeholder content */}
                <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
                    <div className="w-20 h-20 rounded-[24px] bg-emerald-50 grid place-items-center">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14,2 14,8 20,8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10,9 9,9 8,9" />
                        </svg>
                    </div>
                    <div className="text-center">
                        <div className="text-[17px] font-extrabold text-slate-800 mb-1.5">Segera Hadir</div>
                        <div className="text-[13px] text-slate-500 leading-relaxed">
                            Fitur laporan harian leader sedang dalam pengembangan dan akan segera tersedia.
                        </div>
                    </div>
                    <button onClick={() => navigate(-1)}
                        className="mt-2 px-8 py-2.5 rounded-[12px] bg-[#0B1739] text-white text-[13px] font-bold cursor-pointer hover:bg-[#1a2d5a] transition">
                        Kembali
                    </button>
                </div>

            </div>
        </div>
    );
}
