import React, { useState, useEffect, useCallback } from 'react';
import './Analytics.css';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine, faDroplet, faPumpSoap, faPersonWalking,
  faHandsWash, faArrowTrendUp, faArrowTrendDown, faCalendarDays,
  faXmark, faChevronLeft, faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

/* ─── helpers ─── */
const toISO = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const todayISO = () => { const t = new Date(); return toISO(t.getFullYear(), t.getMonth(), t.getDate()); };

const API = '/api/analytics';
const EMPTY = { labels: [], soapUsage: [], waterUsage: [], handwashes: [], unwashed: [] };

/* ─── MiniCalendar ─── */
const DAYS_SHORT   = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const MiniCalendar = ({ label, selected, onSelect, minDate, maxDate }) => {
  const today = new Date();
  const init  = selected ? new Date(selected + 'T00:00:00') : today;
  const [vy, setVy] = useState(init.getFullYear());
  const [vm, setVm] = useState(init.getMonth());

  const prevMonth = () => vm === 0  ? (setVm(11), setVy(y => y - 1)) : setVm(m => m - 1);
  const nextMonth = () => vm === 11 ? (setVm(0),  setVy(y => y + 1)) : setVm(m => m + 1);

  // Block navigating to future months
  const todayYear = today.getFullYear(), todayMonth = today.getMonth();
  const canGoNext = vy < todayYear || (vy === todayYear && vm < todayMonth);

  const firstDay    = new Date(vy, vm, 1).getDay();
  const daysInMonth = new Date(vy, vm + 1, 0).getDate();

  const isoDay   = d => toISO(vy, vm, d);
  const isSel    = d => selected === isoDay(d);
  const isToday  = d => isoDay(d) === todayISO();
  const isDisabled = d => {
    const iso = isoDay(d);
    if (iso > todayISO()) return true;          // future — always blocked
    if (minDate && iso < minDate) return true;
    if (maxDate && iso > maxDate) return true;
    return false;
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="mc-wrap">
      <div className="mc-label">{label}</div>
      <div className="mc-header">
        <button className="mc-nav" onClick={prevMonth}><FontAwesomeIcon icon={faChevronLeft} /></button>
        <span className="mc-month-label">{MONTHS_SHORT[vm]} {vy}</span>
        <button className="mc-nav" onClick={nextMonth} disabled={!canGoNext} style={{ opacity: canGoNext ? 1 : 0.3 }}>
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
      <div className="mc-grid">
        {DAYS_SHORT.map(d => <span key={d} className="mc-day-name">{d}</span>)}
        {cells.map((d, i) =>
          d === null
            ? <span key={`e${i}`} />
            : <button
                key={d}
                className={`mc-day ${isSel(d) ? 'mc-day-sel' : ''} ${isToday(d) ? 'mc-day-today' : ''} ${isDisabled(d) ? 'mc-day-dis' : ''}`}
                onClick={() => !isDisabled(d) && onSelect(isoDay(d))}
                disabled={isDisabled(d)}
              >{d}</button>
        )}
      </div>
    </div>
  );
};

/* ─── DateRangeModal ─── */
const DateRangeModal = ({ fromDate, toDate, onApply, onClose }) => {
  const [from, setFrom] = useState(fromDate);
  const [to,   setTo]   = useState(toDate);
  const fmt = iso => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="drm-overlay" onClick={onClose}>
      <div className="drm-modal" onClick={e => e.stopPropagation()}>

        <div className="drm-header">
          <div className="drm-header-left">
            <div className="drm-header-icon"><FontAwesomeIcon icon={faCalendarDays} /></div>
            <div>
              <span className="drm-title">Select Date Range</span>
              <span className="drm-sub">Only past and today dates are selectable</span>
            </div>
          </div>
          <button className="drm-close" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
        </div>

        <div className="drm-preview">
          <div className={`drm-preview-chip ${from ? 'drm-chip-active' : ''}`}>
            <span className="drm-chip-label">From</span>
            <span className="drm-chip-val">{fmt(from)}</span>
          </div>
          <div className="drm-preview-arrow"><FontAwesomeIcon icon={faChevronRight} /></div>
          <div className={`drm-preview-chip ${to ? 'drm-chip-active' : ''}`}>
            <span className="drm-chip-label">To</span>
            <span className="drm-chip-val">{fmt(to)}</span>
          </div>
        </div>

        <div className="drm-calendars">
          <MiniCalendar label="From" selected={from} onSelect={v => { setFrom(v); if (to && v > to) setTo(''); }} maxDate={to || todayISO()} />
          <div className="drm-cal-divider" />
          <MiniCalendar label="To"   selected={to}   onSelect={setTo}  minDate={from || undefined} maxDate={todayISO()} />
        </div>

        <div className="drm-actions">
          <button className="drm-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="drm-btn-apply" disabled={!from || !to} onClick={() => onApply(from, to)}>
            Apply Range
          </button>
        </div>

      </div>
    </div>
  );
};

/* ─── Chart options ─── */
const lineOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8', maxTicksLimit: 10 } },
    y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, color: '#94a3b8' }, border: { display: false } },
  },
  elements: { line: { tension: 0.4 }, point: { radius: 3, hoverRadius: 6 } },
};

const makeLineData = (labels, data, color) => ({
  labels,
  datasets: [{ data, borderColor: color, backgroundColor: `${color}18`, fill: true, pointBackgroundColor: color, borderWidth: 2.5 }],
});

const ChartCard = ({ title, subtitle, icon, color, children, span }) => (
  <div className={`an-card ${span ? 'an-card-span' : ''}`}>
    <div className="an-card-header">
      <div className="an-card-icon" style={{ background: `${color}18`, color }}><FontAwesomeIcon icon={icon} /></div>
      <div>
        <span className="an-card-title">{title}</span>
        <span className="an-card-sub">{subtitle}</span>
      </div>
    </div>
    <div className="an-chart-wrap">{children}</div>
  </div>
);

/* ─── Main component ─── */
const Analytics = () => {
  const [range,       setRange]       = useState('month');
  const [modalOpen,   setModalOpen]   = useState(false);
  const [fromDate,    setFromDate]    = useState('');
  const [toDate,      setToDate]      = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [d,           setD]           = useState(EMPTY);
  const [loading,     setLoading]     = useState(false);

  const fetchData = useCallback(async (r, from, to) => {
    setLoading(true);
    try {
      let url;
      if (r === 'week')        url = `${API}/week/`;
      else if (r === 'month')  url = `${API}/month/`;
      else                     url = `${API}/range/?from=${from}&to=${to}`;
      const res = await fetch(url);
      const json = await res.json();
      setD(json);
    } catch {
      setD(EMPTY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData('month', '', ''); }, [fetchData]);

  const applyCustomRange = (from, to) => {
    const fmt = iso => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setFromDate(from); setToDate(to);
    setCustomLabel(`${fmt(from)} – ${fmt(to)}`);
    setRange('custom');
    setModalOpen(false);
    fetchData('custom', from, to);
  };

  const clearCustomRange = () => { setCustomLabel(''); setFromDate(''); setToDate(''); setRange('month'); fetchData('month', '', ''); };

  // Derived KPI totals from active data
  const totalSoap    = d.soapUsage.reduce((a, b) => a + b, 0).toFixed(1);
  const totalWater   = d.waterUsage.reduce((a, b) => a + b, 0).toLocaleString();
  const totalWashed  = d.handwashes.reduce((a, b) => a + b, 0).toLocaleString();
  const totalUnwashed = d.unwashed.reduce((a, b) => a + b, 0).toLocaleString();

  const complianceRate = Math.round(
    (d.handwashes.reduce((a, b) => a + b, 0) /
    (d.handwashes.reduce((a, b) => a + b, 0) + d.unwashed.reduce((a, b) => a + b, 0))) * 100
  );

  const KPI = [
    { label: 'Soap Used (L)',   value: totalSoap,    change: '+8%',  up: true,  icon: faPumpSoap,      color: '#6366f1' },
    { label: 'Water Used (L)',  value: totalWater,   change: '+5%',  up: true,  icon: faDroplet,       color: '#0ea5e9' },
    { label: 'Handwashes',      value: totalWashed,  change: '+12%', up: true,  icon: faHandsWash,     color: '#10b981' },
    { label: 'Left Unwashed',   value: totalUnwashed,change: '-18%', up: false, icon: faPersonWalking, color: '#ef4444' },
  ];

  const doughnutData = {
    labels: ['Washed Hands', 'Left Unwashed'],
    datasets: [{ data: [complianceRate, 100 - complianceRate], backgroundColor: ['#10b981', '#ef4444'], borderWidth: 0, hoverOffset: 6 }],
  };

  const doughnutOpts = {
    responsive: true, maintainAspectRatio: false, cutout: '72%',
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 11 }, color: '#64748b', boxWidth: 12, padding: 16 } },
      tooltip: { callbacks: { label: ctx => ` ${ctx.parsed}%` } },
    },
  };

  const soapVsWaterData = {
    labels: d.labels,
    datasets: [
      {
        label: 'Soap (L)',
        data: d.soapUsage,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.12)',
        fill: true,
        pointBackgroundColor: '#6366f1',
        pointRadius: 3,
        pointHoverRadius: 7,
        borderWidth: 2.5,
        tension: 0.4,
      },
      {
        label: 'Water (÷10 L)',
        data: d.waterUsage.map(v => +(v / 10).toFixed(1)),
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14,165,233,0.08)',
        fill: true,
        pointBackgroundColor: '#0ea5e9',
        pointRadius: 3,
        pointHoverRadius: 7,
        borderWidth: 2.5,
        tension: 0.4,
      },
    ],
  };

  const complianceLineData = {
    labels: d.labels,
    datasets: [
      {
        label: 'Handwashes',
        data: d.handwashes,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        fill: true,
        pointBackgroundColor: '#10b981',
        pointRadius: 3,
        pointHoverRadius: 7,
        borderWidth: 2.5,
        tension: 0.4,
      },
      {
        label: 'Left Unwashed',
        data: d.unwashed,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.08)',
        fill: true,
        pointBackgroundColor: '#ef4444',
        pointRadius: 3,
        pointHoverRadius: 7,
        borderWidth: 2.5,
        tension: 0.4,
      },
    ],
  };

  const comparisonLineOpts = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          font: { size: 11, weight: '600' },
          color: '#64748b',
          boxWidth: 10,
          boxHeight: 10,
          borderRadius: 3,
          useBorderRadius: true,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#94a3b8',
        padding: 12,
        cornerRadius: 10,
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: '#94a3b8', maxTicksLimit: 10 },
        border: { display: false },
      },
      y: {
        grid: { color: '#f1f5f9', drawBorder: false },
        ticks: { font: { size: 11 }, color: '#94a3b8' },
        border: { display: false },
      },
    },
    elements: {
      line: { tension: 0.4, borderCapStyle: 'round', borderJoinStyle: 'round' },
      point: { radius: 3, hoverRadius: 7, hoverBorderWidth: 2, hoverBorderColor: '#fff' },
    },
  };

  return (
    <div className="an-page">
      {loading && <div style={{ textAlign: 'center', padding: '8px', color: 'var(--text)', fontSize: '0.85em' }}>Loading data…</div>}
      {modalOpen && <DateRangeModal fromDate={fromDate} toDate={toDate} onApply={applyCustomRange} onClose={() => setModalOpen(false)} />}

      {/* Banner */}
      <div className="an-banner">
        <div className="an-banner-left">
          <div className="an-banner-icon"><FontAwesomeIcon icon={faChartLine} /></div>
          <div>
            <h2 className="an-banner-title">Analytics</h2>
            <p className="an-banner-sub">Hygiene performance insights and usage trends</p>
          </div>
        </div>

        <div className="an-range-toggle">
          <button className={`an-cal-btn ${range === 'custom' ? 'an-cal-btn-active' : ''}`} onClick={() => setModalOpen(true)} title="Custom date range">
            <FontAwesomeIcon icon={faCalendarDays} />
          </button>
          {['week', 'month'].map(r => (
            <button key={r} className={`an-range-btn ${range === r ? 'an-range-active' : ''}`} onClick={() => { setRange(r); setCustomLabel(''); fetchData(r, '', ''); }}>
              {r === 'week' ? 'This Week' : 'This Year'}
            </button>
          ))}
          {customLabel && (
            <span className="an-custom-pill">
              {customLabel}
              <button className="an-custom-clear" onClick={clearCustomRange}><FontAwesomeIcon icon={faXmark} /></button>
            </span>
          )}
        </div>
      </div>

      {/* KPI — driven by active data */}
      <div className="an-kpi-row">
        {KPI.map(({ label, value, change, up, icon, color }) => (
          <div key={label} className="an-kpi">
            <div className="an-kpi-icon" style={{ background: `${color}18`, color }}><FontAwesomeIcon icon={icon} /></div>
            <div className="an-kpi-body">
              <span className="an-kpi-value">{value}</span>
              <span className="an-kpi-label">{label}</span>
            </div>
            <span className={`an-kpi-change ${up ? 'change-up' : 'change-down'}`}>
              <FontAwesomeIcon icon={up ? faArrowTrendUp : faArrowTrendDown} />{change}
            </span>
          </div>
        ))}
        <div className="an-kpi-spacer" />
        <div className="an-kpi-spacer" />
      </div>

      {/* Charts */}
      <div className="an-grid">

        <ChartCard title="Soap Usage" subtitle="Litres consumed over time" icon={faPumpSoap} color="#6366f1">
          <Line options={lineOpts} data={makeLineData(d.labels, d.soapUsage, '#6366f1')} />
        </ChartCard>

        <ChartCard title="Water Usage" subtitle="Litres consumed over time" icon={faDroplet} color="#0ea5e9">
          <Line options={lineOpts} data={makeLineData(d.labels, d.waterUsage, '#0ea5e9')} />
        </ChartCard>

        <ChartCard title="Left Without Washing" subtitle="People who skipped handwashing" icon={faPersonWalking} color="#ef4444">
          <Line options={lineOpts} data={{ labels: d.labels, datasets: [{ data: d.unwashed, borderColor: '#ef4444', backgroundColor: '#ef444430', fill: true, pointBackgroundColor: '#ef4444', borderWidth: 2.5, tension: 0.4 }] }} />
        </ChartCard>

        <ChartCard title="Handwash Count" subtitle="Successful handwash sessions" icon={faHandsWash} color="#10b981">
          <Line options={lineOpts} data={{ labels: d.labels, datasets: [{ data: d.handwashes, borderColor: '#10b981', backgroundColor: '#10b98130', fill: true, pointBackgroundColor: '#10b981', borderWidth: 2.5, tension: 0.4 }] }} />
        </ChartCard>

        <ChartCard title="Compliance Comparison" subtitle="Handwashes vs people who skipped" icon={faArrowTrendUp} color="#10b981" span>
          <Line options={comparisonLineOpts} data={complianceLineData} />
        </ChartCard>

        <ChartCard title="Soap vs Water Usage" subtitle="Normalised consumption over time" icon={faChartLine} color="#6366f1" span>
          <Line options={comparisonLineOpts} data={soapVsWaterData} />
        </ChartCard>

        {/* Doughnut — driven by active compliance rate */}
        <div className="an-card an-card-doughnut">
          <div className="an-card-header">
            <div className="an-card-icon" style={{ background: '#10b98118', color: '#10b981' }}><FontAwesomeIcon icon={faHandsWash} /></div>
            <div>
              <span className="an-card-title">Hygiene Compliance</span>
              <span className="an-card-sub">Overall handwash rate</span>
            </div>
          </div>
          <div className="an-doughnut-wrap">
            <Doughnut options={doughnutOpts} data={doughnutData} />
            <div className="an-doughnut-center">
              <span className="an-doughnut-pct">{complianceRate}%</span>
              <span className="an-doughnut-lbl">Compliance</span>
            </div>
          </div>
        </div>

        {/* Insights — driven by active compliance rate */}
        <div className="an-card an-insight-card">
          <div className="an-card-header">
            <div className="an-card-icon" style={{ background: '#f59e0b18', color: '#f59e0b' }}><FontAwesomeIcon icon={faArrowTrendUp} /></div>
            <div>
              <span className="an-card-title">Key Insights</span>
              <span className="an-card-sub">{customLabel ? `Range: ${customLabel}` : range === 'week' ? 'This Week' : 'This Year'}</span>
            </div>
          </div>
          <div className="an-insights">
            {[
              { color: '#10b981', text: `Handwash compliance is at ${complianceRate}% — ${complianceRate >= 75 ? 'above' : 'below'} the 75% target.` },
              { color: '#6366f1', text: `Total soap used: ${totalSoap} L. ${parseFloat(totalSoap) > 30 ? 'Consider scheduling a refill soon.' : 'Levels are adequate.'}` },
              { color: '#ef4444', text: `${totalUnwashed} people left without washing. ${parseInt(totalUnwashed.replace(',','')) > 100 ? 'Consider audio reminders.' : 'Within acceptable range.'}` },
              { color: '#0ea5e9', text: `Total water used: ${totalWater} L across the selected period.` },
            ].map((ins, i) => (
              <div key={i} className="an-insight-item">
                <span className="an-insight-dot" style={{ background: ins.color }} />
                <p>{ins.text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Analytics;
