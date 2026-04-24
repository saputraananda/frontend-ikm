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

  useEffect(() => { document.title = 'Profil | IKM Mobile'; }, []);

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

  const isActive = (p) => routerLocation.pathname === p;

  return (
    <div className="min-h-[100dvh] bg-slate-100 flex justify-center">
      <div className="w-full max-w-[430px] min-h-[100dvh] bg-slate-50 flex flex-col shadow-[0_0_0_1px_rgba(0,0,0,.04),0_8px_48px_rgba(0,0,0,.08)] overflow-hidden">

        {/* ── Hero ── */}
        <div className="flex-shrink-0 flex flex-col items-center gap-3 px-5 pt-6 pb-8 rounded-b-[32px] relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1E3A5F 35%, #1D4ED8 70%, #3B82F6 100%)' }}>
          <div className="absolute -top-[60px] -right-[40px] w-[180px] h-[180px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,.25) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-[30px] -left-[30px] w-[120px] h-[120px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,.15) 0%, transparent 70%)' }} />

          <div className="relative z-[1] w-[72px] h-[72px] rounded-[20px] bg-white/15 border-[2.5px] border-white/25 text-white text-[22px] font-extrabold grid place-items-center shadow-[0_8px_24px_rgba(0,0,0,.2)] backdrop-blur-[8px] overflow-hidden">
            {p.profile_url
              ? <img src={p.profile_url} alt="foto" className="w-full h-full object-cover" />
              : initials(name)
            }
          </div>
          <div className="relative z-[1] text-center">
            <div className="text-[17px] font-extrabold text-white">{name}</div>
            {p.employee_code && <div className="text-[11.5px] text-white/45 font-medium tracking-[.04em] mt-0.5">{p.employee_code}</div>}
          </div>
          {p.role && (
            <div className="relative z-[1] bg-white/12 border border-white/15 rounded-full px-3 py-1 text-[11px] font-semibold text-white/70">
              {p.role}
            </div>
          )}
          {/* Edit button */}
          <Link to="/profile/edit"
            className="relative z-[1] mt-1 h-9 px-5 rounded-full bg-white/15 border border-white/20 text-white text-[12px] font-bold flex items-center gap-1.5 no-underline transition hover:bg-white/25 backdrop-blur-xl">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.5 2.5l4 4L6 18H2v-4L13.5 2.5z"/>
            </svg>
            Edit Profil
          </Link>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-[13px] pt-[14px] pb-[110px] flex flex-col gap-3">

          {loading
            ? <div className="bg-white rounded-[20px] p-4 flex flex-col gap-3">
                {[120, 80, 100, 90, 110].map((w, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="h-[14px] rounded-[7px] bg-slate-100 animate-shimmer" style={{ width: 90 }} />
                    <div className="h-[14px] rounded-[7px] bg-slate-100 animate-shimmer" style={{ width: w }} />
                  </div>
                ))}
              </div>
            : (
              <div className="bg-white rounded-[20px] shadow-[0_1px_4px_rgba(0,0,0,.04),0_0_0_1px_rgba(0,0,0,.03)] overflow-hidden">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-[.08em] px-4 pt-3">Informasi Karyawan</div>
                {infoRows.map(({ label, value }) => (
                  <div key={label} className="px-4 py-[11px] flex items-start justify-between gap-3 border-b border-slate-50 last:border-b-0">
                    <div className="text-[11.5px] font-semibold text-slate-400 flex-shrink-0 min-w-[110px]">{label}</div>
                    <div className="text-[12.5px] font-semibold text-slate-900 text-right break-words">{value}</div>
                  </div>
                ))}
              </div>
            )
          }

          {/* Logout */}
          <button
            className="w-full h-[50px] rounded-[15px] border-[1.5px] border-[#FECDD3] bg-[#FFF1F2] cursor-pointer flex items-center justify-center gap-2 text-[13.5px] font-bold text-[#9F1239] transition hover:bg-[#FFE4E6] hover:border-[#FCA5A5] active:scale-[.98]"
            onClick={() => setShowLogout(true)}>
            <IconLogout /> Keluar dari Akun
          </button>

          <div className="text-[11px] text-slate-300 text-center font-medium">
            © {new Date().getFullYear()} Part Of Alora Group Indonesia
          </div>
        </div>

        {/* ── Bottom nav ── */}
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center pointer-events-none">
          <div className="pointer-events-auto w-full max-w-[430px] bg-white/92 backdrop-blur-[20px] border-t border-slate-200/60 px-5 pt-1.5 pb-safe-6 shadow-[0_-4px_24px_rgba(0,0,0,.06)]">
            <nav className="grid grid-cols-3 gap-1">
              {[
                { to: '/', label: 'Beranda', Icon: IconHome },
                { to: '/history', label: 'Riwayat', Icon: IconHistory },
                { to: '/profile', label: 'Profil', Icon: IconUser },
              ].map(({ to, label, Icon }) => {
                const active = isActive(to);
                return (
                  <Link key={to} to={to}
                    className={`relative flex flex-col items-center gap-1 px-2 py-2 pb-1.5 rounded-[14px] no-underline text-[10px] font-semibold tracking-[.02em] transition ${active ? 'text-blue-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
                    {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-b-[3px] bg-blue-700"/>}
                    <Icon />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

      </div>

      {/* ── Logout confirm modal ── */}
      {showLogout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center animate-fade-in"
          onClick={() => setShowLogout(false)}>
          <div className="bg-white rounded-[24px_24px_0_0] px-5 pt-6 pb-safe-10 w-full max-w-[430px] animate-slide-up"
            onClick={e => e.stopPropagation()}>
            <div className="text-[15px] font-extrabold text-slate-900 text-center mb-1.5">Keluar dari akun?</div>
            <div className="text-[12.5px] text-slate-400 text-center mb-5 font-medium">Anda perlu login kembali untuk mengakses aplikasi.</div>
            <div className="flex flex-col gap-2">
              <button
                className="h-12 rounded-[14px] border-none text-white text-[13.5px] font-bold cursor-pointer flex items-center justify-center gap-2 transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #9F1239, #F43F5E)' }}
                onClick={handleLogout}>
                <IconLogout /> Ya, Keluar
              </button>
              <button
                className="h-12 rounded-[14px] border-[1.5px] border-slate-200 bg-slate-50 text-slate-500 text-[13.5px] font-semibold cursor-pointer transition hover:bg-slate-100"
                onClick={() => setShowLogout(false)}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}