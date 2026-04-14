import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import useAuthStore from '../store/authStore';

const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const fmt2 = n => String(n).padStart(2, '0');
const initials = name => (!name ? '?' : name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase());
const titleCase = s => (!s ? '' : s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()));
const greeting = () => { const h = new Date().getHours(); if (h < 11) return 'Selamat Pagi'; if (h < 15) return 'Selamat Siang'; if (h < 18) return 'Selamat Sore'; return 'Selamat Malam'; };
const greetEmoji = () => { const h = new Date().getHours(); if (h < 11) return '☀️'; if (h < 15) return '🌤️'; if (h < 18) return '🌅'; return '🌙'; };

function ProgressRing({ done, total, size = 56 }) {
    const stroke = 5;
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const pct = total > 0 ? done / total : 0;
    const offset = circ * (1 - pct);
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth={stroke}/>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#fff" strokeWidth={stroke}
                strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset .6s ease' }}/>
            <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" fill="#fff"
                fontSize="14" fontWeight="800" style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}>
                {done}/{total}
            </text>
        </svg>
    );
}

const IconHome = () => (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M7.5 18V12.5h5V18"/>
    </svg>
);
const IconHistory = () => (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="14" height="13" rx="2"/>
        <line x1="3" y1="8" x2="17" y2="8"/><line x1="7" y1="2" x2="7" y2="5"/><line x1="13" y1="2" x2="13" y2="5"/>
    </svg>
);
const IconUser = () => (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="7" r="4"/><path d="M3 17c0-3 3.13-5 7-5s7 2 7 5"/>
    </svg>
);

const MENU_ITEMS = [
    { key: 'absensi', label: 'Absensi', to: '/attendance',
      icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
      bg: 'linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%)' },
        { key: 'valet', label: 'Valet', to: '/valet',
            icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 16v3"/><path d="M19 16v3"/><path d="M2 12h20"/><path d="M6 12l1.5-4.5A2 2 0 019.4 6h5.2a2 2 0 011.9 1.5L18 12"/><circle cx="7" cy="16" r="1.5"/><circle cx="17" cy="16" r="1.5"/></svg>,
            bg: 'linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)' },
        { key: 'riwayat', label: 'Riwayat', to: '/history',
            icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12,7 12,12 15,14"/></svg>,
            bg: 'linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%)' },
        { key: 'profil', label: 'Profil', to: '/profile',
            icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.58-6 8-6s8 2 8 6"/></svg>,
            bg: 'linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 100%)' },
        { key: 'leader', label: 'Leader', to: '/report',
            icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>,
            bg: 'linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%)' },
        { key: 'tentang-aplikasi', label: 'Tentang Aplikasi', to: '/about',
            icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5" fill="#6366F1"/></svg>,
            bg: 'linear-gradient(135deg, #E0E7FF 0%, #EEF2FF 100%)' },
];

const SHIFT_META = {
    pagi:   { label: 'Pagi',   bg: '#FFFBEB', icon: '🌅' },
    siang:  { label: 'Siang',  bg: '#EFF6FF', icon: '☀️' },
    sore:   { label: 'Sore',   bg: '#F5F3FF', icon: '🌆' },
    lembur: { label: 'Lembur', bg: '#FFF1F2', icon: '🌙' },
};

export default function HomePage() {
    const routerLocation = useLocation();
    const authUser = useAuthStore(s => s.user);
    const [profile, setProfile] = useState(authUser || null);
    const [now, setNow] = useState(new Date());
    const [todayShifts, setTodayShifts] = useState(null);

    const displayName = titleCase(profile?.full_name || profile?.name || authUser?.full_name || authUser?.name || 'User');
    const role = profile?.position || profile?.department || 'Karyawan';
    const empId = profile?.employee_code || profile?.employee_id || '';

    useEffect(() => { document.title = 'Beranda | IKM Mobile'; }, []);
    useEffect(() => {
        api.get('/auth/profile').then(r => setProfile(r.data.data)).catch(() => {});
        api.get('/attendance/today-shifts').then(r => setTodayShifts(r.data.data || {})).catch(() => {});
    }, []);
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const liveTime = `${fmt2(now.getHours())}:${fmt2(now.getMinutes())}:${fmt2(now.getSeconds())}`;

    const shiftSummary = (() => {
        if (!todayShifts) return null;
        const keys = ['pagi', 'siang', 'sore', 'lembur'];
        const done = keys.filter(k => todayShifts[k]?.check_in_time);
        return { total: keys.length, done: done.length, todayShifts, keys };
    })();

    const formatShiftTime = useCallback((v) => {
        if (!v) return null;
        const d = new Date(v);
        return `${fmt2(d.getHours())}:${fmt2(d.getMinutes())}`;
    }, []);

    const isActive = (p) => routerLocation.pathname === p;

    return (
        <div className="min-h-[100dvh] bg-slate-100 flex justify-center">
            <div className="w-full max-w-[430px] min-h-[100dvh] bg-slate-50 flex flex-col shadow-[0_0_0_1px_rgba(0,0,0,.04),0_8px_48px_rgba(0,0,0,.08)] relative overflow-hidden">

                {/* Hero */}
                <div className="relative overflow-hidden rounded-b-[32px] flex-shrink-0 pb-[30px]"
                    style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1E3A5F 35%, #1D4ED8 70%, #3B82F6 100%)' }}>
                    {/* Decorative blobs */}
                    <div className="absolute -top-[80px] -right-[50px] w-[220px] h-[220px] rounded-full animate-pulse"
                        style={{ background: 'radial-gradient(circle, rgba(59,130,246,.25) 0%, transparent 70%)' }} />
                    <div className="absolute -bottom-[40px] -left-[40px] w-[160px] h-[160px] rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(139,92,246,.15) 0%, transparent 70%)' }} />
                    {/* Dot pattern */}
                    <div className="absolute inset-0 pointer-events-none opacity-[.04]"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                    {/* Top row */}
                    <div className="relative z-[1] flex items-center justify-between px-5 pt-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-[46px] h-[46px] rounded-[14px] bg-white/15 border-2 border-white/25 text-white text-[14px] font-extrabold grid place-items-center flex-shrink-0 backdrop-blur-xl">
                                {initials(displayName)}
                            </div>
                            <div className="min-w-0 overflow-hidden">
                                <div className="text-[15px] font-extrabold text-white truncate tracking-[-0.2px]">{displayName}</div>
                                <div className="text-[11px] text-white/55 font-medium truncate mt-0.5">{role}{empId && ` · ${empId}`}</div>
                            </div>
                        </div>
                        <button className="w-[38px] h-[38px] rounded-[12px] bg-white/10 border border-white/12 text-white grid place-items-center cursor-pointer transition hover:bg-white/20 backdrop-blur-xl flex-shrink-0"
                            aria-label="Notifikasi">
                            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10 2a5 5 0 0 1 5 5c0 5 2 6 2 6H3s2-1 2-6a5 5 0 0 1 5-5z"/>
                                <path d="M8.5 17a1.5 1.5 0 0 0 3 0"/>
                            </svg>
                        </button>
                    </div>

                    {/* Clock + greeting */}
                    <div className="relative z-[1] flex items-center justify-between px-5 pt-5">
                        <div className="flex-1">
                            <div className="flex items-center gap-1.5 text-[13px] text-white/60 font-medium">{greeting()} {greetEmoji()}</div>
                            <div className="font-mono text-[28px] font-bold text-white tracking-[-1px] mt-1 leading-[1.1]">{liveTime}</div>
                            <div className="text-[12px] text-white/45 font-medium mt-1.5">{DAYS_ID[now.getDay()]}, {now.getDate()} {MONTHS_ID[now.getMonth()]} {now.getFullYear()}</div>
                        </div>
                        {shiftSummary && <ProgressRing done={shiftSummary.done} total={shiftSummary.total} />}
                    </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto pb-[100px]">

                    {/* Menu card */}
                    <div className="mx-4 mt-[14px] bg-white rounded-[22px] px-[14px] pt-5 pb-4 shadow-[0_8px_32px_rgba(0,0,0,.08),0_0_0_1px_rgba(0,0,0,.03)] animate-fade-up">
                        <div className="text-[14px] font-extrabold text-slate-900 tracking-[-0.2px] px-1.5 pb-3.5">Menu Utama</div>
                        <div className="grid grid-cols-3 gap-1.5">
                            {MENU_ITEMS.map((item) =>
                                item.to ? (
                                    <Link key={item.key} to={item.to}
                                        className="flex flex-col items-center gap-2 py-3.5 px-1.5 rounded-[16px] no-underline cursor-pointer transition hover:bg-slate-50 hover:-translate-y-0.5 active:scale-[.95]">
                                        <div className="w-[50px] h-[50px] rounded-[16px] grid place-items-center flex-shrink-0 transition hover:scale-[1.06]"
                                            style={{ background: item.bg }}>{item.icon}</div>
                                        <span className="text-[11px] font-semibold text-slate-500 text-center leading-snug">{item.label}</span>
                                    </Link>
                                ) : (
                                    <button key={item.key}
                                        onClick={() => {}}
                                        className="flex flex-col items-center gap-2 py-3.5 px-1.5 rounded-[16px] bg-transparent border-none font-[inherit] cursor-pointer transition hover:bg-slate-50 hover:-translate-y-0.5 active:scale-[.95]">
                                        <div className="w-[50px] h-[50px] rounded-[16px] grid place-items-center flex-shrink-0"
                                            style={{ background: item.bg }}>{item.icon}</div>
                                        <span className="text-[11px] font-semibold text-slate-500 text-center leading-snug">{item.label}</span>
                                    </button>
                                )
                            )}
                        </div>
                    </div>

                    {/* Quick action banner */}
                    <div className="px-4 pt-[18px]">
                        <Link to="/attendance"
                            className="relative overflow-hidden rounded-[20px] px-5 py-[18px] flex items-center gap-4 no-underline cursor-pointer transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,.25)] active:scale-[.98] shadow-[0_8px_24px_rgba(15,23,42,.2)] animate-fade-up"
                            style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #1D4ED8 100%)' }}>
                            <div className="absolute -top-5 -right-5 w-[100px] h-[100px] rounded-full"
                                style={{ background: 'radial-gradient(circle, rgba(59,130,246,.2) 0%, transparent 70%)' }} />
                            <div className="relative z-[1] w-12 h-12 rounded-[14px] bg-blue-500/15 border border-blue-500/25 grid place-items-center flex-shrink-0">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                                </svg>
                            </div>
                            <div className="relative z-[1] flex-1">
                                <div className="text-[14px] font-extrabold text-white tracking-[-0.2px]">Absen Sekarang</div>
                                <div className="text-[11.5px] text-white/45 font-medium mt-0.5">Lakukan absensi shift hari ini</div>
                            </div>
                            <div className="relative z-[1] w-8 h-8 rounded-[10px] bg-white/8 grid place-items-center text-white/50 flex-shrink-0">
                                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="8,5 13,10 8,15"/>
                                </svg>
                            </div>
                        </Link>
                    </div>

                    {/* Progress */}
                    {shiftSummary && (
                        <div className="px-4 pt-[18px] animate-fade-up">
                            <div className="bg-white rounded-[16px] p-4 shadow-[0_1px_3px_rgba(0,0,0,.04),0_0_0_1px_rgba(0,0,0,.03)]">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[12px] font-semibold text-slate-500">Progress Hari Ini</span>
                                    <span className="text-[12px] font-extrabold text-slate-900">{shiftSummary.done} / {shiftSummary.total} shift</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-[600ms]"
                                        style={{ width: `${(shiftSummary.done / shiftSummary.total) * 100}%`, background: 'linear-gradient(90deg, #3B82F6, #1D4ED8)' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Shift timeline */}
                    <div className="px-4 pt-[18px] animate-fade-up">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[14px] font-extrabold text-slate-900 tracking-[-0.2px]">Absensi Hari Ini</span>
                            <Link to="/history" className="text-[11.5px] font-semibold text-blue-500 no-underline px-2.5 py-1 rounded-lg transition hover:bg-blue-50">Lihat Semua</Link>
                        </div>

                        {shiftSummary ? (
                            <div className="flex flex-col gap-2">
                                {shiftSummary.keys.map(k => {
                                    const s = shiftSummary.todayShifts[k];
                                    const hasIn  = s?.check_in_time;
                                    const hasOut = s?.check_out_time;
                                    const isComplete = hasIn && hasOut;
                                    const meta = SHIFT_META[k];
                                    const inTime  = hasIn  ? formatShiftTime(s.check_in_time)  : null;
                                    const outTime = hasOut ? formatShiftTime(s.check_out_time) : null;

                                    const barColor    = isComplete ? 'bg-emerald-400' : hasIn ? 'bg-amber-400' : 'bg-slate-200';
                                    const borderColor = isComplete ? 'border-emerald-100' : hasIn ? 'border-amber-100' : 'border-transparent';
                                    const badgeClass  = isComplete
                                        ? 'bg-emerald-50 text-emerald-800'
                                        : hasIn
                                        ? 'bg-amber-50 text-amber-700'
                                        : 'bg-slate-100 text-slate-400';

                                    return (
                                        <div key={k} className={`relative overflow-hidden flex items-center gap-3 px-4 py-3.5 bg-white rounded-[16px] border shadow-[0_1px_3px_rgba(0,0,0,.04)] transition ${borderColor}`}>
                                            {/* left accent bar */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-r-[4px] ${barColor}`} />
                                            <div className="w-10 h-10 rounded-[12px] grid place-items-center flex-shrink-0 text-[20px]"
                                                style={{ background: meta.bg }}>{meta.icon}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[13px] font-bold text-slate-900">Shift {meta.label}</div>
                                                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 mt-0.5">
                                                    {hasIn ? (
                                                        <>
                                                            <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="#94A3B8" strokeWidth="2"><circle cx="10" cy="10" r="7"/><polyline points="10,6 10,10 13,12"/></svg>
                                                            <span className="font-mono text-[10.5px] font-semibold">{inTime}</span>
                                                            {outTime
                                                                ? <><span className="text-slate-300">→</span><span className="font-mono text-[10.5px] font-semibold">{outTime}</span></>
                                                                : <span className="text-amber-400 font-semibold">· Belum keluar</span>
                                                            }
                                                        </>
                                                    ) : <span>Belum absen</span>}
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0 ${badgeClass}`}>
                                                {isComplete ? (
                                                    <><svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3,8 6.5,11.5 13,5"/></svg>Hadir</>
                                                ) : hasIn ? (
                                                    <><svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="8,3 8,8"/><circle cx="8" cy="11" r="1" fill="currentColor" stroke="none"/></svg>Masuk</>
                                                ) : 'Belum'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-white rounded-[20px] px-5 py-8 text-center shadow-[0_1px_4px_rgba(0,0,0,.04),0_0_0_1px_rgba(0,0,0,.03)]">
                                <div className="w-16 h-16 rounded-[20px] bg-slate-50 grid place-items-center mx-auto mb-3.5">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="4" width="18" height="16" rx="2"/>
                                        <line x1="3" y1="10" x2="21" y2="10"/>
                                        <line x1="9" y1="2" x2="9" y2="6"/>
                                        <line x1="15" y1="2" x2="15" y2="6"/>
                                    </svg>
                                </div>
                                <div className="text-[14px] font-extrabold text-slate-800 mb-1">Belum Ada Absensi</div>
                                <div className="text-[12px] text-slate-400 font-medium leading-relaxed">Belum ada absensi tercatat hari ini</div>
                            </div>
                        )}
                    </div>

                    <div className="h-5" />
                </div>

                {/* Bottom nav */}
                <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center pointer-events-none">
                    <div className="pointer-events-auto w-full max-w-[430px] bg-white/92 backdrop-blur-[20px] border-t border-slate-200/60 px-5 pt-1.5 pb-safe-6 shadow-[0_-4px_24px_rgba(0,0,0,.06)]">
                        <nav className="grid grid-cols-3 gap-1">
                            {[{ to: '/', label: 'Beranda', Icon: IconHome }, { to: '/history', label: 'Riwayat', Icon: IconHistory }, { to: '/profile', label: 'Profil', Icon: IconUser }].map(({ to, label, Icon }) => {
                                const active = isActive(to);
                                return (
                                    <Link key={to} to={to}
                                        className={`relative flex flex-col items-center gap-1 px-2 py-2 pb-1.5 rounded-[14px] no-underline text-[10px] font-semibold tracking-[.02em] transition ${active ? 'text-blue-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
                                        {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-b-[3px] bg-blue-700" />}
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
