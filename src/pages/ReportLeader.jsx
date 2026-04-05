import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GLOBAL_STYLES } from '../components/Layout';

/* ── Styles ──────────────────────────────────────────────────────── */
const styles = `
  .report-form {
    display: flex; flex-direction: column; gap: 20px;
    animation: formFadeIn .4s ease;
  }
  @keyframes formFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

  /* Header Banner */
  .form-banner {
    background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%);
    border-radius: var(--r-xl); padding: 22px 20px;
    color: #fff; position: relative; overflow: hidden;
  }
  .form-banner::after {
    content: ''; position: absolute; top: -30px; right: -30px;
    width: 100px; height: 100px; border-radius: 50%;
    background: rgba(255,255,255,.08);
  }
  .form-banner-icon { font-size: 28px; margin-bottom: 8px; }
  .form-banner h2 { font-size: 17px; font-weight: 700; margin-bottom: 4px; }
  .form-banner p { font-size: 12px; opacity: .75; line-height: 1.5; }

  /* Section Card */
  .form-section {
    background: var(--white); border-radius: var(--r-xl);
    border: 1px solid var(--n-200); padding: 18px 16px;
    box-shadow: var(--shadow-card);
  }
  .form-section-title {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; font-weight: 700; color: var(--n-900);
    margin-bottom: 14px; padding-bottom: 10px;
    border-bottom: 1px solid var(--n-200);
  }
  .form-section-title .dot {
    width: 7px; height: 7px; border-radius: 50%;
    flex-shrink: 0;
  }

  /* Input Group */
  .fg { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
  .fg:last-child { margin-bottom: 0; }
  .fg label {
    font-size: 12px; font-weight: 600; color: var(--n-700);
    display: flex; align-items: center; gap: 4px;
  }
  .fg label .req { color: #EF4444; font-size: 13px; }
  .fg input, .fg select, .fg textarea {
    width: 100%; padding: 10px 12px;
    border: 1px solid var(--n-200); border-radius: var(--r-md);
    font-family: var(--font); font-size: 13px; color: var(--n-900);
    background: var(--n-50); outline: none;
    transition: border-color .2s, box-shadow .2s;
  }
  .fg input:focus, .fg select:focus, .fg textarea:focus {
    border-color: var(--navy-400);
    box-shadow: 0 0 0 3px rgba(59,130,246,.12);
    background: var(--white);
  }
  .fg input::placeholder, .fg textarea::placeholder { color: var(--n-400); }
  .fg textarea { resize: vertical; min-height: 80px; }
  .fg select { appearance: none; cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 12px center;
    padding-right: 32px;
  }
  .fg .hint { font-size: 11px; color: var(--n-400); margin-top: 2px; }

  /* Radio Group */
  .radio-group { display: flex; flex-direction: column; gap: 8px; }
  .radio-option {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: var(--r-md);
    border: 1px solid var(--n-200); background: var(--n-50);
    cursor: pointer; transition: all .2s;
  }
  .radio-option:hover { border-color: var(--navy-300); background: var(--navy-50); }
  .radio-option.selected { border-color: var(--navy-400); background: var(--navy-50); box-shadow: 0 0 0 3px rgba(59,130,246,.1); }
  .radio-option input[type="radio"] { display: none; }
  .radio-dot {
    width: 18px; height: 18px; border-radius: 50%;
    border: 2px solid var(--n-300); flex-shrink: 0;
    display: grid; place-items: center; transition: all .2s;
  }
  .radio-option.selected .radio-dot {
    border-color: var(--navy-500);
  }
  .radio-dot::after {
    content: ''; width: 8px; height: 8px; border-radius: 50%;
    background: transparent; transition: background .2s;
  }
  .radio-option.selected .radio-dot::after { background: var(--navy-500); }
  .radio-label { font-size: 13px; font-weight: 500; color: var(--n-700); }
  .radio-desc { font-size: 11px; color: var(--n-400); margin-top: 1px; }

  /* Checkbox Group */
  .check-group { display: flex; flex-direction: column; gap: 8px; }
  .check-option {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 10px 12px; border-radius: var(--r-md);
    border: 1px solid var(--n-200); background: var(--n-50);
    cursor: pointer; transition: all .2s;
  }
  .check-option:hover { border-color: var(--navy-300); background: var(--navy-50); }
  .check-option.selected { border-color: #059669; background: #ECFDF5; }
  .check-box {
    width: 18px; height: 18px; border-radius: 4px;
    border: 2px solid var(--n-300); flex-shrink: 0;
    display: grid; place-items: center; transition: all .2s;
    margin-top: 1px;
  }
  .check-option.selected .check-box {
    border-color: #059669; background: #059669;
  }
  .check-box svg { opacity: 0; transition: opacity .2s; }
  .check-option.selected .check-box svg { opacity: 1; }
  .check-label { font-size: 13px; font-weight: 500; color: var(--n-700); }

  /* Range Slider */
  .range-wrap { display: flex; flex-direction: column; gap: 6px; }
  .range-header { display: flex; justify-content: space-between; align-items: center; }
  .range-value {
    font-size: 13px; font-weight: 700; color: var(--navy-500);
    background: var(--navy-50); padding: 2px 10px;
    border-radius: 20px; border: 1px solid var(--navy-100);
  }
  .range-track { width: 100%; height: 6px; border-radius: 3px;
    -webkit-appearance: none; appearance: none;
    background: linear-gradient(to right, var(--navy-400) var(--pct), var(--n-200) var(--pct));
    outline: none; cursor: pointer;
  }
  .range-track::-webkit-slider-thumb {
    -webkit-appearance: none; width: 20px; height: 20px;
    border-radius: 50%; background: var(--navy-500);
    border: 3px solid var(--white);
    box-shadow: 0 1px 4px rgba(0,0,0,.2); cursor: pointer;
  }
  .range-labels { display: flex; justify-content: space-between; }
  .range-labels span { font-size: 10px; color: var(--n-400); }

  /* Star Rating */
  .star-rating { display: flex; gap: 6px; }
  .star-btn {
    background: none; border: none; cursor: pointer; padding: 4px;
    transition: transform .15s;
  }
  .star-btn:hover { transform: scale(1.15); }
  .star-btn svg { width: 28px; height: 28px; }

  /* Date / Time row */
  .date-time-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

  /* Submit Button */
  .submit-area { padding: 4px 0 20px; }
  .submit-btn {
    width: 100%; padding: 14px; border: none;
    border-radius: var(--r-lg); font-family: var(--font);
    font-size: 14px; font-weight: 700; color: #fff;
    background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%);
    cursor: pointer; transition: opacity .2s, transform .1s;
    box-shadow: 0 4px 14px rgba(59,130,246,.35);
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .submit-btn:hover { opacity: .92; }
  .submit-btn:active { transform: scale(.98); }

  /* Success Toast */
  .toast-overlay {
    position: fixed; inset: 0; z-index: 100;
    background: rgba(0,0,0,.4); backdrop-filter: blur(4px);
    display: grid; place-items: center;
    animation: fadeIn .25s ease;
  }
  .toast-card {
    background: var(--white); border-radius: var(--r-2xl);
    padding: 32px 28px; text-align: center; max-width: 300px;
    box-shadow: 0 20px 60px rgba(0,0,0,.15);
    animation: toastPop .35s cubic-bezier(.22,.68,0,1.2);
  }
  @keyframes toastPop { from { opacity: 0; transform: scale(.85); } to { opacity: 1; transform: scale(1); } }
  .toast-icon { font-size: 48px; margin-bottom: 12px; }
  .toast-title { font-size: 16px; font-weight: 700; color: var(--n-900); margin-bottom: 6px; }
  .toast-desc { font-size: 12.5px; color: var(--n-500); line-height: 1.5; margin-bottom: 18px; }
  .toast-btn {
    padding: 10px 28px; border: none; border-radius: var(--r-md);
    font-family: var(--font); font-size: 13px; font-weight: 600;
    color: #fff; background: #059669; cursor: pointer;
    transition: opacity .15s;
  }
  .toast-btn:hover { opacity: .88; }

  /* Standalone shell */
  .rpt-shell { min-height: 100dvh; background: #F1F5F9; }
  .rpt-frame {
    margin: 0 auto; max-width: 430px; min-height: 100dvh;
    background: #fff; display: flex; flex-direction: column;
    box-shadow: 0 0 0 1px rgba(0,0,0,.05), 0 8px 48px rgba(0,0,0,.07);
  }
  .rpt-header {
    position: sticky; top: 0; z-index: 20;
    background: #0B1739;
    padding: 0 16px; height: 56px;
    display: flex; align-items: center; gap: 12px;
    border-bottom: 1px solid rgba(255,255,255,.06);
  }
  .rpt-back {
    width: 34px; height: 34px; border-radius: 8px;
    border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.07);
    color: rgba(255,255,255,.7); display: grid; place-items: center;
    cursor: pointer; flex-shrink: 0; transition: background .15s, color .15s;
  }
  .rpt-back:hover { background: rgba(255,255,255,.15); color: #fff; }
  .rpt-header-text { min-width: 0; }
  .rpt-brand { font-size: 9.5px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #93C5FD; opacity: .65; }
  .rpt-title { font-size: 14px; font-weight: 700; color: #fff; letter-spacing: -.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rpt-main { flex: 1; padding: 14px 13px 32px; display: flex; flex-direction: column; gap: 10px; }
`;

/* ── Component ───────────────────────────────────────────────────── */
export default function ReportLeader() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        nama: '',
        nip: '',
        departemen: '',
        tanggal: '',
        waktu: '',
        jenisLaporan: '',
        prioritas: '',
        kategori: [],
        deskripsi: '',
        rating: 0,
        kepuasan: 50,
        lampiran: '',
        persetujuan: false,
    });
    const [submitted, setSubmitted] = useState(false);

    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    const toggleKategori = (val) => {
        setForm(prev => ({
            ...prev,
            kategori: prev.kategori.includes(val)
                ? prev.kategori.filter(v => v !== val)
                : [...prev.kategori, val],
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
    };

    const resetForm = () => {
        setForm({
            nama: '', nip: '', departemen: '', tanggal: '', waktu: '',
            jenisLaporan: '', prioritas: '', kategori: [], deskripsi: '',
            rating: 0, kepuasan: 50, lampiran: '', persetujuan: false,
        });
        setSubmitted(false);
    };

    return (
        <>
            <style>{GLOBAL_STYLES}</style>
            <style>{styles}</style>
            <div className="rpt-shell">
            <div className="rpt-frame">
            <header className="rpt-header">
                <button className="rpt-back" onClick={() => navigate(-1)} aria-label="Kembali">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="12,4 6,10 12,16" />
                    </svg>
                </button>
                <div className="rpt-header-text">
                    <div className="rpt-brand">Sistem Absensi</div>
                    <div className="rpt-title">Formulir Laporan</div>
                </div>
            </header>
            <main className="rpt-main">
            <form className="report-form" onSubmit={handleSubmit}>

                {/* ── Banner ─────────────────────────────────── */}
                <div className="form-banner">
                    <div className="form-banner-icon">📋</div>
                    <h2>Formulir Laporan Harian</h2>
                    <p>Lengkapi formulir di bawah ini untuk menyampaikan laporan kerja kepada atasan.</p>
                </div>

                {/* ── Section 1: Data Diri ────────────────────── */}
                <div className="form-section">
                    <div className="form-section-title">
                        <span className="dot" style={{ background: '#3B82F6' }} />
                        Informasi Pelapor
                    </div>

                    <div className="fg">
                        <label>Nama Lengkap <span className="req">*</span></label>
                        <input type="text" placeholder="Masukkan nama lengkap" value={form.nama} onChange={e => set('nama', e.target.value)} />
                    </div>

                    <div className="fg">
                        <label>NIP / ID Karyawan</label>
                        <input type="text" placeholder="Contoh: 20230001" value={form.nip} onChange={e => set('nip', e.target.value)} />
                        <span className="hint">Nomor Induk Pegawai Anda</span>
                    </div>

                    <div className="fg">
                        <label>Departemen <span className="req">*</span></label>
                        <select value={form.departemen} onChange={e => set('departemen', e.target.value)}>
                            <option value="">— Pilih Departemen —</option>
                            <option value="produksi">Produksi</option>
                            <option value="quality_control">Quality Control</option>
                            <option value="warehouse">Warehouse / Gudang</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="hrd">HRD & Personalia</option>
                            <option value="finance">Finance & Accounting</option>
                            <option value="marketing">Marketing</option>
                            <option value="it">IT & Teknologi</option>
                        </select>
                    </div>

                    <div className="date-time-row">
                        <div className="fg">
                            <label>Tanggal <span className="req">*</span></label>
                            <input type="date" value={form.tanggal} onChange={e => set('tanggal', e.target.value)} />
                        </div>
                        <div className="fg">
                            <label>Waktu</label>
                            <input type="time" value={form.waktu} onChange={e => set('waktu', e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* ── Section 2: Jenis Laporan (Radio) ────────── */}
                <div className="form-section">
                    <div className="form-section-title">
                        <span className="dot" style={{ background: '#059669' }} />
                        Jenis Laporan
                    </div>

                    <div className="fg">
                        <label>Pilih jenis laporan <span className="req">*</span></label>
                        <div className="radio-group">
                            {[
                                { value: 'harian', label: 'Laporan Harian', desc: 'Laporan kegiatan kerja harian' },
                                { value: 'insiden', label: 'Laporan Insiden', desc: 'Kejadian tidak terduga / kecelakaan kerja' },
                                { value: 'progress', label: 'Laporan Progress', desc: 'Perkembangan proyek / tugas tertentu' },
                                { value: 'maintenance', label: 'Laporan Maintenance', desc: 'Perawatan & perbaikan alat / mesin' },
                            ].map(opt => (
                                <label key={opt.value}
                                    className={`radio-option${form.jenisLaporan === opt.value ? ' selected' : ''}`}>
                                    <input type="radio" name="jenisLaporan" value={opt.value}
                                        checked={form.jenisLaporan === opt.value}
                                        onChange={() => set('jenisLaporan', opt.value)} />
                                    <div className="radio-dot" />
                                    <div>
                                        <div className="radio-label">{opt.label}</div>
                                        <div className="radio-desc">{opt.desc}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Section 3: Prioritas (Radio inline style) ── */}
                <div className="form-section">
                    <div className="form-section-title">
                        <span className="dot" style={{ background: '#F59E0B' }} />
                        Tingkat Prioritas
                    </div>

                    <div className="fg">
                        <label>Prioritas laporan</label>
                        <div className="radio-group">
                            {[
                                { value: 'rendah', label: '🟢 Rendah', desc: 'Tidak mendesak' },
                                { value: 'sedang', label: '🟡 Sedang', desc: 'Perlu ditindaklanjuti' },
                                { value: 'tinggi', label: '🟠 Tinggi', desc: 'Butuh perhatian segera' },
                                { value: 'kritis', label: '🔴 Kritis', desc: 'Harus ditangani sekarang' },
                            ].map(opt => (
                                <label key={opt.value}
                                    className={`radio-option${form.prioritas === opt.value ? ' selected' : ''}`}>
                                    <input type="radio" name="prioritas" value={opt.value}
                                        checked={form.prioritas === opt.value}
                                        onChange={() => set('prioritas', opt.value)} />
                                    <div className="radio-dot" />
                                    <div>
                                        <div className="radio-label">{opt.label}</div>
                                        <div className="radio-desc">{opt.desc}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Section 4: Kategori (Checkbox) ─────────── */}
                <div className="form-section">
                    <div className="form-section-title">
                        <span className="dot" style={{ background: '#8B5CF6' }} />
                        Kategori Terkait
                    </div>

                    <div className="fg">
                        <label>Pilih kategori yang relevan</label>
                        <div className="check-group">
                            {[
                                'Keselamatan Kerja (K3)',
                                'Kualitas Produk',
                                'Efisiensi Produksi',
                                'Sumber Daya Manusia',
                                'Peralatan & Mesin',
                                'Kebersihan & Lingkungan',
                            ].map(cat => (
                                <label key={cat}
                                    className={`check-option${form.kategori.includes(cat) ? ' selected' : ''}`}
                                    onClick={() => toggleKategori(cat)}>
                                    <div className="check-box">
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="2.5,6 5,8.5 9.5,3.5" />
                                        </svg>
                                    </div>
                                    <span className="check-label">{cat}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Section 5: Deskripsi ───────────────────── */}
                <div className="form-section">
                    <div className="form-section-title">
                        <span className="dot" style={{ background: '#EF4444' }} />
                        Detail Laporan
                    </div>

                    <div className="fg">
                        <label>Deskripsi / Uraian <span className="req">*</span></label>
                        <textarea placeholder="Jelaskan secara singkat isi laporan Anda..." value={form.deskripsi} onChange={e => set('deskripsi', e.target.value)} rows={4} />
                        <span className="hint">{form.deskripsi.length} / 500 karakter</span>
                    </div>

                    <div className="fg">
                        <label>Lampiran (opsional)</label>
                        <input type="text" placeholder="Nama file atau link lampiran" value={form.lampiran} onChange={e => set('lampiran', e.target.value)} />
                        <span className="hint">Masukkan nama file atau URL terkait</span>
                    </div>
                </div>

                {/* ── Section 6: Rating Bintang ──────────────── */}
                <div className="form-section">
                    <div className="form-section-title">
                        <span className="dot" style={{ background: '#F59E0B' }} />
                        Penilaian Kinerja Hari Ini
                    </div>

                    <div className="fg">
                        <label>Berikan rating kinerja tim hari ini</label>
                        <div className="star-rating">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button key={star} type="button" className="star-btn" onClick={() => set('rating', star)}>
                                    <svg viewBox="0 0 24 24" fill={star <= form.rating ? '#F59E0B' : 'none'}
                                        stroke={star <= form.rating ? '#F59E0B' : '#CBD5E1'} strokeWidth="1.8">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                    </svg>
                                </button>
                            ))}
                        </div>
                        {form.rating > 0 && (
                            <span className="hint" style={{ color: '#F59E0B', fontWeight: 600 }}>
                                {['', 'Sangat Kurang', 'Kurang', 'Cukup', 'Baik', 'Sangat Baik'][form.rating]}
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Section 7: Slider Kepuasan ─────────────── */}
                <div className="form-section">
                    <div className="form-section-title">
                        <span className="dot" style={{ background: '#06B6D4' }} />
                        Tingkat Kepuasan
                    </div>

                    <div className="fg">
                        <label>Seberapa puas Anda dengan kondisi kerja hari ini?</label>
                        <div className="range-wrap">
                            <div className="range-header">
                                <span style={{ fontSize: '11px', color: 'var(--n-400)' }}>Tidak Puas</span>
                                <span className="range-value">{form.kepuasan}%</span>
                                <span style={{ fontSize: '11px', color: 'var(--n-400)' }}>Sangat Puas</span>
                            </div>
                            <input type="range" className="range-track" min="0" max="100" value={form.kepuasan}
                                style={{ '--pct': `${form.kepuasan}%` }}
                                onChange={e => set('kepuasan', Number(e.target.value))} />
                        </div>
                    </div>
                </div>

                {/* ── Section 8: Persetujuan ─────────────────── */}
                <div className="form-section">
                    <label className="check-option" style={{ marginBottom: 0, cursor: 'pointer' }}
                        onClick={() => set('persetujuan', !form.persetujuan)}>
                        <div className={`check-box`} style={form.persetujuan ? { borderColor: '#059669', background: '#059669' } : {}}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round"
                                style={{ opacity: form.persetujuan ? 1 : 0 }}>
                                <polyline points="2.5,6 5,8.5 9.5,3.5" />
                            </svg>
                        </div>
                        <div>
                            <div className="check-label">Saya menyatakan bahwa laporan ini benar</div>
                            <div style={{ fontSize: '11px', color: 'var(--n-400)', marginTop: 2 }}>
                                Data yang saya isi sesuai dengan kondisi sebenarnya
                            </div>
                        </div>
                    </label>
                </div>

                {/* ── Submit ─────────────────────────────────── */}
                <div className="submit-area">
                    <button type="submit" className="submit-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
                        </svg>
                        Kirim Laporan
                    </button>
                </div>
            </form>

            {/* ── Success Toast ──────────────────────────────── */}
            {submitted && (
                <div className="toast-overlay" onClick={resetForm}>
                    <div className="toast-card" onClick={e => e.stopPropagation()}>
                        <div className="toast-icon">✅</div>
                        <div className="toast-title">Laporan Terkirim!</div>
                        <div className="toast-desc">
                            Terima kasih, laporan Anda telah berhasil dikirim dan akan ditinjau oleh atasan.
                        </div>
                        <button className="toast-btn" onClick={resetForm}>Kembali ke Formulir</button>
                    </div>
                </div>
            )}
            </main>
            </div>
            </div>
        </>
    );
}
