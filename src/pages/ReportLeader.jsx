import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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

    useEffect(() => { document.title = 'Laporan | IKM Mobile'; }, []);

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
        <div className="min-h-[100dvh] bg-slate-100">
            <div className="mx-auto max-w-[430px] min-h-[100dvh] bg-white flex flex-col shadow-[0_0_0_1px_rgba(0,0,0,.05),0_8px_48px_rgba(0,0,0,.07)]">

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
                        <div className="text-[14px] font-bold text-white tracking-[-0.01em] truncate">Formulir Laporan</div>
                    </div>
                </header>

                {/* Main */}
                <main className="flex-1 px-[13px] py-[14px] pb-8 flex flex-col gap-2.5">
                    <form className="flex flex-col gap-5 animate-form-fade" onSubmit={handleSubmit}>

                        {/* Banner */}
                        <div className="relative overflow-hidden rounded-[20px] px-5 py-[22px] text-white"
                            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)' }}>
                            <div className="absolute -top-[30px] -right-[30px] w-[100px] h-[100px] rounded-full bg-white/[.08]" />
                            <div className="text-[28px] mb-2">📋</div>
                            <h2 className="text-[17px] font-bold mb-1">Formulir Laporan Harian</h2>
                            <p className="text-[12px] opacity-75 leading-[1.5]">Lengkapi formulir di bawah ini untuk menyampaikan laporan kerja kepada atasan.</p>
                        </div>

                        {/* Section helper */}
                        {/* Section 1: Data Diri */}
                        <div className="bg-white rounded-[20px] border border-slate-200 px-4 py-[18px] shadow-[0_1px_4px_rgba(0,0,0,.04)]">
                            <div className="flex items-center gap-2 text-[13px] font-bold text-slate-900 mb-[14px] pb-2.5 border-b border-slate-200">
                                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0 bg-blue-500" />
                                Informasi Pelapor
                            </div>

                            <div className="flex flex-col gap-1.5 mb-[14px]">
                                <label className="text-[12px] font-semibold text-slate-600 flex items-center gap-1">
                                    Nama Lengkap <span className="text-red-500">*</span>
                                </label>
                                <input className="w-full px-3 py-2.5 border border-slate-200 rounded-[12px] bg-slate-50 font-[inherit] text-[13px] text-slate-900 outline-none transition focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,.12)] focus:bg-white placeholder:text-slate-400"
                                    type="text" placeholder="Masukkan nama lengkap" value={form.nama} onChange={e => set('nama', e.target.value)} />
                            </div>

                            <div className="flex flex-col gap-1.5 mb-[14px]">
                                <label className="text-[12px] font-semibold text-slate-600">NIP / ID Karyawan</label>
                                <input className="w-full px-3 py-2.5 border border-slate-200 rounded-[12px] bg-slate-50 font-[inherit] text-[13px] text-slate-900 outline-none transition focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,.12)] focus:bg-white placeholder:text-slate-400"
                                    type="text" placeholder="Contoh: 20230001" value={form.nip} onChange={e => set('nip', e.target.value)} />
                                <span className="text-[11px] text-slate-400">Nomor Induk Pegawai Anda</span>
                            </div>

                            <div className="flex flex-col gap-1.5 mb-[14px]">
                                <label className="text-[12px] font-semibold text-slate-600 flex items-center gap-1">
                                    Departemen <span className="text-red-500">*</span>
                                </label>
                                <select className="w-full px-3 py-2.5 border border-slate-200 rounded-[12px] bg-slate-50 font-[inherit] text-[13px] text-slate-900 outline-none transition focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,.12)] focus:bg-white cursor-pointer appearance-none"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 32 }}
                                    value={form.departemen} onChange={e => set('departemen', e.target.value)}>
                                    <option value="">— Pilih Departemen —</option>
                                    <option value="produksi">Produksi</option>
                                    <option value="quality_control">Quality Control</option>
                                    <option value="warehouse">Warehouse / Gudang</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="hrd">HRD &amp; Personalia</option>
                                    <option value="finance">Finance &amp; Accounting</option>
                                    <option value="marketing">Marketing</option>
                                    <option value="it">IT &amp; Teknologi</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[12px] font-semibold text-slate-600 flex items-center gap-1">
                                        Tanggal <span className="text-red-500">*</span>
                                    </label>
                                    <input className="w-full px-3 py-2.5 border border-slate-200 rounded-[12px] bg-slate-50 font-[inherit] text-[13px] text-slate-900 outline-none transition focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,.12)] focus:bg-white"
                                        type="date" value={form.tanggal} onChange={e => set('tanggal', e.target.value)} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[12px] font-semibold text-slate-600">Waktu</label>
                                    <input className="w-full px-3 py-2.5 border border-slate-200 rounded-[12px] bg-slate-50 font-[inherit] text-[13px] text-slate-900 outline-none transition focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,.12)] focus:bg-white"
                                        type="time" value={form.waktu} onChange={e => set('waktu', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Jenis Laporan */}
                        <div className="bg-white rounded-[20px] border border-slate-200 px-4 py-[18px] shadow-[0_1px_4px_rgba(0,0,0,.04)]">
                            <div className="flex items-center gap-2 text-[13px] font-bold text-slate-900 mb-[14px] pb-2.5 border-b border-slate-200">
                                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0 bg-emerald-500" />
                                Jenis Laporan
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[12px] font-semibold text-slate-600 flex items-center gap-1">
                                    Pilih jenis laporan <span className="text-red-500">*</span>
                                </label>
                                <div className="flex flex-col gap-2">
                                    {[
                                        { value: 'harian',      label: 'Laporan Harian',      desc: 'Laporan kegiatan kerja harian' },
                                        { value: 'insiden',     label: 'Laporan Insiden',     desc: 'Kejadian tidak terduga / kecelakaan kerja' },
                                        { value: 'progress',    label: 'Laporan Progress',    desc: 'Perkembangan proyek / tugas tertentu' },
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

                        {/* Section 3: Prioritas */}
                        <div className="bg-white rounded-[20px] border border-slate-200 px-4 py-[18px] shadow-[0_1px_4px_rgba(0,0,0,.04)]">
                            <div className="flex items-center gap-2 text-[13px] font-bold text-slate-900 mb-[14px] pb-2.5 border-b border-slate-200">
                                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0 bg-amber-400" />
                                Tingkat Prioritas
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[12px] font-semibold text-slate-600">Prioritas laporan</label>
                                <div className="flex flex-col gap-2">
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

                        {/* Section 4: Kategori Checkbox */}
                        <div className="bg-white rounded-[20px] border border-slate-200 px-4 py-[18px] shadow-[0_1px_4px_rgba(0,0,0,.04)]">
                            <div className="flex items-center gap-2 text-[13px] font-bold text-slate-900 mb-[14px] pb-2.5 border-b border-slate-200">
                                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0 bg-violet-500" />
                                Kategori Terkait
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[12px] font-semibold text-slate-600">Pilih kategori yang relevan</label>
                                <div className="flex flex-col gap-2">
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

                        {/* Section 5: Deskripsi */}
                        <div className="bg-white rounded-[20px] border border-slate-200 px-4 py-[18px] shadow-[0_1px_4px_rgba(0,0,0,.04)]">
                            <div className="flex items-center gap-2 text-[13px] font-bold text-slate-900 mb-[14px] pb-2.5 border-b border-slate-200">
                                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0 bg-red-500" />
                                Detail Laporan
                            </div>

                            <div className="flex flex-col gap-1.5 mb-[14px]">
                                <label className="text-[12px] font-semibold text-slate-600 flex items-center gap-1">
                                    Deskripsi / Uraian <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-[12px] bg-slate-50 font-[inherit] text-[13px] text-slate-900 outline-none transition focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,.12)] focus:bg-white placeholder:text-slate-400 resize-y min-h-[80px]"
                                    placeholder="Jelaskan secara singkat isi laporan Anda..."
                                    value={form.deskripsi} onChange={e => set('deskripsi', e.target.value)} rows={4} />
                                <span className="text-[11px] text-slate-400">{form.deskripsi.length} / 500 karakter</span>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[12px] font-semibold text-slate-600">Lampiran (opsional)</label>
                                <input className="w-full px-3 py-2.5 border border-slate-200 rounded-[12px] bg-slate-50 font-[inherit] text-[13px] text-slate-900 outline-none transition focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,.12)] focus:bg-white placeholder:text-slate-400"
                                    type="text" placeholder="Nama file atau link lampiran" value={form.lampiran} onChange={e => set('lampiran', e.target.value)} />
                                <span className="text-[11px] text-slate-400">Masukkan nama file atau URL terkait</span>
                            </div>
                        </div>

                        {/* Section 6: Rating */}
                        <div className="bg-white rounded-[20px] border border-slate-200 px-4 py-[18px] shadow-[0_1px_4px_rgba(0,0,0,.04)]">
                            <div className="flex items-center gap-2 text-[13px] font-bold text-slate-900 mb-[14px] pb-2.5 border-b border-slate-200">
                                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0 bg-amber-400" />
                                Penilaian Kinerja Hari Ini
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[12px] font-semibold text-slate-600">Berikan rating kinerja tim hari ini</label>
                                <div className="flex gap-1.5">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button key={star} type="button"
                                            className="bg-transparent border-none cursor-pointer p-1 transition hover:scale-[1.15]"
                                            onClick={() => set('rating', star)}>
                                            <svg width="28" height="28" viewBox="0 0 24 24"
                                                fill={star <= form.rating ? '#F59E0B' : 'none'}
                                                stroke={star <= form.rating ? '#F59E0B' : '#CBD5E1'} strokeWidth="1.8">
                                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                                {form.rating > 0 && (
                                    <span className="text-[11px] text-amber-500 font-semibold">
                                        {['', 'Sangat Kurang', 'Kurang', 'Cukup', 'Baik', 'Sangat Baik'][form.rating]}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Section 7: Slider Kepuasan */}
                        <div className="bg-white rounded-[20px] border border-slate-200 px-4 py-[18px] shadow-[0_1px_4px_rgba(0,0,0,.04)]">
                            <div className="flex items-center gap-2 text-[13px] font-bold text-slate-900 mb-[14px] pb-2.5 border-b border-slate-200">
                                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0 bg-cyan-500" />
                                Tingkat Kepuasan
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[12px] font-semibold text-slate-600">Seberapa puas Anda dengan kondisi kerja hari ini?</label>
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[11px] text-slate-400">Tidak Puas</span>
                                        <span className="text-[13px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">{form.kepuasan}%</span>
                                        <span className="text-[11px] text-slate-400">Sangat Puas</span>
                                    </div>
                                    <input type="range" className="range-track" min="0" max="100" value={form.kepuasan}
                                        style={{ '--pct': `${form.kepuasan}%` }}
                                        onChange={e => set('kepuasan', Number(e.target.value))} />
                                </div>
                            </div>
                        </div>

                        {/* Section 8: Persetujuan */}
                        <div className="bg-white rounded-[20px] border border-slate-200 px-4 py-[18px] shadow-[0_1px_4px_rgba(0,0,0,.04)]">
                            <label className="check-option" style={{ marginBottom: 0, cursor: 'pointer' }}
                                onClick={() => set('persetujuan', !form.persetujuan)}>
                                <div className="check-box" style={form.persetujuan ? { borderColor: '#059669', background: '#059669' } : {}}>
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2"
                                        strokeLinecap="round" strokeLinejoin="round"
                                        style={{ opacity: form.persetujuan ? 1 : 0 }}>
                                        <polyline points="2.5,6 5,8.5 9.5,3.5" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="check-label">Saya menyatakan bahwa laporan ini benar</div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                        Data yang saya isi sesuai dengan kondisi sebenarnya
                                    </div>
                                </div>
                            </label>
                        </div>

                        {/* Submit */}
                        <div className="pt-1 pb-5">
                            <button type="submit"
                                className="w-full p-[14px] rounded-[16px] text-[14px] font-bold text-white flex items-center justify-center gap-2 transition hover:opacity-90 active:scale-[.98] shadow-[0_4px_14px_rgba(59,130,246,.35)] border-none cursor-pointer"
                                style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
                                </svg>
                                Kirim Laporan
                            </button>
                        </div>
                    </form>

                    {/* Success Toast */}
                    {submitted && (
                        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[4px] grid place-items-center animate-fade-in"
                            onClick={resetForm}>
                            <div className="bg-white rounded-[24px] p-8 text-center max-w-[300px] shadow-[0_20px_60px_rgba(0,0,0,.15)] animate-toast-pop"
                                onClick={e => e.stopPropagation()}>
                                <div className="text-[48px] mb-3">✅</div>
                                <div className="text-[16px] font-bold text-slate-900 mb-1.5">Laporan Terkirim!</div>
                                <div className="text-[12.5px] text-slate-500 leading-[1.5] mb-[18px]">
                                    Terima kasih, laporan Anda telah berhasil dikirim dan akan ditinjau oleh atasan.
                                </div>
                                <button
                                    className="px-7 py-2.5 rounded-[12px] bg-emerald-600 text-white text-[13px] font-semibold border-none cursor-pointer transition hover:opacity-90"
                                    onClick={resetForm}>
                                    Kembali ke Formulir
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
