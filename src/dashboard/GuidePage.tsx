import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Clock3, Phone } from 'lucide-react';
import { GUIDES, guideById, type GuideCategory } from '../engines/guide/guide';
import { t } from '../i18n';
import { useDashboard } from '../state/dashboardStore';

// Situation Guide: a fixed, reviewed list of steps for each fraud
// situation — deterministic, on-device, no model, no AI. Reached from the
// Incident screen, the Shield Truth Card, and Home. No dock entry: the
// dock keeps the 12 sections.
//
// Step 11: the list used to be 14 bare links on an empty card. Now it is
// a full page — golden-hour strip first, search + category filters, the
// three most common situations pinned, and every guide as a card with its
// recognition signs and time note visible before any click.

const CATEGORIES: GuideCategory[] = ['money-lost', 'no-loss', 'account', 'message'];
const CATEGORY_KEY: Record<GuideCategory, string> = {
  'money-lost': 'guideCatMoney',
  'no-loss': 'guideCatNoLoss',
  account: 'guideCatAccount',
  message: 'guideCatMessage',
};

function GoldenStrip() {
  const lang = useDashboard((s) => s.settings.language);
  return (
    <section className="db-card" aria-label={t(lang, 'guideFirst')}>
      <h2>{t(lang, 'guideFirst')}</h2>
      <div className="db-golden-strip">
        <a className="db-golden-action call" href="tel:1930">
          <strong>
            <Phone size={16} aria-hidden="true" /> {t(lang, 'guideCall1930')}
          </strong>
          <span>{t(lang, 'guideCallSub')}</span>
        </a>
        <Link className="db-golden-action" to="/bank">
          <strong>{t(lang, 'guideBank')}</strong>
          <span>{t(lang, 'guideBankSub')}</span>
        </Link>
        <a
          className="db-golden-action"
          href="https://cybercrime.gov.in/"
          target="_blank"
          rel="noreferrer"
        >
          <strong>{t(lang, 'guidePortal')}</strong>
          <span>{t(lang, 'guidePortalSub')}</span>
        </a>
      </div>
    </section>
  );
}

function CategoryChip({ category }: { category: GuideCategory }) {
  const lang = useDashboard((s) => s.settings.language);
  return <span className="db-badge gray">{t(lang, CATEGORY_KEY[category])}</span>;
}

export function GuidePage() {
  const lang = useDashboard((s) => s.settings.language);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const guide = guideById(params.get('id'));
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<GuideCategory | 'all'>('all');

  const counts = useMemo(() => {
    const c: Record<GuideCategory, number> = { 'money-lost': 0, 'no-loss': 0, account: 0, message: 0 };
    for (const g of GUIDES) c[g.category] += 1;
    return c;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GUIDES.filter((g) => {
      if (category !== 'all' && g.category !== category) return false;
      if (!q) return true;
      return [g.title, ...g.recognize, ...g.firstFiveMinutes].join(' ').toLowerCase().includes(q);
    });
  }, [query, category]);

  const searching = query.trim().length > 0 || category !== 'all';
  const common = GUIDES.filter((g) => g.common);

  if (guide) {
    return (
      <div className="db-flow">
        <GoldenStrip />
        <Link to="/guide" className="db-btn db-btn-ghost">← {t(lang, 'guideTitle')}</Link>
        <div className="db-card">
          <h2 className="db-page-title">{guide.title}</h2>
          <div>
            <CategoryChip category={guide.category} />
          </div>
          <p className="db-time-note">
            <Clock3 size={16} aria-hidden="true" />
            <span>
              <strong>{t(lang, 'guideTimeWhy')}: </strong>
              {guide.timeNote}
            </span>
          </p>
          <h2>{t(lang, 'guideHRecognize')}</h2>
          <ul>
            {guide.recognize.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h2>{t(lang, 'guideHFirst5')}</h2>
          <ol>
            {guide.firstFiveMinutes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <h2>{t(lang, 'guideHReport')}</h2>
          <ol>
            {guide.reportSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <h2>{t(lang, 'guideHDont')}</h2>
          <ul>
            {guide.dontDo.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h2>{t(lang, 'guideHEvidence')}</h2>
          <ul>
            {guide.evidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h2>{t(lang, 'guideRelated')}</h2>
          <ul>
            {guide.related.map((id) => {
              const rel = guideById(id);
              if (!rel) return null;
              return (
                <li key={id}>
                  <Link to={`/guide?id=${rel.id}`}>{rel.title}</Link>
                </li>
              );
            })}
          </ul>
          <p className="db-muted">
            RAKSHIO report file nahi karta — 1930 / bank / portal par aapko khud contact karna hoga.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="db-flow-wide">
      <GoldenStrip />
      <div className="db-card">
        <p className="db-muted">{t(lang, 'guideSub')}</p>
        <div className="db-search">
          <input
            className="db-input"
            type="search"
            placeholder={t(lang, 'guideSearch')}
            aria-label={t(lang, 'guideSearch')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="db-filter-row" role="group" aria-label={t(lang, 'guideTitle')}>
          <button
            type="button"
            className={`db-filter${category === 'all' ? ' active' : ''}`}
            onClick={() => setCategory('all')}
          >
            {t(lang, 'guideAll')} ({GUIDES.length})
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`db-filter${category === c ? ' active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {t(lang, CATEGORY_KEY[c])} ({counts[c]})
            </button>
          ))}
        </div>
      </div>

      {!searching && (
        <section aria-label={t(lang, 'guideCommon')}>
          <h2 className="db-page-title" style={{ marginBottom: '0.75rem' }}>{t(lang, 'guideCommon')}</h2>
          <div className="db-common-row">
            {common.map((g) => (
              <button
                key={g.id}
                type="button"
                className="db-common-btn"
                onClick={() => navigate(`/guide?id=${g.id}`)}
              >
                <strong>{g.title}</strong>
                <span>{g.recognize[0]}</span>
                <span className="db-muted">{g.timeNote}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section aria-label={t(lang, 'guideAllGuides')}>
        <h2 className="db-page-title" style={{ marginBottom: '0.75rem' }}>
          {t(lang, 'guideAllGuides')} ({filtered.length})
        </h2>
        {filtered.length === 0 ? (
          <div className="db-empty">
            <p>{t(lang, 'guideNoResult')}</p>
          </div>
        ) : (
          <div className="db-guide-grid">
            {filtered.map((g) => (
              <article key={g.id} className="db-card db-guide-card">
                <div>
                  <CategoryChip category={g.category} />
                </div>
                <h3>
                  <Link to={`/guide?id=${g.id}`}>{g.title}</Link>
                </h3>
                <p className="db-time-note">
                  <Clock3 size={16} aria-hidden="true" />
                  <span>{g.timeNote}</span>
                </p>
                <ul>
                  {g.recognize.slice(0, 2).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="db-muted">
                  {g.firstFiveMinutes[0]}{' '}
                  <Link to={`/guide?id=${g.id}`}>{t(lang, 'guideReadFull')} →</Link>
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
