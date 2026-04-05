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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #F1F5F9; -webkit-font-smoothing: antialiased; }

        .h-shell { min-height: 100dvh; background: #F1F5F9; display: flex; justify-content: center; }
        .h-frame { width: 100%; max-width: 430px; min-height: 100dvh; background: #F8FAFC; display: flex; flex-direction: column; box-shadow: 0 0 0 1px rgba(0,0,0,.05), 0 8px 48px rgba(0,0,0,.08); }

        .h-header { background: linear-gradient(135deg, #0B1739 0%, #1A336E 100%); padding: 14px 16px 16px; flex-shrink: 0; }
        .h-header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .h-header-title { font-size: 16px; font-weight: 800; color: #fff; }
        .h-header-sub { font-size: 11px; color: rgba(255,255,255,.45); font-weight: 500; margin-top: 1px; }

        /* Streak badge */
        .h-streak { display: flex; align-items: center; gap: 5px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.15); border-radius: 100px; padding: 4px 10px; }
        .h-streak-num { font-size: 13px; font-weight: 800; color: #FCD34D; }
        .h-streak-label { font-size: 10.5px; color: rgba(255,255,255,.5); font-weight: 500; }

        /* Nav in header */
        .h-cal-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .h-nav-btn { width: 30px; height: 30px; border-radius: 8px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.06); color: rgba(255,255,255,.6); display: grid; place-items: center; cursor: pointer; transition: background .13s; }
        .h-nav-btn:hover { background: rgba(255,255,255,.14); }
        .h-month-label { font-size: 14px; font-weight: 700; color: #fff; }
        .h-year-label  { font-size: 11px; color: rgba(255,255,255,.4); text-align: center; }

        /* Stats grid */
        .h-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 14px; }
        .h-stat { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.09); border-radius: 12px; padding: 8px 6px; text-align: center; }
        .h-stat-num { font-size: 17px; font-weight: 800; color: #fff; line-height: 1; }
        .h-stat-num.green  { color: #6EE7B7; }
        .h-stat-num.yellow { color: #FCD34D; }
        .h-stat-num.blue   { color: #93C5FD; font-size: 13px; }
        .h-stat-label { font-size: 9px; color: rgba(255,255,255,.35); margin-top: 3px; font-weight: 500; letter-spacing: .04em; }

        /* Content */
        .h-content { flex: 1; overflow-y: auto; padding: 12px 13px 110px; display: flex; flex-direction: column; gap: 10px; }

        /* Legend */
        .h-legend { display: flex; align-items: center; gap: 12px; padding: 2px; }
        .h-legend-item { display: flex; align-items: center; gap: 5px; font-size: 10.5px; color: #64748B; font-weight: 500; }
        .h-legend-dot { width: 7px; height: 7px; border-radius: 50%; }

        /* Detail expanded card */
        .h-detail { background: #fff; border-radius: 18px; border: 1.5px solid #E2E8F0; overflow: hidden; animation: slideDown .2s cubic-bezier(.22,.68,0,1.1); }
        @keyframes slideDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .h-detail-head { padding: 11px 14px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #F1F5F9; }
        .h-detail-date { font-size: 12.5px; font-weight: 700; color: #0F172A; }

        /* Shift rows inside detail */
        .h-shift-row { padding: 10px 14px; border-bottom: 1px solid #F8FAFC; display: flex; align-items: center; gap: 10px; }
        .h-shift-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .h-shift-name { font-size: 11.5px; font-weight: 700; flex: 1; }
        .h-shift-times { display: flex; align-items: center; gap: 6px; }
        .h-time-chip { display: flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 600; color: #0F172A; font-family: 'JetBrains Mono', monospace; }
        .h-time-sep { color: #CBD5E1; font-size: 12px; }
        .h-dur-chip { font-size: 10px; font-weight: 600; background: #EFF6FF; color: #1D4ED8; border-radius: 6px; padding: 2px 6px; border: 1px solid #BFDBFE; font-family: 'JetBrains Mono', monospace; }
        .h-no-att { padding: 12px 14px; font-size: 12px; color: #94A3B8; text-align: center; }

        /* Badge */
        .h-badge { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: .04em; padding: 3px 9px; border-radius: 100px; }
        .h-badge-full    { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
        .h-badge-partial { background: #FFFBEB; color: #92400E; border: 1px solid #FDE68A; }
        .h-badge-absent  { background: #F8FAFC; color: #94A3B8; border: 1px solid #E2E8F0; }

        /* Section header */
        .h-sec { font-size: 12.5px; font-weight: 700; color: #0F172A; padding: 2px 0; }

        /* Record card */
        .h-rec { background: #fff; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; transition: box-shadow .14s; }
        .h-rec:hover { box-shadow: 0 4px 16px rgba(0,0,0,.07); }
        .h-rec-top { padding: 10px 13px; display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid #F1F5F9; }
        .h-rec-date-num { font-size: 22px; font-weight: 800; color: #0F172A; line-height: 1; letter-spacing: -.04em; width: 34px; flex-shrink: 0; }
        .h-rec-day { font-size: 12px; font-weight: 600; color: #0F172A; }
        .h-rec-month { font-size: 10.5px; color: #64748B; margin-top: 1px; }
        .h-rec-shifts { padding: 6px 0; }
        .h-rec-shift-row { padding: 6px 13px; display: flex; align-items: center; gap: 8px; }
        .h-rec-shift-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .h-rec-shift-label { font-size: 10.5px; font-weight: 600; width: 42px; flex-shrink: 0; }
        .h-rec-times-row { display: flex; align-items: center; gap: 8px; flex: 1; }
        .h-rec-time { font-size: 11.5px; font-weight: 600; color: #0F172A; font-family: 'JetBrains Mono', monospace; }
        .h-rec-time.empty { color: #E2E8F0; }
        .h-rec-arrow { color: #CBD5E1; font-size: 11px; }
        .h-rec-dur { font-size: 10px; font-weight: 600; background: #F8FAFC; color: #64748B; border: 1px solid #E2E8F0; border-radius: 6px; padding: 2px 6px; font-family: 'JetBrains Mono', monospace; }

        /* Empty */
        .h-empty { background: #fff; border-radius: 18px; border: 1px solid #E2E8F0; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
        .h-empty-title { font-size: 13px; font-weight: 600; color: #334155; }
        .h-empty-sub   { font-size: 11.5px; color: #94A3B8; }

        @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:.45} }
        .h-loading { animation: shimmer 1.3s ease infinite; }

        /* Bottom nav */
        .h-bnav-wrap { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; display: flex; justify-content: center; pointer-events: none; width: 100%; }
        .h-bnav { pointer-events: auto; width: 100%; max-width: 430px; background: rgba(255,255,255,.92); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-top: 1px solid rgba(226,232,240,.6); padding: 6px 20px calc(env(safe-area-inset-bottom) + 6px); box-shadow: 0 -4px 24px rgba(0,0,0,.06); }
        .h-bnav-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; width: 100%; }
        .h-bnav-item { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 8px 6px; border-radius: 14px; text-decoration: none; font-size: 10px; font-weight: 600; letter-spacing: .02em; color: #94A3B8; transition: all .2s ease; position: relative; }
        .h-bnav-item:hover { color: #475569; }
        .h-bnav-item.active { color: #1D4ED8; }
        .h-bnav-item.active::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 20px; height: 3px; background: #1D4ED8; border-radius: 0 0 3px 3px; }
        .h-bnav-item svg { opacity: .5; transition: opacity .15s; }
        .h-bnav-item.active svg { stroke: #1D4ED8; opacity: 1; }
      `}</style>

      <div className="h-shell">
        <div className="h-frame">

          {/* ── Header ── */}
          <div className="h-header">
            <div className="h-header-top">
              <div>
                <div className="h-header-title">Riwayat Absensi</div>
                <div className="h-header-sub">{displayName}</div>
              </div>
              {streak > 0 && (
                <div className="h-streak">
                  <IconFire />
                  <span className="h-streak-num">{streak}</span>
                  <span className="h-streak-label">hari berturut</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="h-stats">
              <div className="h-stat">
                <div className="h-stat-num">{monthStats.total}</div>
                <div className="h-stat-label">TOTAL HARI</div>
              </div>
              <div className="h-stat">
                <div className="h-stat-num green">{monthStats.full}</div>
                <div className="h-stat-label">LENGKAP</div>
              </div>
              <div className="h-stat">
                <div className="h-stat-num yellow">{monthStats.partial}</div>
                <div className="h-stat-label">SEBAGIAN</div>
              </div>
              <div className="h-stat">
                <div className="h-stat-num blue">{monthStats.totalTime}</div>
                <div className="h-stat-label">TTL JAM</div>
              </div>
            </div>

            {/* Nav */}
            <div className="h-cal-nav">
              <button className="h-nav-btn" onClick={prevMonth}><IconChevL /></button>
              <div style={{ textAlign:'center' }}>
                <div className="h-month-label">{MONTHS_ID[viewMonth]}</div>
                <div className="h-year-label">{viewYear}</div>
              </div>
              <button className="h-nav-btn" onClick={nextMonth}><IconChevR /></button>
            </div>

            {/* Calendar */}
            {loading
              ? <div style={{ height:100, display:'grid', placeItems:'center' }}>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.3)', fontWeight:500 }} className="h-loading">Memuat data…</div>
                </div>
              : <MonthCalendar year={viewYear} month={viewMonth} attendanceMap={attendanceMap} selectedDate={selected} onSelectDate={setSelected} />
            }
          </div>

          {/* ── Content ── */}
          <div className="h-content">

            {/* Legend */}
            <div className="h-legend">
              <div className="h-legend-item"><div className="h-legend-dot" style={{ background:'#6EE7B7' }} /> Lengkap</div>
              <div className="h-legend-item"><div className="h-legend-dot" style={{ background:'#FCD34D' }} /> Sebagian</div>
            </div>

            {/* Selected detail */}
            {selected && (
              <div className="h-detail">
                <div className="h-detail-head">
                  <div className="h-detail-date">{fmtDateLong(selected)}</div>
                  {selectedRecord
                    ? <span className={`h-badge ${selectedRecord.check_in_time && selectedRecord.check_out_time ? 'h-badge-full' : selectedRecord.check_in_time ? 'h-badge-partial' : 'h-badge-absent'}`}>
                        {selectedRecord.check_in_time && selectedRecord.check_out_time ? '✓ Lengkap' : selectedRecord.check_in_time ? 'Sebagian' : 'Tidak Hadir'}
                      </span>
                    : <span className="h-badge h-badge-absent">Tidak Hadir</span>
                  }
                </div>
                {selectedRecord
                  ? Object.entries(SHIFT_COLORS).map(([key, sc]) => {
                      const inTime  = selectedRecord[`${key}_in`];
                      const outTime = selectedRecord[`${key}_out`];
                      const dur = calcDuration(inTime, outTime);
                      return (
                        <div key={key} className="h-shift-row" style={{ background: sc.bg, borderBottom: `1px solid ${sc.border}` }}>
                          <div className="h-shift-dot" style={{ background: sc.dot }} />
                          <div className="h-shift-name" style={{ color: sc.text }}>Shift {sc.label}</div>
                          <div className="h-shift-times">
                            <div className="h-time-chip"><IconIn /> {fmtTime(inTime) || '–'}</div>
                            <span className="h-time-sep">→</span>
                            <div className="h-time-chip"><IconOut /> {fmtTime(outTime) || '–'}</div>
                            {dur && <div className="h-dur-chip">{dur}</div>}
                          </div>
                        </div>
                      );
                    })
                  : <div className="h-no-att">Tidak ada data absensi untuk tanggal ini.</div>
                }
              </div>
            )}

            {/* Month list */}
            {!loading && monthRecords.length > 0 && (
              <>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 2px' }}>
                  <span className="h-sec">Rekap {MONTHS_ID[viewMonth]}</span>
                  <span style={{ fontSize:10.5, color:'#94A3B8', background:'#F1F5F9', border:'1px solid #E2E8F0', borderRadius:100, padding:'2px 10px', fontWeight:500 }}>
                    {monthRecords.length} hari
                  </span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {monthRecords.map(item => {
                    const dateKey = isoDate(item.attendance_date);
                    const d = dateKey ? new Date(dateKey + 'T00:00:00') : null;
                    const isComplete = item.check_in_time && item.check_out_time;
                    const isPartial  = item.check_in_time && !item.check_out_time;
                    return (
                      <div key={item.attendance_date} className="h-rec">
                        <div className="h-rec-top">
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div className="h-rec-date-num">{d ? fmt2(d.getDate()) : '–'}</div>
                            <div>
                              <div className="h-rec-day">{d ? `${DAYS_ID[d.getDay()]}, ${MONTHS_ID[d.getMonth()]}` : '–'}</div>
                              <div className="h-rec-month">{d?.getFullYear()}</div>
                            </div>
                          </div>
                          <span className={`h-badge ${isComplete ? 'h-badge-full' : isPartial ? 'h-badge-partial' : 'h-badge-absent'}`}>
                            {isComplete ? '✓ Lengkap' : isPartial ? 'Belum Pulang' : 'Tidak Hadir'}
                          </span>
                        </div>
                        <div className="h-rec-shifts">
                          {Object.entries(SHIFT_COLORS).map(([key, sc]) => {
                            const inTime  = item[`${key}_in`];
                            const outTime = item[`${key}_out`];
                            const shiftDur = calcDuration(inTime, outTime);
                            return (
                              <div key={key} className="h-rec-shift-row">
                                <div className="h-rec-shift-dot" style={{ background: sc.dot }} />
                                <div className="h-rec-shift-label" style={{ color: sc.text }}>{sc.label}</div>
                                <div className="h-rec-times-row">
                                  <div className={`h-rec-time${!inTime ? ' empty' : ''}`}>{fmtTime(inTime) || '--:--'}</div>
                                  <span className="h-rec-arrow">→</span>
                                  <div className={`h-rec-time${!outTime ? ' empty' : ''}`}>{fmtTime(outTime) || '--:--'}</div>
                                  {shiftDur && <div className="h-rec-dur">{shiftDur}</div>}
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
              <div className="h-empty">
                <svg style={{ opacity:.2 }} width="36" height="36" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="7" y="6" width="26" height="28" rx="3"/><line x1="13" y1="14" x2="27" y2="14"/><line x1="13" y1="20" x2="27" y2="20"/><line x1="13" y1="26" x2="21" y2="26"/>
                </svg>
                <div className="h-empty-title">Tidak ada data bulan ini</div>
                <div className="h-empty-sub">Pilih bulan lain atau mulai absen hari ini</div>
              </div>
            )}
          </div>

          {/* ── Bottom nav ── */}
          <div className="h-bnav-wrap">
            <div className="h-bnav">
              <nav className="h-bnav-grid">
                <Link to="/" className={`h-bnav-item${routerLocation.pathname === '/' ? ' active' : ''}`}><IconHome /> Beranda</Link>
                <Link to="/history" className={`h-bnav-item${routerLocation.pathname === '/history' ? ' active' : ''}`}><IconHistory /> Riwayat</Link>
                <Link to="/profile" className={`h-bnav-item${routerLocation.pathname === '/profile' ? ' active' : ''}`}><IconUser /> Profil</Link>
              </nav>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}