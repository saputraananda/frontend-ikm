import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';

const ROLE_LABEL = { leader: 'Leader', deputi: 'Deputi' };

const MENU_ITEMS = [
    {
        key: 'linen',
        label: 'Pemeriksaan Linen PT IKM',
        desc: 'Cek & validasi data linen yang masuk dan keluar',
        to: '/linen-report',
        icon: (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
        ),
        gradient: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)',
    },
    {
        key: 'laporan',
        label: 'Laporan Harian Leader',
        desc: 'Buat & kirim laporan aktivitas harian kepada atasan',
        to: '/daily-report',
        icon: (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10,9 9,9 8,9" />
            </svg>
        ),
        gradient: 'linear-gradient(135deg, #065F46 0%, #059669 100%)',
    },
];

export default function LeaderPage() {
    const navigate = useNavigate();
    const [checking, setChecking] = useState(true);
    const [denied, setDenied] = useState(false);

    useEffect(() => {
        document.title = 'Leader | IKM Mobile';
        api.get('/auth/leader-role')
            .then(r => {
                const data = r.data?.data;
                if (!data?.is_leader) {
                    setDenied(true);
                }
            })
            .catch(() => setDenied(true))
            .finally(() => setChecking(false));
    }, []);

    /* Loading state */
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
            <div className="w-full max-w-[430px] min-h-[100dvh] bg-slate-50 flex flex-col shadow-[0_0_0_1px_rgba(0,0,0,.04),0_8px_48px_rgba(0,0,0,.08)]">

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
                        <div className="text-[14px] font-bold text-white tracking-[-0.01em] truncate">Menu Leader</div>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 px-4 pt-5 pb-10 flex flex-col gap-4">

                    {/* Menu list */}
                    <div className="flex flex-col gap-3">
                        {MENU_ITEMS.map((item) => (
                            <Link key={item.key} to={item.to}
                                className="relative overflow-hidden rounded-[22px] px-5 py-5 flex items-center gap-4 no-underline transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,.22)] active:scale-[.98] shadow-[0_6px_24px_rgba(0,0,0,.18)]"
                                style={{ background: item.gradient }}>

                                {/* Background glow */}
                                <div className="absolute -top-6 -right-6 w-[110px] h-[110px] rounded-full pointer-events-none"
                                    style={{ background: 'radial-gradient(circle, rgba(255,255,255,.12) 0%, transparent 70%)' }} />

                                {/* Icon box */}
                                <div className="relative z-[1] w-[58px] h-[58px] rounded-[16px] flex-shrink-0 grid place-items-center"
                                    style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)' }}>
                                    {/* re-color icon to white */}
                                    <span style={{ filter: 'brightness(0) invert(1)' }}>{item.icon}</span>
                                </div>

                                {/* Text */}
                                <div className="relative z-[1] flex-1 min-w-0">
                                    <div className="text-[14.5px] font-extrabold text-white leading-snug tracking-[-0.2px]">
                                        {item.label}
                                    </div>
                                    <div className="text-[11.5px] text-white/60 mt-0.5 leading-relaxed">
                                        {item.desc}
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="relative z-[1] flex-shrink-0">
                                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="7,4 13,10 7,16" />
                                    </svg>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* ── Denied modal ── */}
                {denied && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[3px] px-5">
                        <div className="w-full max-w-[320px] bg-white rounded-3xl p-7 shadow-2xl flex flex-col items-center text-center gap-3">
                            <div className="w-[60px] h-[60px] rounded-full bg-red-50 grid place-items-center">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round">
                                    <circle cx="12" cy="12" r="9" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <circle cx="12" cy="16" r=".6" fill="#EF4444" />
                                </svg>
                            </div>
                            <div className="text-[16px] font-extrabold text-slate-800">Akses Ditolak</div>
                            <div className="text-[13px] text-slate-500 leading-relaxed">
                                Hanya <span className="font-semibold text-slate-700">Leader / Deputi</span> yang bisa membuka menu ini.
                            </div>
                            <button
                                onClick={() => navigate(-1)}
                                className="mt-1 w-full py-3 rounded-2xl bg-[#0B1739] text-white text-[13.5px] font-bold cursor-pointer transition hover:bg-[#1a2d5a]">
                                Kembali ke Beranda
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
