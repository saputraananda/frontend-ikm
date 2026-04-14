import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

// ─── Icons ───────────────────────────────────────────────────────────────────

const IconInfo = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="7.5" />
    <line x1="10" y1="9" x2="10" y2="13" />
    <circle cx="10" cy="6" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

const IconTarget = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="7.5" />
    <circle cx="10" cy="10" r="3.2" />
    <circle cx="10" cy="10" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

const IconBook = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 3h8a3 3 0 013 3v10H7a3 3 0 00-3 3V3z" />
    <path d="M7 19V9a3 3 0 013-3h5" />
  </svg>
);

const IconSplit = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2v16" />
    <path d="M4 5h4v10H4z" />
    <path d="M12 5h4v10h-4z" />
  </svg>
);

const IconAlert = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2l8 14H2L10 2z" />
    <line x1="10" y1="7" x2="10" y2="11" />
    <circle cx="10" cy="14" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

const IconFAQ = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="7.5" />
    <path d="M10 13v.5" />
    <path d="M10 7a2 2 0 010 4" />
  </svg>
);

const IconTeam = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7" cy="7" r="3" />
    <path d="M1 17c0-2.5 2.5-4 6-4s6 1.5 6 4" />
    <path d="M15 7a3 3 0 010 6M19 17c0-2-1.8-3.5-4-4" />
  </svg>
);

const IconHome = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
    <path d="M7.5 18V12.5h5V18" />
  </svg>
);

const IconHistory = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="14" height="13" rx="2" />
    <line x1="3" y1="8" x2="17" y2="8" />
    <line x1="7" y1="2" x2="7" y2="5" />
    <line x1="13" y1="2" x2="13" y2="5" />
  </svg>
);

const IconUser = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="7" r="4" />
    <path d="M3 17c0-3 3.13-5 7-5s7 2 7 5" />
  </svg>
);

const IconEmail = () => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5h14l-7 7-7-7z" />
    <rect x="3" y="5" width="14" height="11" rx="1" />
  </svg>
);

const IconPhone = () => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 4h3l1.5 4L6 10a11 11 0 005 5l1.5-1.5 4 1.5v3c0 .5-.5 1-1 1C7 18.5 1.5 12.5 2 5c0-.5.5-1 1-1z" />
  </svg>
);

const IconCheck = () => (
  <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4,10 8,14 16,6" />
  </svg>
);

const IconBox = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="14" height="14" rx="3" />
    <path d="M7 10h6M10 7v6" />
  </svg>
);

// ─── Reusable Components ──────────────────────────────────────────────────────

function SectionCard({ title, icon, children, variant = 'default' }) {
  const isAlert = variant === 'alert';
  return (
    <section
      className={`rounded-[18px] p-[14px] border-[0.5px] ${
        isAlert
          ? 'bg-orange-50 border-orange-200'
          : 'bg-white border-black/[.06]'
      }`}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <div
          className={`w-7 h-7 rounded-[9px] flex items-center justify-center flex-shrink-0 ${
            isAlert ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {icon}
        </div>
        <h2
          className={`text-[13.5px] font-semibold tracking-[-0.15px] ${
            isAlert ? 'text-orange-900' : 'text-slate-900'
          }`}
        >
          {title}
        </h2>
      </div>
      <div className="text-[12.5px] text-slate-600 leading-relaxed">{children}</div>
    </section>
  );
}

function BulletList({ items, alertStyle = false }) {
  return (
    <ul className="flex flex-col gap-[5px]">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 items-start">
          <span
            className={`w-[5px] h-[5px] rounded-full flex-shrink-0 mt-[5px] ${
              alertStyle ? 'bg-orange-400' : 'bg-slate-400'
            }`}
          />
          <span
            className={`text-[12.5px] leading-relaxed ${
              alertStyle ? 'text-orange-950/80' : 'text-slate-600'
            }`}
          >
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

function InfoStrip({ children }) {
  return (
    <div className="mt-[10px] bg-green-50 border-[0.5px] border-green-200 rounded-[13px] px-3 py-2 flex gap-2 items-start">
      <div className="w-[18px] h-[18px] rounded-[5px] bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0 mt-[1px]">
        <IconCheck />
      </div>
      <p className="text-[11.5px] text-green-900 leading-relaxed">{children}</p>
    </div>
  );
}

function FaqItem({ q, a }) {
  return (
    <div className="bg-slate-50 border-[0.5px] border-slate-200 rounded-[13px] px-3 py-[10px]">
      <p className="text-[12px] font-semibold text-slate-800 mb-1">{q}</p>
      <p className="text-[11.5px] text-slate-500 leading-relaxed">{a}</p>
    </div>
  );
}

function TeamCard({ initials, name, role, color }) {
  const colors = {
    purple: 'bg-violet-100 text-violet-700',
    green:  'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    orange: 'bg-orange-100 text-orange-600',
  };
  return (
    <div className="flex items-center gap-2 bg-slate-50 border-[0.5px] border-slate-200 rounded-[13px] px-[10px] py-[10px]">
      <div className={`w-7 h-7 rounded-[8px] flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${colors[color]}`}>
        {initials}
      </div>
      <div>
        <p className="text-[11px] font-semibold text-slate-800 leading-tight">{name}</p>
        <p className="text-[10px] text-slate-400 mt-[1px]">{role}</p>
      </div>
    </div>
  );
}

function ContactRow({ icon, label, value, valueColor = 'text-blue-500' }) {
  return (
    <div className="flex items-center gap-[10px] bg-slate-50 border-[0.5px] border-slate-200 rounded-[13px] px-[10px] py-[9px]">
      <div className="w-7 h-7 rounded-[8px] bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[11.5px] font-medium text-slate-800 leading-tight">{label}</p>
        <p className={`text-[10.5px] mt-[1px] ${valueColor}`}>{value}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutAppPage() {
  const routerLocation = useLocation();

  useEffect(() => {
    document.title = 'Tentang Aplikasi | IKM Mobile';
  }, []);

  const isActive = (p) => routerLocation.pathname === p;

  // ── Data ──
  const steps = [
    'Login menggunakan akun yang diberikan perusahaan.',
    'Di beranda, pilih menu sesuai kebutuhan: Absensi, Valet, Riwayat, atau Profil.',
    'Aktifkan GPS/lokasi lalu buka halaman absensi yang sesuai.',
    'Tekan Masuk saat mulai kerja dan Keluar saat selesai.',
    'Cek menu Riwayat untuk memastikan data sudah tercatat benar.',
  ];

  const kegunaanItems = [
    'Proses absen tanpa kertas, lebih cepat dan rapi.',
    'Karyawan bisa cek status kehadiran kapan saja.',
    'Atasan dapat melihat data kehadiran lebih terstruktur.',
    'Mengurangi kesalahan catat karena tersimpan otomatis.',
  ];

  const kendalaItems = [
    'Tombol absen tidak aktif? Pastikan GPS & izin lokasi sudah menyala.',
    'Data belum muncul? Refresh halaman lalu cek Riwayat.',
    'Aplikasi force close? Bersihkan cache lalu buka ulang.',
    'Masih bermasalah? Catat jam kejadian dan hubungi admin IT.',
  ];

  const faqItems = [
    {
      q: 'Apakah bisa absen dari rumah?',
      a: 'Tidak. Sistem memverifikasi lokasi GPS — harus berada di area kantor yang sudah dikonfigurasi admin.',
    },
    {
      q: 'Data absen tersimpan berapa lama?',
      a: 'Riwayat tersimpan minimal 12 bulan dan dapat diakses kapan saja melalui menu Riwayat.',
    },
    {
      q: 'Bagaimana jika lupa absen keluar?',
      a: 'Segera lapor ke atasan atau admin HRD untuk koreksi data pada hari yang sama.',
    },
    {
      q: 'Apakah perlu koneksi internet?',
      a: 'Ya, koneksi internet diperlukan untuk sinkronisasi data absensi ke server.',
    },
  ];

  const teamMembers = [
    { initials: 'DEV', name: 'Tim Developer',  role: 'Pengembang aplikasi', color: 'purple' },
    { initials: 'OPS', name: 'Operasional',    role: 'Koordinasi lapangan', color: 'green'  },
    { initials: 'HRD', name: 'HRD',            role: 'Data kehadiran',      color: 'yellow' },
    { initials: 'IT',  name: 'IT Support',     role: 'Kendala teknis',      color: 'orange' },
  ];

  // ── Render ──
  return (
    <div className="min-h-[100dvh] bg-slate-100 flex justify-center">
      <div className="w-full max-w-[430px] min-h-[100dvh] bg-slate-50 flex flex-col shadow-[0_0_0_1px_rgba(0,0,0,.04),0_8px_48px_rgba(0,0,0,.08)] relative overflow-hidden">

        {/* ── Hero ── */}
        <div
          className="relative overflow-hidden rounded-b-[32px] flex-shrink-0 pb-6"
          style={{ background: 'linear-gradient(150deg, #0f172a 0%, #1e3a5f 45%, #1d4ed8 100%)' }}
        >
          {/* Glow */}
          <div
            className="absolute -top-16 -right-10 w-[200px] h-[200px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(96,165,250,.22) 0%, transparent 70%)' }}
          />
          {/* Dot grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.05) 1px, transparent 0)',
              backgroundSize: '20px 20px',
            }}
          />

          <div className="relative z-[1] px-4 pt-5">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-4">
              <Link
                to="/"
                className="w-[34px] h-[34px] rounded-[10px] bg-white/10 border border-white/[.12] text-white grid place-items-center no-underline transition hover:bg-white/20 flex-shrink-0"
                aria-label="Kembali"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="12,15 7,10 12,5" />
                </svg>
              </Link>
              <span className="text-[9px] font-semibold tracking-[.06em] text-white/65 bg-white/10 border border-white/[.14] rounded-full px-2.5 py-1">
                PANDUAN SINGKAT
              </span>
            </div>

            <h1 className="text-[22px] font-semibold text-white tracking-[-0.3px]">Tentang Aplikasi</h1>
            <p className="mt-1 text-[11.5px] text-white/50 leading-relaxed max-w-[280px]">
              Penjelasan IKM Mobile untuk pengguna, ringkas dan mudah dipahami.
            </p>

            {/* Chips */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { label: 'Cepat',   sub: 'Akses menu'  },
                { label: 'Jelas',   sub: 'Alur pakai'  },
                { label: 'Praktis', sub: 'Info penting' },
              ].map(({ label, sub }) => (
                <div key={label} className="bg-white/[.08] border border-white/[.10] rounded-[12px] py-2 text-center">
                  <div className="text-[11.5px] font-medium text-white">{label}</div>
                  <div className="text-[9px] text-white/40 mt-0.5">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Version banner ── */}
        <div className="mx-[14px] mt-[14px] bg-gradient-to-r from-blue-50 to-sky-50 border-[0.5px] border-blue-200 rounded-[14px] px-[14px] py-[10px] flex items-center gap-[10px] flex-shrink-0">
          <div className="w-8 h-8 rounded-[10px] bg-blue-700 flex items-center justify-center flex-shrink-0">
            <IconBox />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-blue-900 leading-tight">IKM Mobile v1.0.0</p>
            <p className="text-[10.5px] text-blue-500 mt-[1px]">Diperbarui 14 April 2025</p>
          </div>
          <div className="ml-auto bg-green-100 border-[0.5px] border-green-300 rounded-full px-2 py-[3px] flex items-center gap-1">
            <span className="w-[6px] h-[6px] rounded-full bg-green-500 inline-block" />
            <span className="text-[9.5px] font-semibold text-green-700">Terbaru</span>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div
          className="flex-1 overflow-y-auto px-[14px] pt-[14px] flex flex-col gap-2.5"
          style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}
        >

          {/* 1. Apa itu IKM Mobile */}
          <SectionCard title="Apa itu IKM Mobile?" icon={<IconInfo />}>
            <p>
              Aplikasi pendamping kerja harian untuk karyawan — membantu pencatatan kehadiran (absen),
              melihat riwayat absen, dan mengisi formulir kantor secara digital.
            </p>
            <InfoStrip>
              Tersedia untuk Android. Dapat diakses juga via browser (website).
            </InfoStrip>
          </SectionCard>

          {/* 2. Tujuan dan Kegunaan */}
          <SectionCard title="Tujuan dan Kegunaan" icon={<IconTarget />}>
            <BulletList items={kegunaanItems} />
          </SectionCard>

          {/* 3. Cara Pakai Singkat */}
          <SectionCard title="Cara Pakai Singkat" icon={<IconBook />}>
            <div className="flex flex-col gap-1.5">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 bg-slate-50 border border-slate-100 rounded-[12px] px-2.5 py-2"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-medium grid place-items-center flex-shrink-0 mt-[1px]">
                    {idx + 1}
                  </span>
                  <span className="text-[12px] text-slate-600 leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* 4. Absensi vs Valet */}
          <section className="bg-white rounded-[18px] p-[14px] border-[0.5px] border-black/[.06]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-[9px] bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                <IconSplit />
              </div>
              <h2 className="text-[13.5px] font-semibold text-slate-900 tracking-[-0.15px]">Absensi vs Valet</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[14px] bg-blue-50 border-[0.5px] border-blue-200 p-3">
                <p className="text-[11px] font-semibold text-blue-700 mb-1.5">Absen Normal</p>
                <p className="text-[11px] text-blue-900/70 leading-relaxed">
                  Untuk alur kerja karyawan umum sehari-hari.
                </p>
              </div>
              <div className="rounded-[14px] bg-cyan-50 border-[0.5px] border-cyan-200 p-3">
                <p className="text-[11px] font-semibold text-cyan-700 mb-1.5">Absen Valet</p>
                <p className="text-[11px] text-cyan-900/70 leading-relaxed">
                  Khusus tim valet, tampilan dibedakan agar tidak tertukar.
                </p>
              </div>
            </div>
          </section>

          {/* 5. FAQ */}
          <SectionCard title="Pertanyaan Umum (FAQ)" icon={<IconFAQ />}>
            <div className="flex flex-col gap-1.5">
              {faqItems.map((item, i) => (
                <FaqItem key={i} q={item.q} a={item.a} />
              ))}
            </div>
          </SectionCard>

          {/* 6. Tim & Kontak */}
          <SectionCard title="Tim & Kontak" icon={<IconTeam />}>
            <div className="grid grid-cols-2 gap-1.5 mb-2.5">
              {teamMembers.map((m) => (
                <TeamCard key={m.initials} {...m} />
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <ContactRow
                icon={<IconEmail />}
                label="Email Support"
                value="it.support@ikm-group.co.id"
              />
              <ContactRow
                icon={<IconPhone />}
                label="WhatsApp Admin"
                value="+62 812-3456-7890 (Jam kerja)"
              />
            </div>
          </SectionCard>

          {/* 7. Kendala */}
          <SectionCard title="Jika Ada Kendala" icon={<IconAlert />} variant="alert">
            <BulletList items={kendalaItems} alertStyle />
          </SectionCard>

          {/* Footer */}
          <div className="text-center py-2">
            <p className="text-[10px] text-slate-400">IKM Mobile · v2.4.1 · © 2025 PT IKM Group</p>
            <p className="text-[9.5px] text-slate-300 mt-[3px]">Seluruh data dijaga kerahasiaannya</p>
          </div>

        </div>

        {/* ── Bottom nav ── */}
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center pointer-events-none">
          <div
            className="pointer-events-auto w-full max-w-[430px] bg-white/96 backdrop-blur-[14px] border-t border-slate-200/60 px-4 pt-2.5 shadow-[0_-1px_0_rgba(0,0,0,.04),0_-8px_24px_rgba(0,0,0,.05)]"
            style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom))' }}
          >
            <nav className="grid grid-cols-3 gap-1">
              {[
                { to: '/',        label: 'Beranda', Icon: IconHome    },
                { to: '/history', label: 'Riwayat', Icon: IconHistory },
                { to: '/profile', label: 'Profil',  Icon: IconUser    },
              ].map(({ to, label, Icon }) => {
                const active = isActive(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`relative flex flex-col items-center gap-1 px-2 py-2 pb-1.5 rounded-[14px] no-underline text-[10px] font-medium tracking-[.02em] transition ${
                      active ? 'text-blue-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {active && (
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-b-[3px] bg-blue-700" />
                    )}
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