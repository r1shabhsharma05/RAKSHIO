import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDashboard } from '../state/dashboardStore';
import { INCIDENT_STATUSES, STATUS_LABELS, type IncidentStatus } from '../state/incidents';
import { formatINR, fraudTypeLabel } from '../screens/shared';

// Real data only: search/filter over saved incidents, totals from the same
// list, charts from the same list. Empty state when there is nothing.
const STATUS_COLORS: Record<IncidentStatus, string> = {
  reported: '#60a5fa',
  'in-progress': '#f59e0b',
  'awaiting-portal': '#a78bfa',
  'bank-notified': '#38bdf8',
  'evidence-saved': '#34d399',
  closed: '#64748b',
};

export function IncidentsPage() {
  const incidents = useDashboard((s) => s.incidents);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<IncidentStatus | 'all'>('all');
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return incidents.filter((i) => {
      if (status !== 'all' && (i.status ?? 'in-progress') !== status) return false;
      if (!q) return true;
      return [
        i.id,
        i.bank ?? '',
        i.fraudType ?? '',
        i.method ?? '',
        i.amount != null ? String(i.amount) : '',
        i.utr ?? '',
      ].join(' ').toLowerCase().includes(q);
    });
  }, [incidents, query, status]);

  const totalAmount = incidents.reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const closedCount = incidents.filter((i) => i.status === 'closed').length;

  const byType = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of incidents) {
      const k = fraudTypeLabel(i.fraudType);
      map.set(k, (map.get(k) ?? 0) + (i.amount ?? 0));
    }
    return [...map.entries()].map(([name, amount]) => ({ name, amount }));
  }, [incidents]);

  const byStatus = useMemo(
    () =>
      INCIDENT_STATUSES.map((s) => ({
        key: s,
        name: STATUS_LABELS[s],
        value: incidents.filter((i) => (i.status ?? 'in-progress') === s).length,
      })).filter((d) => d.value > 0),
    [incidents],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 className="db-page-title">Incident Dashboard</h1>
        <p className="db-page-sub">Sabhi incidents — search, filter, aur har ek ka detail.</p>
      </div>

      <div className="db-stat-row">
        <div className="db-stat"><div className="n">{incidents.length}</div><div className="l">Total incidents</div></div>
        <div className="db-stat"><div className="n">{formatINR(totalAmount)}</div><div className="l">Total reported amount</div></div>
        <div className="db-stat"><div className="n">{incidents.length - closedCount}</div><div className="l">Open</div></div>
        <div className="db-stat"><div className="n">{closedCount}</div><div className="l">Closed</div></div>
      </div>

      {incidents.length > 0 && (
        <div className="db-grid-home">
          <section className="db-card db-span-6" aria-label="Amount by fraud type">
            <h2>Amount by fraud type</h2>
            {byType.length === 0 ? (
              <p className="db-muted">Koi amount record nahi.</p>
            ) : (
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={byType} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <CartesianGrid stroke="#262626" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#aab8ca', fontSize: 12 }} interval={0} angle={0} textAnchor="middle" height={36} tickFormatter={(v: string) => v.split(' (')[0]} />
                    <YAxis tick={{ fill: '#aab8ca', fontSize: 12 }} tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v) => formatINR(Number(v))} contentStyle={{ background: '#111111', border: '1px solid #262626', color: '#f8fafc' }} />
                    <Bar dataKey="amount" fill="#3159e8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
          <section className="db-card db-span-6" aria-label="Incidents by status">
            <h2>Incidents by status</h2>
            {byStatus.length === 0 ? (
              <p className="db-muted">Koi incident nahi.</p>
            ) : (
              // A pie with one slice is an empty card with a wedge in it.
              // A ranked list with thin bars reads at any count.
              <ul className="db-status-list">
                {byStatus.map((d) => {
                  const max = Math.max(...byStatus.map((x) => x.value));
                  return (
                    <li key={d.key}>
                      <span className="db-status-dot" style={{ background: STATUS_COLORS[d.key] }} aria-hidden="true" />
                      <span className="db-status-name">{d.name}</span>
                      <span className="db-status-bar" aria-hidden="true">
                        <span style={{ width: `${(d.value / max) * 100}%`, background: STATUS_COLORS[d.key] }} />
                      </span>
                      <span className="db-status-count">{d.value}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      <div className="db-search">
        <input
          className="db-input"
          type="search"
          placeholder="Search"
          aria-label="Incidents search karein"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" className="db-btn db-btn-blue" onClick={() => navigate('/report')}>
          Naya incident report karein
        </button>
      </div>
      <div className="db-filter-row" role="group" aria-label="Status filter">
        <button type="button" className={`db-filter${status === 'all' ? ' active' : ''}`} onClick={() => setStatus('all')}>
          All ({incidents.length})
        </button>
        {INCIDENT_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className={`db-filter${status === s ? ' active' : ''}`}
            onClick={() => setStatus(s)}
          >
            {STATUS_LABELS[s]} ({incidents.filter((i) => (i.status ?? 'in-progress') === s).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="db-empty">
          <p>{incidents.length === 0 ? 'Abhi koi incident nahi hai.' : 'Is filter me koi incident nahi mila.'}</p>
          {incidents.length === 0 && (
            <>
              <ul className="db-why" style={{ textAlign: 'left' }}>
                <li>Report Fraud se bolkar ya likhkar batayein — rashi, date, UTR nikal kar incident card banta hai</li>
                <li>Har incident ka status yahan dikhta hai — Reported se Closed tak</li>
                <li>Bina mic ke dekhna ho to Judge Mode ya demo data se shuru karein</li>
              </ul>
              <button type="button" className="db-btn db-btn-red" onClick={() => navigate('/report')}>
                Report Fraud shuru karein
              </button>
              <Link to="/guide">Pehle Situation Guide padhein</Link>
            </>
          )}
        </div>
      ) : (
        <div className="db-grid-home">
          {filtered.map((i) => (
            <Link key={i.id} to={`/incidents/${i.id}`} className="db-incident-card db-span-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <strong>{fraudTypeLabel(i.fraudType)}</strong>
                <span className={`db-badge ${i.status === 'closed' ? 'gray' : i.status === 'reported' ? 'blue' : 'amber'}`}>
                  {STATUS_LABELS[i.status ?? 'in-progress']}
                </span>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{i.amount != null ? formatINR(i.amount) : 'Pata nahi'}</span>
              <span className="db-muted">{i.bank ?? 'Bank pata nahi'} · {new Date(i.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              <span className="db-muted" style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.875rem' }}>#{i.id.replace(/^rk-/, 'RK-').toUpperCase()}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
