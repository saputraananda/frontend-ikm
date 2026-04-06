import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import useAuthStore from '../store/authStore';

/* ── Icons ──────────────────────────────────────────────────────── */
const IconChevL = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="12,5 7,10 12,15"/></svg>;
const IconChevR = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="8,5 13,10 8,15"/></svg>;
const IconClock = () => <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="10" r="7.5"/><polyline points="10,6 10,10 13,12"/></svg>;
const IconHome = () => <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M7.5 18V12.5h5V18"/></svg>;
const IconHistory = () => <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="14" height="13" rx="2"/><line x1="3" y1="8" x2="17" y2="8"/><line x1="7" y1="2" x2="7" y2="5"/><line x1="13" y1="2" x2="13" y2="5"/></svg>;
const IconUser = () => <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="7" r="4"/><path d="M3 17c0-3 3.13-5 7-5s7 2 7 5"/></svg>;
const IconIn = () => <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3h4a1 1 0 011 1v12a1 1 0 01-1 1h-4"/><polyline points="9,7 13,10 9,13"/><line x1="13" y1="10" x2="3" y2="10"/></svg>;
const IconOut = () => <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3H3a1 1 0 00-1 1v12a1 1 0 001 1h4"/><polyline points="11,13 15,10 11,7"/><line x1="15" y1="10" x2="5" y2="10"/></svg>;
const IconFire = () => <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2c0 4-4 5-4 9a4 4 0 008 0c0-4-2-6-2-9z"/><path d="M10 14a1.5 1.5 0 000-3c-.83 0-1.5.67-1.5 1.5S9.17 14 10 14z"/></svg>;
const IconCalendar = () => <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="14" height="13" rx="2"/><line x1="3" y1="8" x2="17" y2="8"/><line x1="7" y1="2" x2="7" y2="5"/><line x1="13" y1="2" x2="13" y2="5"/></svg>;

/* ── Helpers ─────────────────────────────────────────────────────── */
const DAYS_ID   = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const SHIFT_COLORS = {
  pagi:   { bg:'#FFFBEB', border:'#FDE68A', text:'#92400E', dot:'#F59E0B', label:'Pagi' },
  siang:  { bg:'#EFF6FF', border:'#BFDBFE', text:'#1E40AF', dot:'#3B82F6', label:'Siang' },
  sore:   { bg:'#F5F3FF', border:'#DDD6FE', text:'#5B21B6', dot:'#8B5CF6', label:'Sore' },
  lembur: { bg:'#FFF1F2', border:'#FECDD3', text:'#9F1239', dot:'#F43F5E', label:'Lembur' },
};

const fmt2 = n => String(n).padStart(2,'0');
const titleCase = s => (!s ? '' : s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()));
const isoDate = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  return `${dt.getFullYear()}-${fmt2(dt.getMonth()+1)}-${fmt2(dt.getDate())}`;
};
const fmtTime = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return `${fmt2(d.getHours())}:${fmt2(d.getMinutes())}`;
};
const fmtDateLong = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr + 'T00:00:00');
  return `${DAYS_ID[d.getDay()]}, ${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
};
const calcDuration = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null;
  const ms = new Date(checkOut) - new Date(checkIn);
  if (ms < 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
};
const calcStreak = (histories) => {
  const days = new Set(histories.filter(h => h.check_in_time).map(h => isoDate(h.attendance_date)));
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = `${d.getFullYear()}-${fmt2(d.getMonth()+1)}-${fmt2(d.getDate())}`;
    if (!days.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
};

/* ── Calendar ─────────────────────────────────────────────────────── */
function MonthCalendar({ year, month, attendanceMap, selectedDate, onSelectDate }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const todayKey = isoDate(new Date());

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:4 }}>
        {DAYS_ID.map(d => (
          <div key={d} style={{ fontSize:9.5, fontWeight:600, color:'rgba(255,255,255,.3)', textAlign:'center', padding:'2px 0', letterSpacing:'.04em' }}>{d}</div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const key = `${year}-${fmt2(month+1)}-${fmt2(day)}`;
          const att = attendanceMap[key];
          const isToday    = key === todayKey;
          const isSelected = key === selectedDate;
          const hasIn      = att?.check_in_time;
          const hasOut     = att?.check_out_time;
          return (
            <button key={key} onClick={() => onSelectDate(isSelected ? null : key)} style={{
              aspectRatio:'1', borderRadius:8, border:'none',
              background: isSelected ? 'rgba(255,255,255,.18)' : isToday ? 'rgba(255,255,255,.07)' : 'transparent',
              outline: isSelected ? '1.5px solid rgba(255,255,255,.25)' : 'none',
              cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, padding:0,
              transition:'background .12s',
            }}>
              <span style={{ fontSize:12, fontWeight: isToday ? 700 : 500, color: isToday ? '#93C5FD' : 'rgba(255,255,255,.65)', fontVariantNumeric:'tabular-nums' }}>{day}</span>
              {(hasIn || hasOut) && (
                <span style={{ width:4, height:4, borderRadius:'50%', background: hasIn && hasOut ? '#6EE7B7' : '#FCD34D', display:'block' }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export default function HistoryPage() {
  const routerLocation = useLocation();
  const authUser = useAuthStore(s => s.user);
  const [histories, setHistories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now] = useState(new Date());
  const [viewYear, setViewYear]   = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selected, setSelected]   = useState(null);

  useEffect(() => { document.title = 'Riwayat | IKM Mobile'; }, []);

  useEffect(() => {
    api.get('/attendance/history')
      .then(r => setHistories(r.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const attendanceMap = useMemo(() => {
    const map = {};
    histories.forEach(h => { const k = isoDate(h.attendance_date); if (k) map[k] = h; });
    return map;
  }, [histories]);

  const monthStats = useMemo(() => {
    const prefix = `${viewYear}-${fmt2(viewMonth+1)}`;
    const recs = histories.filter(h => isoDate(h.attendance_date)?.startsWith(prefix));
    const totalMs = recs.reduce((acc, h) => {
      const ms = calcDuration(h.check_in_time, h.check_out_time);
      if (!ms) return acc;
      const parts = ms.match(/(\d+)j\s*(\d+)m/) || ms.match(/(\d+)m/);
      if (!parts) return acc;
      if (ms.includes('j')) return acc + parseInt(parts[1])*60 + parseInt(parts[2]);
      return acc + parseInt(parts[1]);
    }, 0);
    const totalH = Math.floor(totalMs / 60);
    const totalM = totalMs % 60;
    return {
      total:   recs.length,
      full:    recs.filter(h => h.check_in_time && h.check_out_time).length,
      partial: recs.filter(h => h.check_in_time && !h.check_out_time).length,
      totalTime: totalMs > 0 ? `${totalH}j ${totalM}m` : '–',
    };
  }, [histories, viewYear, viewMonth]);

  const streak = useMemo(() => calcStreak(histories), [histories]);

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y=>y-1); setViewMonth(11); } else setViewMonth(m=>m-1); setSelected(null); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y=>y+1); setViewMonth(0); } else setViewMonth(m=>m+1); setSelected(null); };

  const selectedRecord = selected ? attendanceMap[selected] : null;

  const monthRecords = useMemo(() => {
    const prefix = `${viewYear}-${fmt2(viewMonth+1)}`;
    return histories.filter(h => isoDate(h.attendance_date)?.startsWith(prefix))
      .sort((a,b) => new Date(b.attendance_date) - new Date(a.attendance_date));
  }, [histories, viewYear, viewMonth]);

  const displayName = titleCase(authUser?.full_name || authUser?.name || 'User');

  const isActive = (p) => routerLocation.pathname === p;

  return (
    <div className="min-h-[100dvh] bg-slate-100 flex justify-center">
      <div className="w-full max-w-[430px] min-h-[100dvh] bg-slate-50 flex flex-col shadow-[0_0_0_1px_rgba(0,0,0,.05),0_8px_48px_rgba(0,0,0,.08)]">

        {/* ── Header ── */}
        <div className="flex-shrink-0 px-4 pt-[14px] pb-4"
          style={{ background: 'linear-gradient(135deg, #0B1739 0%, #1A336E 100%)' }}>

          {/* Top row */}
          <div className="flex items-center justify-between mb-[14px]">
            <div>
              <div className="text-[16px] font-extrabold text-white">Riwayat Absensi</div>
              <div className="text-[11px] text-white/45 font-medium mt-px">{displayName}</div>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-[5px] bg-white/10 border border-white/15 rounded-full px-2.5 py-1">
                <IconFire />
                <span className="text-[13px] font-extrabold text-[#FCD34D]">{streak}</span>
                <span className="text-[10.5px] text-white/50 font-medium">hari berturut</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-1.5 mb-[14px]">
            <div className="bg-white/[.07] border border-white/[.09] rounded-[12px] py-2 px-1.5 text-center">
              <div className="text-[17px] font-extrabold text-white leading-none">{monthStats.total}</div>
              <div className="text-[9px] text-white/35 font-medium mt-1 tracking-[.04em]">TOTAL HARI</div>
            </div>
            <div className="bg-white/[.07] border border-white/[.09] rounded-[12px] py-2 px-1.5 text-center">
              <div className="text-[17px] font-extrabold text-[#6EE7B7] leading-none">{monthStats.full}</div>
              <div className="text-[9px] text-white/35 font-medium mt-1 tracking-[.04em]">LENGKAP</div>
            </div>
            <div className="bg-white/[.07] border border-white/[.09] rounded-[12px] py-2 px-1.5 text-center">
              <div className="text-[17px] font-extrabold text-[#FCD34D] leading-none">{monthStats.partial}</div>
              <div className="text-[9px] text-white/35 font-medium mt-1 tracking-[.04em]">SEBAGIAN</div>
            </div>
            <div className="bg-white/[.07] border border-white/[.09] rounded-[12px] py-2 px-1.5 text-center">
              <div className="text-[13px] font-extrabold text-[#93C5FD] leading-none">{monthStats.totalTime}</div>
              <div className="text-[9px] text-white/35 font-medium mt-1 tracking-[.04em]">TTL JAM</div>
            </div>
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button className="w-[30px] h-[30px] rounded-[8px] border border-white/10 bg-white/[.06] text-white/60 grid place-items-center cursor-pointer transition hover:bg-white/[.14]"
              onClick={prevMonth}><IconChevL /></button>
            <div className="text-center">
              <div className="text-[14px] font-bold text-white">{MONTHS_ID[viewMonth]}</div>
              <div className="text-[11px] text-white/40">{viewYear}</div>
            </div>
            <button className="w-[30px] h-[30px] rounded-[8px] border border-white/10 bg-white/[.06] text-white/60 grid place-items-center cursor-pointer transition hover:bg-white/[.14]"
              onClick={nextMonth}><IconChevR /></button>
          </div>

          {/* Calendar */}
          {loading
            ? <div className="h-[100px] grid place-items-center">
                <div className="text-[12px] text-white/30 font-medium animate-shimmer">Memuat data…</div>
              </div>
            : <MonthCalendar year={viewYear} month={viewMonth} attendanceMap={attendanceMap} selectedDate={selected} onSelectDate={setSelected} />
          }
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-[13px] pt-3 pb-[110px] flex flex-col gap-2.5">

          {/* Legend */}
          <div className="flex items-center gap-3 py-0.5">
            <div className="flex items-center gap-[5px] text-[10.5px] text-slate-500 font-medium">
              <span className="w-[7px] h-[7px] rounded-full bg-[#6EE7B7] flex-shrink-0" /> Lengkap
            </div>
            <div className="flex items-center gap-[5px] text-[10.5px] text-slate-500 font-medium">
              <span className="w-[7px] h-[7px] rounded-full bg-[#FCD34D] flex-shrink-0" /> Sebagian
            </div>
          </div>

          {/* Selected detail */}
          {selected && (
            <div className="bg-white rounded-[18px] border-[1.5px] border-slate-200 overflow-hidden animate-slide-up">
              <div className="px-[14px] py-[11px] flex items-center justify-between border-b border-slate-50">
                <div className="text-[12.5px] font-bold text-slate-900">{fmtDateLong(selected)}</div>
                {selectedRecord
                  ? <span className={`inline-block text-[10px] font-bold tracking-[.04em] px-[9px] py-[3px] rounded-full border ${selectedRecord.check_in_time && selectedRecord.check_out_time ? 'bg-emerald-50 text-[#065F46] border-[#A7F3D0]' : selectedRecord.check_in_time ? 'bg-amber-50 text-[#92400E] border-[#FDE68A]' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                      {selectedRecord.check_in_time && selectedRecord.check_out_time ? '✓ Lengkap' : selectedRecord.check_in_time ? 'Sebagian' : 'Tidak Hadir'}
                    </span>
                  : <span className="inline-block text-[10px] font-bold tracking-[.04em] px-[9px] py-[3px] rounded-full bg-slate-50 text-slate-400 border border-slate-200">Tidak Hadir</span>
                }
              </div>
              {selectedRecord
                ? Object.entries(SHIFT_COLORS).map(([key, sc]) => {
                    const inTime  = selectedRecord[`${key}_in`];
                    const outTime = selectedRecord[`${key}_out`];
                    const dur = calcDuration(inTime, outTime);
                    return (
                      <div key={key} className="px-[14px] py-[10px] flex items-center gap-2.5 border-b last:border-b-0"
                        style={{ background: sc.bg, borderBottomColor: sc.border }}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sc.dot }} />
                        <div className="text-[11.5px] font-bold flex-1" style={{ color: sc.text }}>Shift {sc.label}</div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-1 font-mono text-[11.5px] font-semibold text-slate-900"><IconIn /> {fmtTime(inTime) || '–'}</div>
                          <span className="text-slate-300 text-[12px]">→</span>
                          <div className="flex items-center gap-1 font-mono text-[11.5px] font-semibold text-slate-900"><IconOut /> {fmtTime(outTime) || '–'}</div>
                          {dur && <div className="font-mono text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-[6px] px-1.5 py-0.5">{dur}</div>}
                        </div>
                      </div>
                    );
                  })
                : <div className="px-[14px] py-3 text-[12px] text-slate-400 text-center">Tidak ada data absensi untuk tanggal ini.</div>
              }
            </div>
          )}

          {/* Month list */}
          {!loading && monthRecords.length > 0 && (
            <>
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[12.5px] font-bold text-slate-900 py-0.5">Rekap {MONTHS_ID[viewMonth]}</span>
                <span className="text-[10.5px] text-slate-400 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-0.5 font-medium">
                  {monthRecords.length} hari
                </span>
              </div>
              <div className="flex flex-col gap-[7px]">
                {monthRecords.map(item => {
                  const dateKey = isoDate(item.attendance_date);
                  const d = dateKey ? new Date(dateKey + 'T00:00:00') : null;
                  const isComplete = item.check_in_time && item.check_out_time;
                  const isPartial  = item.check_in_time && !item.check_out_time;
                  return (
                    <div key={item.attendance_date} className="bg-white rounded-[16px] border border-slate-200 overflow-hidden transition hover:shadow-[0_4px_16px_rgba(0,0,0,.07)]">
                      <div className="px-[13px] py-[10px] flex items-center justify-between gap-2 border-b border-slate-50">
                        <div className="flex items-center gap-2.5">
                          <div className="text-[22px] font-extrabold text-slate-900 leading-none tracking-[-0.04em] w-[34px] flex-shrink-0">
                            {d ? fmt2(d.getDate()) : '–'}
                          </div>
                          <div>
                            <div className="text-[12px] font-semibold text-slate-900">{d ? `${DAYS_ID[d.getDay()]}, ${MONTHS_ID[d.getMonth()]}` : '–'}</div>
                            <div className="text-[10.5px] text-slate-400 mt-px">{d?.getFullYear()}</div>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold tracking-[.04em] px-[9px] py-[3px] rounded-full border flex-shrink-0 ${isComplete ? 'bg-emerald-50 text-[#065F46] border-[#A7F3D0]' : isPartial ? 'bg-amber-50 text-[#92400E] border-[#FDE68A]' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                          {isComplete ? '✓ Lengkap' : isPartial ? 'Belum Pulang' : 'Tidak Hadir'}
                        </span>
                      </div>
                      <div className="py-1.5">
                        {Object.entries(SHIFT_COLORS).map(([key, sc]) => {
                          const inTime  = item[`${key}_in`];
                          const outTime = item[`${key}_out`];
                          const shiftDur = calcDuration(inTime, outTime);
                          return (
                            <div key={key} className="px-[13px] py-1.5 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sc.dot }} />
                              <div className="text-[10.5px] font-semibold w-[42px] flex-shrink-0" style={{ color: sc.text }}>{sc.label}</div>
                              <div className="flex items-center gap-2 flex-1">
                                <span className={`font-mono text-[11.5px] font-semibold ${!inTime ? 'text-slate-200' : 'text-slate-900'}`}>{fmtTime(inTime) || '--:--'}</span>
                                <span className="text-slate-300 text-[11px]">→</span>
                                <span className={`font-mono text-[11.5px] font-semibold ${!outTime ? 'text-slate-200' : 'text-slate-900'}`}>{fmtTime(outTime) || '--:--'}</span>
                                {shiftDur && <span className="font-mono text-[10px] font-semibold bg-slate-50 text-slate-500 border border-slate-200 rounded-[6px] px-1.5 py-0.5">{shiftDur}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {!loading && monthRecords.length === 0 && !selected && (
            <div className="bg-white rounded-[18px] border border-slate-200 px-5 py-10 flex flex-col items-center gap-2.5 text-center">
              <svg className="opacity-20" width="36" height="36" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="7" y="6" width="26" height="28" rx="3"/><line x1="13" y1="14" x2="27" y2="14"/><line x1="13" y1="20" x2="27" y2="20"/><line x1="13" y1="26" x2="21" y2="26"/>
              </svg>
              <div className="text-[13px] font-semibold text-slate-600">Tidak ada data bulan ini</div>
              <div className="text-[11.5px] text-slate-400">Pilih bulan lain atau mulai absen hari ini</div>
            </div>
          )}
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
    </div>
  );
}