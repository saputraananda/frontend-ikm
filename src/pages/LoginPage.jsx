import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import useAuthStore from '../store/authStore';
import ikmLogo from '/ikm.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { document.title = 'Login | IKM Mobile'; }, []);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', form);
      setAuth({ user: res.data.data.user, token: res.data.data.token });
      navigate('/');
    } catch (err) {
      if (err.response) {
        setError(err.response?.data?.message || `Login gagal (HTTP ${err.response.status})`);
      } else if (err.request) {
        setError(`Tidak bisa terhubung ke server. Pastikan HP & PC satu jaringan dan backend menyala. (${import.meta.env.VITE_API_URL})`);
      } else {
        setError(err?.message || 'Login gagal');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0B1739 0%, #0ea5e9 60%, #06b6d4 100%)' }}
    >
      {/* Decorative blobs */}
      <div className="absolute -top-[100px] -right-[80px] w-[360px] h-[360px] rounded-full bg-white/[.04] pointer-events-none" />
      <div className="absolute -bottom-[60px] -left-[60px] w-[240px] h-[240px] rounded-full bg-white/[.03] pointer-events-none" />

      <div className="w-full max-w-[400px] flex flex-col gap-6 relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-[72px] h-[72px] rounded-[22px] bg-white/10 backdrop-blur-xl border border-white/20 grid place-items-center shadow-[0_8px_32px_rgba(0,0,0,.2)]">
            <img src={ikmLogo} alt="IKM" className="w-11 h-11 object-contain" />
          </div>
          <div className="text-center">
            <div className="text-[22px] font-extrabold text-white tracking-tight">IKM Mobile</div>
            <div className="text-[13px] text-white/55 font-medium">Sistem Absensi Karyawan</div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[28px] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,.25),0_0_0_1px_rgba(255,255,255,.15)]">
          <div className="text-[17px] font-extrabold text-slate-900 mb-1">Selamat Datang 👋</div>
          <div className="text-[12.5px] text-slate-400 font-medium mb-5">Masuk dengan akun karyawan Anda</div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-[14px] px-[14px] py-3 text-[12px] text-red-800 leading-snug mb-[18px] font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div className="flex flex-col gap-1.5 mb-3.5">
              <label className="text-[12px] font-semibold text-slate-600">Username</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none grid place-items-center">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="10" cy="7" r="3"/><path d="M3 18c0-3.314 3.134-6 7-6s7 2.686 7 6"/>
                  </svg>
                </span>
                <input
                  className="w-full h-12 rounded-[14px] border border-slate-200 bg-slate-50 pl-11 pr-3 font-sans text-[13.5px] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-sky-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(14,165,233,.12)]"
                  type="text" name="username" value={form.username}
                  onChange={handleChange} placeholder="username"
                  autoComplete="username" required
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5 mb-3.5">
              <label className="text-[12px] font-semibold text-slate-600">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none grid place-items-center">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="9" width="12" height="9" rx="2"/><path d="M7 9V6a3 3 0 0 1 6 0v3"/>
                  </svg>
                </span>
                <input
                  className="w-full h-12 rounded-[14px] border border-slate-200 bg-slate-50 pl-11 pr-11 font-sans text-[13.5px] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-sky-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(14,165,233,.12)]"
                  type={showPass ? 'text' : 'password'} name="password" value={form.password}
                  onChange={handleChange} placeholder="••••••••"
                  autoComplete="current-password" required
                />
                <button type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-600 transition p-1 grid place-items-center"
                  onClick={() => setShowPass(p => !p)} tabIndex={-1}>
                  {showPass
                    ? <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="10" cy="10" r="2.5"/><line x1="2" y1="2" x2="18" y2="18"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="10" cy="10" r="2.5"/></svg>
                  }
                </button>
              </div>
            </div>

            <button type="submit"
              className="mt-2 w-full h-[50px] rounded-[15px] border-none text-[14px] font-bold text-white flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(14,165,233,.4)] transition hover:opacity-90 active:scale-[.985] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #0B1739 0%, #0ea5e9 100%)' }}
              disabled={loading}>
              {loading
                ? <div className="w-[18px] h-[18px] rounded-full border-[2.5px] border-white/30 border-t-white animate-spin" />
                : <>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 3h4a1 1 0 011 1v12a1 1 0 01-1 1h-4"/><polyline points="9,7 13,10 9,13"/><line x1="13" y1="10" x2="3" y2="10"/>
                    </svg>
                    Masuk
                  </>
              }
            </button>
          </form>
        </div>

        <div className="text-center text-[11.5px] text-white/35 font-medium">
          © {new Date().getFullYear()} Part Of Alora Group Indonesia
        </div>
      </div>
    </div>
  );
}