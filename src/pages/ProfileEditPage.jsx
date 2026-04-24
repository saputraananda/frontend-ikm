import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';

/* ── Helpers ── */
const titleCase = s => (!s ? '' : s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()));
const initials = name => (!name ? '?' : name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase());

/* ── Icons ── */
const IconBack = () => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="12,15 7,10 12,5" />
    </svg>
);
const IconSave = () => (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15.5 17H4.5A1.5 1.5 0 013 15.5v-11A1.5 1.5 0 014.5 3H13l4 4v8.5A1.5 1.5 0 0115.5 17z" />
        <polyline points="7,3 7,8 13,8" /><polyline points="7,13 7,17 13,17 13,13" />
    </svg>
);
const IconUpload = () => (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16,10 10,4 4,10" /><line x1="10" y1="4" x2="10" y2="16" />
        <line x1="3" y1="17" x2="17" y2="17" />
    </svg>
);
const IconCheck = () => (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4,10 8,14 16,6" />
    </svg>
);
const IconEye = () => (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1.5 10s3.2-5 8.5-5 8.5 5 8.5 5-3.2 5-8.5 5-8.5-5-8.5-5z" />
        <circle cx="10" cy="10" r="2.4" />
    </svg>
);

/* ── Document definitions ── */
const DOC_DEFS = [
    { key: 'ktp', label: 'KTP', accept: 'image/*,.pdf' },
    { key: 'kk', label: 'Kartu Keluarga (KK)', accept: 'image/*,.pdf' },
    { key: 'npwp', label: 'NPWP', accept: 'image/*,.pdf' },
    { key: 'bpjs', label: 'BPJS Kesehatan', accept: 'image/*,.pdf' },
    { key: 'bpjs_tk', label: 'BPJS Ketenagakerjaan', accept: 'image/*,.pdf' },
    { key: 'ijazah', label: 'Ijazah Terakhir', accept: 'image/*,.pdf' },
    { key: 'sertifikat', label: 'Sertifikat', accept: 'image/*,.pdf' },
    { key: 'rekomkerja', label: 'Surat Rekomendasi Kerja', accept: 'image/*,.pdf' },
];

/* ── Select options ── */
const GENDER_OPTS = [{ v: '', l: '— Pilih —' }, { v: 'L', l: 'Laki-laki' }, { v: 'P', l: 'Perempuan' }];
const MARITAL_OPTS = [
    { v: '', l: '— Pilih —' }, { v: 'Single', l: 'Belum Menikah' },
    { v: 'Married', l: 'Menikah' }, { v: 'Divorced', l: 'Cerai' }, { v: 'Widowed', l: 'Janda/Duda' },
];
const RELIGION_OPTS = [
    { v: '', l: '— Pilih —' }, { v: '1', l: 'Islam' }, { v: '2', l: 'Kristen' },
    { v: '3', l: 'Katolik' }, { v: '4', l: 'Hindu' }, { v: '5', l: 'Buddha' }, { v: '6', l: 'Konghucu' },
];

/* ── Section wrapper ── */
function Section({ title, children }) {
    return (
        <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,.04),0_0_0_1px_rgba(0,0,0,.03)]">
            <div className="px-4 pt-3 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-[.08em]">{title}</div>
            <div className="flex flex-col">{children}</div>
        </div>
    );
}

/* ── Text/Date/Select field row ── */
function FieldRow({ label, name, type = 'text', value, onChange, options, placeholder }) {
    return (
        <div className="px-4 py-2.5 border-b border-slate-50 last:border-b-0">
            <div className="text-[10.5px] font-semibold text-slate-400 mb-1">{label}</div>
            {options ? (
                <select
                    name={name}
                    value={value || ''}
                    onChange={e => onChange(name, e.target.value)}
                    className="w-full text-[13px] font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-[10px] px-3 h-[38px] focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                >
                    {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
            ) : (
                <input
                    type={type}
                    name={name}
                    value={value || ''}
                    onChange={e => onChange(name, e.target.value)}
                    placeholder={placeholder || ''}
                    className="w-full text-[13px] font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-[10px] px-3 h-[38px] focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition placeholder:text-slate-300"
                />
            )}
        </div>
    );
}

/* ── Document upload row ── */
function DocRow({ docKey, label, accept, currentUrl, onUpload, uploading }) {
    const fileRef = useRef(null);
    const isLoading = uploading === docKey;
    return (
        <div className="px-4 py-3 border-b border-slate-50 last:border-b-0">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <div className="text-[12.5px] font-semibold text-slate-700">{label}</div>
                    {currentUrl
                        ? <div className="text-[10.5px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5"><IconCheck /> Sudah diunggah</div>
                        : <div className="text-[10.5px] text-slate-400 font-medium mt-0.5">Belum diunggah</div>
                    }
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {currentUrl && (
                        <a href={currentUrl} target="_blank" rel="noopener noreferrer"
                            className="h-[32px] px-3 rounded-[9px] border border-slate-200 bg-slate-50 text-slate-600 text-[11px] font-bold flex items-center gap-1 transition hover:bg-slate-100">
                            <IconEye /> Lihat
                        </a>
                    )}
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={isLoading}
                        className="h-[32px] px-3 rounded-[9px] border border-blue-200 bg-blue-50 text-blue-700 text-[11px] font-bold flex items-center gap-1 transition hover:bg-blue-100 disabled:opacity-50"
                    >
                        {isLoading
                            ? <><span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />Unggah…</>
                            : <><IconUpload /> Unggah</>
                        }
                    </button>
                    <input
                        ref={fileRef} type="file" accept={accept} className="hidden"
                        onChange={e => { if (e.target.files?.[0]) onUpload(docKey, e.target.files[0]); e.target.value = ''; }}
                    />
                </div>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════ */
export default function ProfileEditPage() {
    const [detail, setDetail] = useState(null);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(null);
    const [toast, setToast] = useState(null);  // { text, ok }
    const [banks, setBanks] = useState([]);
    const profileFileRef = useRef(null);

    useEffect(() => { document.title = 'Edit Profil | IKM Mobile'; }, []);

    useEffect(() => {
        api.get('/employee/banks').then(r => {
            setBanks(r.data.data || []);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        api.get('/employee/profile-detail').then(r => {
            const d = r.data.data || {};
            setDetail(d);
            setForm({
                gender: d.gender || '',
                birth_place: d.birth_place || '',
                birth_date: d.birth_date ? d.birth_date.slice(0, 10) : '',
                address: d.address || '',
                ktp_number: d.ktp_number || '',
                phone_number: d.phone_number || '',
                join_date: d.join_date ? d.join_date.slice(0, 10) : '',
                contract_end_date: d.contract_end_date ? d.contract_end_date.slice(0, 10) : '',
                school_name: d.school_name || '',
                religion_id: d.religion_id ? String(d.religion_id) : '',
                marital_status: d.marital_status || '',
                bank_id: d.bank_id ? String(d.bank_id) : '',
                bank_account_number: d.bank_account_number || '',
            });
        }).catch(() => { });
    }, []);

    const handleChange = useCallback((name, value) => {
        setForm(prev => ({ ...prev, [name]: value }));
    }, []);

    const showToast = (text, ok = true) => {
        setToast({ text, ok });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/employee/update-profile', form);
            showToast('Profil berhasil disimpan.');
        } catch (e) {
            showToast(e.response?.data?.message || 'Gagal menyimpan.', false);
        }
        setSaving(false);
    };

    const handleUpload = async (docKey, file) => {
        setUploading(docKey);
        try {
            const fd = new FormData();
            fd.append('doc', file);
            const r = await api.post(`/employee/upload-doc/${docKey}`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            /* Update local url */
            const urlKey = `${docKey}_url`;
            setDetail(prev => ({ ...prev, [urlKey]: r.data.data?.url }));
            showToast(`${file.name} berhasil diunggah.`);
        } catch (e) {
            showToast(e.response?.data?.message || 'Gagal mengunggah file.', false);
        }
        setUploading(null);
    };

    const bankOpts = [
        { v: '', l: '— Pilih Bank —' },
        ...banks.map(b => ({ v: String(b.bank_id), l: b.bank_name }))
    ];

    const name = titleCase(detail?.full_name || '');

    return (
        <div className="min-h-[100dvh] bg-slate-100 flex justify-center">
            <div className="w-full max-w-[430px] min-h-[100dvh] bg-slate-50 flex flex-col shadow-[0_0_0_1px_rgba(0,0,0,.04),0_8px_48px_rgba(0,0,0,.08)] relative overflow-hidden">

                {/* ── Hero ── */}
                <div className="relative overflow-hidden rounded-b-[28px] flex-shrink-0 pb-[22px]"
                    style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1E3A5F 35%, #1D4ED8 70%, #3B82F6 100%)' }}>
                    <div className="absolute -top-[70px] -right-[40px] w-[200px] h-[200px] rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(59,130,246,.25) 0%, transparent 70%)' }} />
                    <div className="absolute inset-0 pointer-events-none opacity-[.04]"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                    {/* Top bar */}
                    <div className="relative z-[1] flex items-center justify-between px-[18px] pt-[14px]">
                        <Link to="/profile"
                            className="w-9 h-9 rounded-[11px] bg-white/10 border border-white/12 text-white grid place-items-center flex-shrink-0 transition hover:bg-white/20 no-underline backdrop-blur-xl">
                            <IconBack />
                        </Link>
                    </div>

                    {/* Avatar */}
                    <div className="relative z-[1] flex flex-col items-center mt-3 gap-1.5">
                        <button
                            type="button"
                            onClick={() => profileFileRef.current?.click()}
                            className="relative w-16 h-16 rounded-[18px] bg-white/15 border-[2.5px] border-white/25 text-white text-[20px] font-extrabold grid place-items-center shadow-[0_8px_24px_rgba(0,0,0,.2)] backdrop-blur-[8px] overflow-hidden group cursor-pointer"
                            title="Ganti foto profil"
                        >
                            {detail?.profile_url
                                ? <img src={detail.profile_url} alt="foto" className="w-full h-full object-cover" />
                                : <span>{initials(name)}</span>
                            }
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                            </div>
                            {uploading === 'profile' && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <span className="w-5 h-5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                                </div>
                            )}
                        </button>
                        <input
                            ref={profileFileRef} type="file" accept="image/*" className="hidden"
                            onChange={e => { if (e.target.files?.[0]) handleUpload('profile', e.target.files[0]); e.target.value = ''; }}
                        />
                        <div className="text-[11px] text-white/50 font-medium">Ketuk untuk ganti foto</div>
                        <div className="text-[13px] font-extrabold text-white">{name || '—'}</div>
                        {detail?.employee_code && (
                            <div className="text-[10.5px] text-white/45 font-medium">{detail.employee_code}</div>
                        )}
                    </div>
                </div>

                {/* ── Form ── */}
                <div className="flex-1 overflow-y-auto px-3 sm:px-[14px] pt-3 pb-[calc(100px+env(safe-area-inset-bottom))] flex flex-col gap-3">

                    {/* Data Pribadi */}
                    <Section title="Data Pribadi">
                        <FieldRow label="Jenis Kelamin" name="gender" value={form.gender} onChange={handleChange} options={GENDER_OPTS} />
                        <FieldRow label="Tempat Lahir" name="birth_place" value={form.birth_place} onChange={handleChange} placeholder="cth. Jakarta" />
                        <FieldRow label="Tanggal Lahir" name="birth_date" value={form.birth_date} onChange={handleChange} type="date" />
                        <FieldRow label="No. HP" name="phone_number" value={form.phone_number} onChange={handleChange} placeholder="cth. 08123456789" />
                        <FieldRow label="No. KTP" name="ktp_number" value={form.ktp_number} onChange={handleChange} placeholder="16 digit NIK" />
                        <FieldRow label="Alamat" name="address" value={form.address} onChange={handleChange} placeholder="Alamat lengkap" />
                        <FieldRow label="Status Pernikahan" name="marital_status" value={form.marital_status} onChange={handleChange} options={MARITAL_OPTS} />
                        <FieldRow label="Agama" name="religion_id" value={form.religion_id} onChange={handleChange} options={RELIGION_OPTS} />
                    </Section>

                    {/* Data Pekerjaan */}
                    <Section title="Data Pekerjaan">
                        <FieldRow label="Tanggal Bergabung" name="join_date" value={form.join_date} onChange={handleChange} type="date" />
                        <FieldRow label="Tanggal Kontrak Berakhir" name="contract_end_date" value={form.contract_end_date} onChange={handleChange} type="date" />
                        <FieldRow label="Pendidikan Terakhir" name="school_name" value={form.school_name} onChange={handleChange} placeholder="Nama sekolah/universitas" />
                    </Section>

                    {/* Data Bank */}
                    <Section title="Rekening Bank">
                        <FieldRow label="Nama Bank" name="bank_id" value={form.bank_id} onChange={handleChange} options={bankOpts} />
                        <FieldRow label="No. Rekening" name="bank_account_number" value={form.bank_account_number} onChange={handleChange} placeholder="Nomor rekening" />
                    </Section>

                    {/* Dokumen */}
                    <Section title="Dokumen Pendukung">
                        {DOC_DEFS.map(d => (
                            <DocRow
                                key={d.key}
                                docKey={d.key}
                                label={d.label}
                                accept={d.accept}
                                currentUrl={detail?.[`${d.key}_url`] || null}
                                onUpload={handleUpload}
                                uploading={uploading}
                            />
                        ))}
                    </Section>

                    <div className="text-[11px] text-slate-300 text-center font-medium">
                        Semua kolom bersifat opsional. Data disimpan per bagian.
                    </div>
                </div>

                {/* ── Toast ── */}
                {toast && (
                    <div className={`fixed bottom-[90px] left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-[14px] shadow-[0_8px_32px_rgba(0,0,0,.18)] text-[12.5px] font-bold text-white transition-all ${toast.ok ? 'bg-emerald-600' : 'bg-red-500'}`}>
                        {toast.text}
                    </div>
                )}

                {/* ── Bottom nav ── */}
                <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center pointer-events-none">
                    <div className="pointer-events-auto w-full max-w-[430px] bg-white/92 backdrop-blur-[20px] border-t border-slate-200/60 px-5 pt-1.5 shadow-[0_-4px_24px_rgba(0,0,0,.06)]"
                        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full h-[48px] rounded-[14px] text-white text-[13.5px] font-extrabold flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)' }}
                        >
                            {saving
                                ? <><span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" /> Menyimpan…</>
                                : <><IconSave /> Simpan Perubahan</>
                            }
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
