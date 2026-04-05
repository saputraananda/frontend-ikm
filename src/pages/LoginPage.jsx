import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import useAuthStore from '../store/authStore';
import ikmLogo from '../assets/ikm.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; -webkit-font-smoothing: antialiased; }

        .lp-shell {
          min-height: 100dvh;
          background: linear-gradient(160deg, #0B1739 0%, #0ea5e9 60%, #06b6d4 100%);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 24px 16px;
          position: relative; overflow: hidden;
        }
        .lp-blob1 {
          position: absolute; width: 360px; height: 360px; border-radius: 50%;
          background: rgba(255,255,255,.04); top: -100px; right: -80px;
          pointer-events: none;
        }
        .lp-blob2 {
          position: absolute; width: 240px; height: 240px; border-radius: 50%;
          background: rgba(255,255,255,.03); bottom: -60px; left: -60px;
          pointer-events: none;
        }

        .lp-frame {
          width: 100%; max-width: 400px;
          display: flex; flex-direction: column; gap: 24px;
          position: relative; z-index: 1;
        }

        /* Brand */
        .lp-brand { display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .lp-logo-wrap {
          width: 72px; height: 72px; border-radius: 22px;
          background: rgba(255,255,255,.12); backdrop-filter: blur(12px);
          border: 1.5px solid rgba(255,255,255,.2);
          display: grid; place-items: center;
          box-shadow: 0 8px 32px rgba(0,0,0,.2);
        }
        .lp-logo-wrap img { width: 44px; height: 44px; object-fit: contain; }
        .lp-title { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -.03em; text-align: center; }
        .lp-sub { font-size: 13px; color: rgba(255,255,255,.55); font-weight: 500; text-align: center; }

        /* Card */
        .lp-card {
          background: rgba(255,255,255,.97);
          border-radius: 28px;
          padding: 28px 24px;
          box-shadow: 0 24px 80px rgba(0,0,0,.25), 0 0 0 1px rgba(255,255,255,.15);
        }

        .lp-card-title { font-size: 17px; font-weight: 800; color: #0F172A; margin-bottom: 4px; }
        .lp-card-sub { font-size: 12.5px; color: #94A3B8; font-weight: 500; margin-bottom: 22px; }

        /* Error alert */
        .lp-error {
          background: #FEF2F2; border: 1px solid #FECACA; border-radius: 14px;
          padding: 12px 14px; font-size: 12px; color: #991B1B;
          line-height: 1.55; margin-bottom: 18px; font-weight: 500;
        }

        /* Field */
        .lp-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .lp-label { font-size: 12px; font-weight: 600; color: #475569; }
        .lp-input-wrap { position: relative; }
        .lp-input-icon {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          color: #94A3B8; display: grid; place-items: center; pointer-events: none;
        }
        .lp-input {
          width: 100%; height: 48px; border-radius: 14px;
          border: 1.5px solid #E2E8F0; background: #F8FAFC;
          padding: 0 44px 0 44px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13.5px; color: #0F172A; outline: none;
          transition: border-color .15s, box-shadow .15s, background .15s;
        }
        .lp-input::placeholder { color: #CBD5E1; }
        .lp-input:focus {
          border-color: #0ea5e9; background: #fff;
          box-shadow: 0 0 0 3px rgba(14,165,233,.12);
        }
        .lp-input-eye {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #94A3B8;
          display: grid; place-items: center; padding: 4px;
          transition: color .14s;
        }
        .lp-input-eye:hover { color: #64748B; }

        /* Submit */
        .lp-btn {
          margin-top: 8px; width: 100%; height: 50px; border-radius: 15px; border: none;
          background: linear-gradient(135deg, #0B1739 0%, #0ea5e9 100%);
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; font-weight: 700; color: #fff;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 4px 20px rgba(14,165,233,.4);
          transition: opacity .15s, transform .1s, box-shadow .15s;
        }
        .lp-btn:hover:not(:disabled) { opacity: .92; box-shadow: 0 6px 28px rgba(14,165,233,.5); }
        .lp-btn:active:not(:disabled) { transform: scale(.985); }
        .lp-btn:disabled { opacity: .6; cursor: not-allowed; }

        /* Spinner */
        @keyframes lpSpin { to { transform: rotate(360deg); } }
        .lp-spinner {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2.5px solid rgba(255,255,255,.3);
          border-top-color: #fff;
          animation: lpSpin .7s linear infinite;
        }

        /* Footer */
        .lp-footer { text-align: center; font-size: 11.5px; color: rgba(255,255,255,.35); font-weight: 500; }
      `}</style>

      <div className="lp-shell">
        <div className="lp-blob1" />
        <div className="lp-blob2" />

        <div className="lp-frame">
          {/* Brand */}
          <div className="lp-brand">
            <div className="lp-logo-wrap">
              <img src={ikmLogo} alt="IKM" />
            </div>
            <div>
              <div className="lp-title">IKM Mobile</div>
              <div className="lp-sub">Sistem Absensi Karyawan</div>
            </div>
          </div>

          {/* Card */}
          <div className="lp-card">
            <div className="lp-card-title">Selamat Datang 👋</div>
            <div className="lp-card-sub">Masuk dengan akun karyawan Anda</div>

            {error && <div className="lp-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="lp-field">
                <label className="lp-label">Username</label>
                <div className="lp-input-wrap">
                  <span className="lp-input-icon">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="10" cy="7" r="3"/>
                      <path d="M3 18c0-3.314 3.134-6 7-6s7 2.686 7 6"/>
                    </svg>
                  </span>
                  <input
                    className="lp-input"
                    type="text" name="username" value={form.username}
                    onChange={handleChange} placeholder="username"
                    autoComplete="username" required
                  />
                </div>
              </div>

              <div className="lp-field">
                <label className="lp-label">Password</label>
                <div className="lp-input-wrap">
                  <span className="lp-input-icon">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="9" width="12" height="9" rx="2"/>
                      <path d="M7 9V6a3 3 0 0 1 6 0v3"/>
                    </svg>
                  </span>
                  <input
                    className="lp-input"
                    type={showPass ? 'text' : 'password'} name="password" value={form.password}
                    onChange={handleChange} placeholder="••••••••"
                    autoComplete="current-password" required
                  />
                  <button type="button" className="lp-input-eye" onClick={() => setShowPass(p => !p)} tabIndex={-1}>
                    {showPass
                      ? <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="10" cy="10" r="2.5"/><line x1="2" y1="2" x2="18" y2="18"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="10" cy="10" r="2.5"/></svg>
                    }
                  </button>
                </div>
              </div>

              <button type="submit" className="lp-btn" disabled={loading}>
                {loading ? <div className="lp-spinner" /> : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 3h4a1 1 0 011 1v12a1 1 0 01-1 1h-4"/><polyline points="9,7 13,10 9,13"/><line x1="13" y1="10" x2="3" y2="10"/>
                    </svg>
                    Masuk
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="lp-footer">© {new Date().getFullYear()} Part Of Alora Group Indonesia</div>
        </div>
      </div>
    </>
  );
}