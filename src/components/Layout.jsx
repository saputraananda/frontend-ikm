import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const IconMenu = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <line x1="3" y1="5" x2="17" y2="5"/><line x1="3" y1="10" x2="17" y2="10"/><line x1="3" y1="15" x2="17" y2="15"/>
  </svg>
);
const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/>
  </svg>
);
const IconHome = () => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
    <path d="M7.5 18V12.5h5V18"/>
  </svg>
);
const IconHistory = () => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="7.5"/><polyline points="10,6 10,10 13,12"/>
  </svg>
);
const IconLogout = () => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 3H4a1 1 0 00-1 1v12a1 1 0 001 1h3"/>
    <polyline points="14,7 17,10 14,13"/><line x1="17" y1="10" x2="7" y2="10"/>
  </svg>
);

export const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --navy-950: #060D1F;
    --navy-900: #0B1739;
    --navy-800: #112154;
    --navy-700: #1A336E;
    --navy-600: #1E3A8A;
    --navy-500: #1D4ED8;
    --navy-400: #3B82F6;
    --navy-300: #93C5FD;
    --navy-100: #DBEAFE;
    --navy-50:  #EFF6FF;

    --n-900: #0F172A;
    --n-800: #1E293B;
    --n-700: #334155;
    --n-500: #64748B;
    --n-400: #94A3B8;
    --n-200: #E2E8F0;
    --n-100: #F1F5F9;
    --n-50:  #F8FAFC;
    --white: #FFFFFF;

    --success:        #059669;
    --success-bg:     #ECFDF5;
    --success-border: #A7F3D0;
    --warning:        #D97706;
    --warning-bg:     #FFFBEB;
    --warning-border: #FDE68A;
    --danger:         #DC2626;
    --danger-bg:      #FEF2F2;
    --danger-border:  #FECACA;

    --font:      'Plus Jakarta Sans', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;

    --r-sm: 8px; --r-md: 12px; --r-lg: 16px; --r-xl: 20px; --r-2xl: 24px;
    --shadow-card: 0 1px 3px rgba(0,0,0,.06), 0 0 0 1px rgba(15,23,42,.06);
  }

  body { font-family: var(--font); background: var(--n-100); color: var(--n-900); -webkit-font-smoothing: antialiased; }

  .shell { min-height: 100dvh; background: var(--n-100); }
  .frame {
    margin: 0 auto; max-width: 430px; min-height: 100dvh;
    background: var(--white); display: flex; flex-direction: column;
    box-shadow: 0 0 0 1px rgba(0,0,0,.05), 0 8px 48px rgba(0,0,0,.07);
  }

  /* Header */
  .app-header {
    position: sticky; top: 0; z-index: 20;
    background: var(--navy-900);
    padding: 0 16px; height: 56px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    border-bottom: 1px solid rgba(255,255,255,.06);
  }
  .header-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
  .menu-btn {
    width: 34px; height: 34px; border-radius: var(--r-sm);
    border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.07);
    color: rgba(255,255,255,.7); display: grid; place-items: center;
    cursor: pointer; flex-shrink: 0; transition: background .15s, color .15s;
  }
  .menu-btn:hover { background: rgba(255,255,255,.15); color: var(--white); }
  .header-brand { font-size: 9.5px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--navy-300); opacity: .65; }
  .header-title { font-size: 14px; font-weight: 700; color: var(--white); letter-spacing: -.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .header-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: var(--navy-700); border: 1.5px solid rgba(255,255,255,.15);
    color: var(--navy-100); font-size: 11px; font-weight: 700;
    display: grid; place-items: center; flex-shrink: 0;
  }

  /* Drawer */
  .drawer-overlay {
    position: fixed; inset: 0; z-index: 40;
    background: rgba(6,13,31,.6); backdrop-filter: blur(3px);
    animation: fadeIn .2s ease;
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes slideIn { from{transform:translateX(-100%)} to{transform:translateX(0)} }

  .drawer {
    position: fixed; top: 0; left: 0; z-index: 50;
    width: 268px; height: 100dvh; background: var(--white);
    display: flex; flex-direction: column;
    animation: slideIn .24s cubic-bezier(.22,.68,0,1.1);
    border-right: 1px solid var(--n-200);
  }
  .drawer-head {
    background: var(--navy-900); padding: 20px 16px 18px;
    border-bottom: 1px solid rgba(255,255,255,.06);
    display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
  }
  .drawer-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: var(--navy-700); border: 1.5px solid rgba(255,255,255,.15);
    color: var(--navy-100); font-size: 13px; font-weight: 700;
    display: grid; place-items: center; flex-shrink: 0;
  }
  .drawer-name { font-size: 13px; font-weight: 700; color: var(--white); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 148px; }
  .drawer-email { font-size: 11px; color: rgba(255,255,255,.4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 148px; margin-top: 2px; }
  .drawer-close {
    width: 28px; height: 28px; border-radius: var(--r-sm);
    border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.06);
    color: rgba(255,255,255,.5); display: grid; place-items: center;
    cursor: pointer; flex-shrink: 0; transition: background .14s;
  }
  .drawer-close:hover { background: rgba(255,255,255,.14); color: var(--white); }

  .drawer-nav { padding: 10px; flex: 1; overflow-y: auto; }
  .drawer-label { font-size: 10px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: var(--n-400); padding: 4px 8px 8px; }
  .nav-link {
    display: flex; align-items: center; gap: 9px; padding: 9px 10px;
    border-radius: var(--r-md); font-size: 13px; font-weight: 500;
    color: var(--n-700); text-decoration: none;
    transition: background .14s, color .14s; margin-bottom: 2px;
  }
  .nav-link:hover { background: var(--n-100); color: var(--n-900); }
  .nav-link.active { background: var(--navy-50); color: var(--navy-600); font-weight: 600; }
  .nav-icon { flex-shrink: 0; color: var(--n-400); }
  .nav-link.active .nav-icon { color: var(--navy-500); }

  .drawer-footer { padding: 10px; border-top: 1px solid var(--n-200); }
  .logout-btn {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 7px;
    padding: 9px 12px; border-radius: var(--r-md);
    border: 1px solid var(--danger-border); background: var(--danger-bg);
    color: var(--danger); font-size: 12.5px; font-weight: 500;
    font-family: var(--font); cursor: pointer; transition: background .14s;
  }
  .logout-btn:hover { background: #FECACA; }

  /* Main */
  .app-main { flex: 1; padding: 14px 13px 108px; display: flex; flex-direction: column; gap: 10px; }

  /* Bottom Nav */
  .bnav-wrap { position: fixed; inset-x: 0; bottom: 0; z-index: 30; display: flex; justify-content: center; pointer-events: none; }
  .bnav {
    pointer-events: auto; width: 100%; max-width: 430px;
    background: rgba(255,255,255,.97); backdrop-filter: blur(14px);
    border-top: 1px solid var(--n-200);
    padding: 10px 13px calc(env(safe-area-inset-bottom) + 10px);
    box-shadow: 0 -1px 0 rgba(0,0,0,.04), 0 -8px 24px rgba(0,0,0,.05);
  }
  .bnav-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
  .bnav-item {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 9px; border-radius: var(--r-md);
    text-decoration: none; font-size: 10.5px; font-weight: 500;
    color: var(--n-400); transition: background .14s, color .14s;
  }
  .bnav-item:hover { background: var(--n-100); color: var(--n-900); }
  .bnav-item.active { background: var(--navy-900); color: var(--white); }
  .bnav-item.active svg { stroke: var(--white); opacity: 1; }
  .bnav-item svg { opacity: .55; }
`;

const initials = (name) => {
  if (!name) return '–';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
};

export default function Layout({ children, title = 'Attendance' }) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const clearAuth  = useAuthStore(s => s.clearAuth);
  const authUser   = useAuthStore(s => s.user);
  const [open, setOpen] = useState(false);

  const handleLogout = () => { clearAuth(); navigate('/login'); };
  const isActive = (p) => location.pathname === p;
  const close = () => setOpen(false);

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <div className="shell">
        <div className="frame">

          <header className="app-header">
            <div className="header-left">
              <button className="menu-btn" onClick={() => setOpen(true)} aria-label="Menu">
                <IconMenu />
              </button>
              <div style={{ minWidth: 0 }}>
                <div className="header-brand">Sistem Absensi</div>
                <div className="header-title">{title}</div>
              </div>
            </div>
            <div className="header-avatar">{initials(authUser?.full_name || authUser?.name)}</div>
          </header>

          {open && <div className="drawer-overlay" onClick={close} />}

          {open && (
            <aside className="drawer">
              <div className="drawer-head">
                <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                  <div className="drawer-avatar">{initials(authUser?.full_name || authUser?.name)}</div>
                  <div style={{ minWidth:0 }}>
                    <div className="drawer-name">{authUser?.full_name || authUser?.name || 'User'}</div>
                    <div className="drawer-email">{authUser?.email || '–'}</div>
                  </div>
                </div>
                <button className="drawer-close" onClick={close} aria-label="Tutup"><IconClose /></button>
              </div>
              <nav className="drawer-nav">
                <div className="drawer-label">Menu Utama</div>
                <Link to="/" onClick={close} className={`nav-link${isActive('/') ? ' active' : ''}`}>
                  <span className="nav-icon"><IconHome /></span> Beranda
                </Link>
                <Link to="/attendance" onClick={close} className={`nav-link${isActive('/attendance') ? ' active' : ''}`}>
                  <span className="nav-icon"><IconHistory /></span> Absensi
                </Link>
                <Link to="/history" onClick={close} className={`nav-link${isActive('/history') ? ' active' : ''}`}>
                  <span className="nav-icon"><IconHistory /></span> Riwayat Absensi
                </Link>
              </nav>
              <div className="drawer-footer">
                <button className="logout-btn" onClick={() => { handleLogout(); close(); }}>
                  <IconLogout /> Keluar dari Akun
                </button>
              </div>
            </aside>
          )}

          <main className="app-main">{children}</main>

          <div className="bnav-wrap">
            <div className="bnav">
              <nav className="bnav-grid">
                <Link to="/" className={`bnav-item${isActive('/') ? ' active' : ''}`}>
                  <IconHome /> Beranda
                </Link>
                <Link to="/history" className={`bnav-item${isActive('/history') ? ' active' : ''}`}>
                  <IconHistory /> Riwayat
                </Link>
                <Link to="/profile" className={`bnav-item${isActive('/profile') ? ' active' : ''}`}>
                  <IconHome /> Profil
                </Link>
              </nav>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}