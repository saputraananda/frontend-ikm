import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import useAuthStore from '../store/authStore';

const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const fmtDateLong = (v) => {
  if (!v) return '–';
  const d = new Date(v);
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
};
const initials = name => (!name ? '?' : name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase());
const titleCase = s => (!s ? '' : s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()));

const IconHome = () => <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M7.5 18V12.5h5V18"/></svg>;
const IconHistory = () => <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="14" height="13" rx="2"/><line x1="3" y1="8" x2="17" y2="8"/><line x1="7" y1="2" x2="7" y2="5"/><line x1="13" y1="2" x2="13" y2="5"/></svg>;
const IconUser = () => <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="7" r="4"/><path d="M3 17c0-3 3.13-5 7-5s7 2 7 5"/></svg>;
const IconLogout = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3H4a1 1 0 00-1 1v12a1 1 0 001 1h3"/><polyline points="14,7 17,10 14,13"/><line x1="17" y1="10" x2="7" y2="10"/></svg>;

export default function ProfilePage() {
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const authUser = useAuthStore(s => s.user);
  const clearAuth = useAuthStore(s => s.clearAuth);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    api.get('/auth/profile')
      .then(r => setProfile(r.data.data))
      .catch(() => setProfile(authUser))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  const p = profile || authUser || {};
  const name = titleCase(p.full_name || p.name || 'User');

  const infoRows = [
    { label: 'Nama Lengkap',     value: p.full_name || p.name },
    { label: 'NIK / Kode',       value: p.employee_code },
    { label: 'Email',            value: p.email },
    { label: 'Username',         value: p.username },
    { label: 'No. HP',           value: p.phone_number },
    { label: 'Jenis Kelamin',    value: p.gender },
    { label: 'Tempat Lahir',     value: p.birth_place },
    { label: 'Tanggal Lahir',    value: fmtDateLong(p.birth_date) },
    { label: 'Alamat',           value: p.address },
    { label: 'Tanggal Bergabung',value: fmtDateLong(p.join_date) },
    { label: 'Role',             value: p.role },
  ].filter(r => r.value);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #F1F5F9; -webkit-font-smoothing: antialiased; }

        .pr-shell { min-height: 100dvh; background: #F1F5F9; display: flex; justify-content: center; }
        .pr-frame { width: 100%; max-width: 430px; min-height: 100dvh; background: #F8FAFC; display: flex; flex-direction: column; box-shadow: 0 0 0 1px rgba(0,0,0,.04), 0 8px 48px rgba(0,0,0,.08); overflow: hidden; }

        /* Hero */
        .pr-hero { background: linear-gradient(160deg, #0F172A 0%, #1E3A5F 35%, #1D4ED8 70%, #3B82F6 100%); padding: 24px 20px 32px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 12px; position: relative; overflow: hidden; border-radius: 0 0 32px 32px; }
        .pr-hero::before { content: ''; position: absolute; top: -60px; right: -40px; width: 180px; height: 180px; background: radial-gradient(circle, rgba(59,130,246,.25) 0%, transparent 70%); border-radius: 50%; }
        .pr-hero::after { content: ''; position: absolute; bottom: -30px; left: -30px; width: 120px; height: 120px; background: radial-gradient(circle, rgba(139,92,246,.15) 0%, transparent 70%); border-radius: 50%; }
        .pr-avatar { width: 72px; height: 72px; border-radius: 20px; background: rgba(255,255,255,.15); color: #fff; font-size: 22px; font-weight: 800; display: grid; place-items: center; border: 2.5px solid rgba(255,255,255,.25); box-shadow: 0 8px 24px rgba(0,0,0,.2); backdrop-filter: blur(8px); position: relative; z-index: 1; }
        .pr-name { font-size: 17px; font-weight: 800; color: #fff; text-align: center; position: relative; z-index: 1; }
        .pr-code { font-size: 11.5px; color: rgba(255,255,255,.45); font-weight: 500; letter-spacing: .04em; position: relative; z-index: 1; }
        .pr-role-badge { background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.15); border-radius: 100px; padding: 4px 12px; font-size: 11px; font-weight: 600; color: rgba(255,255,255,.7); position: relative; z-index: 1; }

        /* Content */
        .pr-content { flex: 1; overflow-y: auto; padding: 14px 13px 110px; display: flex; flex-direction: column; gap: 12px; }

        /* Card */
        .pr-card { background: #fff; border-radius: 20px; border: none; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.04), 0 0 0 1px rgba(0,0,0,.03); }
        .pr-card-title { font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: .08em; padding: 12px 16px 0; }

        /* Info row */
        .pr-row { padding: 11px 16px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; border-bottom: 1px solid #F8FAFC; }
        .pr-row:last-child { border-bottom: none; }
        .pr-row-label { font-size: 11.5px; font-weight: 600; color: #94A3B8; flex-shrink: 0; min-width: 110px; }
        .pr-row-value { font-size: 12.5px; font-weight: 600; color: #0F172A; text-align: right; word-break: break-word; }

        /* Skeleton */
        .pr-skeleton { height: 14px; border-radius: 7px; background: #F1F5F9; animation: prShimmer 1.3s ease infinite; }
        @keyframes prShimmer { 0%,100%{opacity:1} 50%{opacity:.45} }

        /* Logout button */
        .pr-logout { width: 100%; height: 50px; border-radius: 15px; border: 1.5px solid #FECDD3; background: #FFF1F2; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13.5px; font-weight: 700; color: #9F1239; transition: background .14s, border-color .14s; }
        .pr-logout:hover { background: #FFE4E6; border-color: #FCA5A5; }
        .pr-logout:active { transform: scale(.98); }

        /* Confirm modal */
        .pr-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 50; display: flex; align-items: flex-end; justify-content: center; animation: fadeIn .15s; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .pr-modal { background: #fff; border-radius: 24px 24px 0 0; padding: 24px 20px calc(env(safe-area-inset-bottom) + 20px); width: 100%; max-width: 430px; animation: slideUp .22s cubic-bezier(.22,.68,0,1.1); }
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        .pr-modal-title { font-size: 15px; font-weight: 800; color: #0F172A; text-align: center; margin-bottom: 6px; }
        .pr-modal-sub { font-size: 12.5px; color: #94A3B8; text-align: center; margin-bottom: 20px; font-weight: 500; }
        .pr-modal-btns { display: flex; flex-direction: column; gap: 8px; }
        .pr-modal-confirm { height: 48px; border-radius: 14px; border: none; background: linear-gradient(135deg, #9F1239, #F43F5E); color: #fff; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .pr-modal-cancel  { height: 48px; border-radius: 14px; border: 1.5px solid #E2E8F0; background: #F8FAFC; color: #64748B; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13.5px; font-weight: 600; cursor: pointer; }

        /* Bottom nav */
        .pr-bnav-wrap { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; display: flex; justify-content: center; pointer-events: none; width: 100%; }
        .pr-bnav { pointer-events: auto; width: 100%; max-width: 430px; background: rgba(255,255,255,.92); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-top: 1px solid rgba(226,232,240,.6); padding: 6px 20px calc(env(safe-area-inset-bottom) + 6px); box-shadow: 0 -4px 24px rgba(0,0,0,.06); }
        .pr-bnav-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; width: 100%; }
        .pr-bnav-item { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 8px 6px; border-radius: 14px; text-decoration: none; font-size: 10px; font-weight: 600; letter-spacing: .02em; color: #94A3B8; transition: all .2s ease; position: relative; }
        .pr-bnav-item:hover { color: #475569; }
        .pr-bnav-item.active { color: #1D4ED8; }
        .pr-bnav-item.active::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 20px; height: 3px; background: #1D4ED8; border-radius: 0 0 3px 3px; }
        .pr-bnav-item svg { opacity: .5; transition: opacity .15s; }
        .pr-bnav-item.active svg { stroke: #1D4ED8; opacity: 1; }
      `}</style>

      <div className="pr-shell">
        <div className="pr-frame">

          {/* ── Hero ── */}
          <div className="pr-hero">
            <div className="pr-avatar">{initials(name)}</div>
            <div style={{ textAlign:'center' }}>
              <div className="pr-name">{name}</div>
              {p.employee_code && <div className="pr-code">{p.employee_code}</div>}
            </div>
            {p.role && <div className="pr-role-badge">{p.role}</div>}
          </div>

          {/* ── Content ── */}
          <div className="pr-content">

            {loading
              ? <div className="pr-card" style={{ padding:16, display:'flex', flexDirection:'column', gap:12 }}>
                  {[120,80,100,90,110].map((w,i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div className="pr-skeleton" style={{ width:90 }} />
                      <div className="pr-skeleton" style={{ width:w }} />
                    </div>
                  ))}
                </div>
              : (
                <div className="pr-card">
                  <div className="pr-card-title">Informasi Karyawan</div>
                  {infoRows.map(({ label, value }) => (
                    <div key={label} className="pr-row">
                      <div className="pr-row-label">{label}</div>
                      <div className="pr-row-value">{value}</div>
                    </div>
                  ))}
                </div>
              )
            }

            {/* Logout */}
            <button className="pr-logout" onClick={() => setShowLogout(true)}>
              <IconLogout /> Keluar dari Akun
            </button>

            <div style={{ fontSize:11, color:'#CBD5E1', textAlign:'center', fontWeight:500 }}>
              © {new Date().getFullYear()} Part Of Alora Group Indonesia
            </div>
          </div>

          {/* ── Bottom nav ── */}
          <div className="pr-bnav-wrap">
            <div className="pr-bnav">
              <nav className="pr-bnav-grid">
                <Link to="/" className={`pr-bnav-item${routerLocation.pathname === '/' ? ' active' : ''}`}><IconHome /> Beranda</Link>
                <Link to="/history" className={`pr-bnav-item${routerLocation.pathname === '/history' ? ' active' : ''}`}><IconHistory /> Riwayat</Link>
                <Link to="/profile" className={`pr-bnav-item${routerLocation.pathname === '/profile' ? ' active' : ''}`}><IconUser /> Profil</Link>
              </nav>
            </div>
          </div>

        </div>
      </div>

      {/* ── Logout confirm modal ── */}
      {showLogout && (
        <div className="pr-overlay" onClick={() => setShowLogout(false)}>
          <div className="pr-modal" onClick={e => e.stopPropagation()}>
            <div className="pr-modal-title">Keluar dari akun?</div>
            <div className="pr-modal-sub">Anda perlu login kembali untuk mengakses aplikasi.</div>
            <div className="pr-modal-btns">
              <button className="pr-modal-confirm" onClick={handleLogout}>
                <IconLogout /> Ya, Keluar
              </button>
              <button className="pr-modal-cancel" onClick={() => setShowLogout(false)}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}