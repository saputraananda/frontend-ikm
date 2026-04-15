import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const IconMenu = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <line x1="3" y1="5" x2="17" y2="5" /><line x1="3" y1="10" x2="17" y2="10" /><line x1="3" y1="15" x2="17" y2="15" />
  </svg>
);
const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <line x1="4" y1="4" x2="16" y2="16" /><line x1="16" y1="4" x2="4" y2="16" />
  </svg>
);
const IconHome = () => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
    <path d="M7.5 18V12.5h5V18" />
  </svg>
);
const IconHistory = () => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="7.5" /><polyline points="10,6 10,10 13,12" />
  </svg>
);
const IconLogout = () => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 3H4a1 1 0 00-1 1v12a1 1 0 001 1h3" />
    <polyline points="14,7 17,10 14,13" /><line x1="17" y1="10" x2="7" y2="10" />
  </svg>
);

const initials = (name) => {
  if (!name) return '–';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
};

export default function Layout({ children, title = 'Attendance' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const clearAuth = useAuthStore(s => s.clearAuth);
  const authUser = useAuthStore(s => s.user);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.title = `${title} | E-Absensi IKM`;
    const link = document.querySelector("link[rel='icon']") || document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = '/favicon.svg';
    document.head.appendChild(link);
  }, [title]);

  const handleLogout = () => { clearAuth(); navigate('/login'); };
  const isActive = (p) => location.pathname === p;
  const close = () => setOpen(false);

  return (
    <div className="min-h-[100dvh] bg-slate-100">
      <div className="mx-auto max-w-[430px] min-h-[100dvh] bg-white flex flex-col shadow-[0_0_0_1px_rgba(0,0,0,.05),0_8px_48px_rgba(0,0,0,.07)]">

        {/* ── Header ── */}
        <header className="sticky top-0 z-20 bg-[#0B1739] h-14 px-4 flex items-center justify-between gap-3 border-b border-white/[.06]">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <button
              className="w-[34px] h-[34px] rounded-lg border border-white/10 bg-white/[.07] text-white/70 grid place-items-center cursor-pointer flex-shrink-0 transition hover:bg-white/15 hover:text-white"
              onClick={() => setOpen(true)} aria-label="Menu">
              <IconMenu />
            </button>
            <div className="min-w-0">
              <div className="text-[9.5px] font-semibold tracking-[.14em] uppercase text-blue-300 opacity-65">Sistem Absensi</div>
              <div className="text-[14px] font-bold text-white tracking-[-0.01em] truncate">{title}</div>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#1A336E] border-[1.5px] border-white/15 text-blue-100 text-[11px] font-bold grid place-items-center flex-shrink-0">
            {initials(authUser?.full_name || authUser?.name)}
          </div>
        </header>

        {/* ── Drawer overlay ── */}
        {open && (
          <div className="fixed inset-0 z-40 bg-[rgba(6,13,31,.6)] backdrop-blur-[3px] animate-fade-in" onClick={close} />
        )}

        {/* ── Drawer ── */}
        {open && (
          <aside className="fixed top-0 left-0 z-50 w-[268px] h-[100dvh] bg-white flex flex-col animate-slide-in border-r border-slate-200">
            <div className="bg-[#0B1739] px-4 pt-5 pb-[18px] flex items-start justify-between gap-2.5 border-b border-white/[.06]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#1A336E] border-[1.5px] border-white/15 text-blue-100 text-[13px] font-bold grid place-items-center flex-shrink-0">
                  {initials(authUser?.full_name || authUser?.name)}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-white truncate max-w-[148px]">{authUser?.full_name || authUser?.name || 'User'}</div>
                  <div className="text-[11px] text-white/40 truncate max-w-[148px] mt-0.5">{authUser?.email || '–'}</div>
                </div>
              </div>
              <button
                className="w-7 h-7 rounded-lg border border-white/10 bg-white/[.06] text-white/50 grid place-items-center cursor-pointer flex-shrink-0 transition hover:bg-white/14 hover:text-white"
                onClick={close} aria-label="Tutup">
                <IconClose />
              </button>
            </div>

            <nav className="p-2.5 flex-1 overflow-y-auto">
              <div className="text-[10px] font-semibold tracking-[.1em] uppercase text-slate-400 px-2 pb-2 pt-1">Menu Utama</div>
              {[
                { to: '/', label: 'Beranda', Icon: IconHome },
                { to: '/attendance', label: 'Absensi', Icon: IconHistory },
                { to: '/history', label: 'Riwayat Absensi', Icon: IconHistory },
              ].map(({ to, label, Icon }) => (
                <Link key={to} to={to} onClick={close}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-[13px] font-medium no-underline transition mb-0.5 ${isActive(to) ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}`}>
                  <span className={isActive(to) ? 'text-blue-600' : 'text-slate-400'}><Icon /></span>
                  {label}
                </Link>
              ))}
            </nav>

            <div className="p-2.5 border-t border-slate-200">
              <button
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 text-[12.5px] font-medium cursor-pointer transition hover:bg-red-100"
                onClick={() => { handleLogout(); close(); }}>
                <IconLogout /> Keluar dari Akun
              </button>
            </div>
          </aside>
        )}

        {/* ── Main content ── */}
        <main className="flex-1 px-[13px] pt-[14px] pb-[108px] flex flex-col gap-2.5">{children}</main>

        {/* ── Bottom nav ── */}
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center pointer-events-none">
          <div className="pointer-events-auto w-full max-w-[430px] bg-white/97 backdrop-blur-lg border-t border-slate-200 px-[13px] pt-2.5 pb-safe-10 shadow-[0_-1px_0_rgba(0,0,0,.04),0_-8px_24px_rgba(0,0,0,.05)]">
            <nav className="grid grid-cols-3 gap-1.5">
              {[
                { to: '/', label: 'Beranda', Icon: IconHome },
                { to: '/history', label: 'Riwayat', Icon: IconHistory },
                { to: '/profile', label: 'Profil', Icon: IconHome },
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