import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Plus, Images, FolderOpen, HardDrives } from '@phosphor-icons/react';
import { listProjects, listMedia, listSiteMedia, getUsageStats, listSiteSettings } from '../api';
import { clearContentCache } from '../../content/ContentProvider';
import { useToast } from '../components/Toasts';

export default function Dashboard({ email }) {
  const [stats, setStats] = useState(null);
  const [usage, setUsage] = useState(undefined); // undefined = loading, null = function not installed
  const [pro, setPro] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const projects = await listProjects();
        const perProject = await Promise.all(projects.map(p => listMedia(p.id).catch(() => [])));
        const site = await listSiteMedia();
        if (cancelled) return;
        setStats({
          total: projects.length,
          published: projects.filter(p => p.published).length,
          media: perProject.reduce((n, list) => n + list.length, 0),
          slots: site.filter(s => s.url).length,
          empty: projects.filter((p, i) => perProject[i].length === 0)
        });
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getUsageStats().catch(() => null), listSiteSettings().catch(() => [])])
      .then(([u, settings]) => {
        if (cancelled) return;
        setUsage(u);
        setPro(!!settings.find(r => r.key === 'supabase_pro' && r.enabled));
      });
    return () => { cancelled = true; };
  }, []);

  function refreshSite() {
    clearContentCache();
    toast.success('Кэш сброшен. Откройте сайт — изменения уже там.');
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <div className="adm-eyebrow">Обзор</div>
          <h1>Панель управления</h1>
          <p className="adm-lede" style={{ marginBottom: 0 }}>Вы вошли как {email}. Всё, что здесь меняется, попадает на сайт сразу.</p>
        </div>
        <div className="adm-actions">
          <a className="adm-btn" href="/" target="_blank" rel="noopener noreferrer">Открыть сайт<ArrowUpRight size={13} weight="bold" /></a>
          <Link className="adm-btn adm-btn--primary" to="/admin/projects/new"><Plus size={13} weight="bold" />Новый проект</Link>
        </div>
      </div>

      {error && <div className="adm-note adm-note--danger"><b>Не удалось загрузить данные</b>{error}</div>}

      {!stats && !error && <div className="adm-loading"><span className="adm-spinner" />Загружаю…</div>}

      {stats && (
        <>
          <div className="adm-grid3" style={{ marginBottom: 22 }}>
            <div className="adm-stat"><b>{stats.total}</b><span>проектов всего</span></div>
            <div className="adm-stat"><b>{stats.published}</b><span>видно на сайте</span></div>
            <div className="adm-stat"><b>{stats.media}</b><span>файлов в галереях</span></div>
            <div className="adm-stat"><b>{stats.slots}</b><span>слотов на главной</span></div>
          </div>

          {stats.empty.length > 0 && (
            <div className="adm-note adm-note--warn">
              <b>{stats.empty.length} проект(ов) без единого файла</b>
              На их страницах вместо кадров рисуется абстрактная заглушка. Загрузите фото или видео:{' '}
              {stats.empty.slice(0, 6).map((p, i) => (
                <span key={p.id}>
                  {i > 0 && ', '}
                  <Link to={`/admin/projects/${p.id}`} style={{ textDecoration: 'underline' }}>{p.name}</Link>
                </span>
              ))}
              {stats.empty.length > 6 && ` и ещё ${stats.empty.length - 6}`}.
            </div>
          )}

          <UsagePanel usage={usage} pro={pro} />

          <div className="adm-panel">
            <div className="adm-panel-head"><h2>С чего начать</h2></div>
            <div className="adm-grid2">
              <Link className="adm-btn" to="/admin/home"><Images size={14} weight="bold" />Фото на главной странице</Link>
              <Link className="adm-btn" to="/admin/projects"><FolderOpen size={14} weight="bold" />Проекты в портфолио</Link>
            </div>
            <p className="adm-hint" style={{ marginTop: 16 }}>
              Сайт кэширует контент на 10 минут, чтобы открываться мгновенно. Если правка не видна —
              нажмите кнопку ниже или обновите вкладку сайта с Ctrl+F5 (⌘+Shift+R на Mac).
            </p>
            <div className="adm-actions" style={{ marginTop: 14 }}>
              <button type="button" className="adm-btn adm-btn--sm" onClick={refreshSite}>Сбросить кэш сайта</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* Plan quotas: Supabase doesn't expose them to the browser, so they're
   constants keyed off the "Тариф Supabase — Pro" switch in Settings. */
const PLANS = {
  free: { label: 'Free', storage: 1 * 1024 ** 3, db: 500 * 1024 ** 2 },
  pro:  { label: 'Pro',  storage: 100 * 1024 ** 3, db: 8 * 1024 ** 3 }
};

function fmtBytes(n) {
  if (n >= 1024 ** 3) return (n / 1024 ** 3).toFixed(2) + ' ГБ';
  if (n >= 1024 ** 2) return (n / 1024 ** 2).toFixed(1) + ' МБ';
  return Math.round(n / 1024) + ' КБ';
}

function UsageBar({ label, used, limit, hint }) {
  const pct = Math.min(100, (used / limit) * 100);
  const tone = pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : '';
  return (
    <div className="adm-usage">
      <div className="adm-usage-head">
        <span>{label}</span>
        <b>{fmtBytes(used)} <i>/ {fmtBytes(limit)} · {pct < 1 ? '<1' : Math.round(pct)}%</i></b>
      </div>
      <div className={`adm-usage-bar ${tone}`}><span style={{ width: pct + '%' }} /></div>
      {hint && <p className="adm-hint" style={{ marginTop: 6 }}>{hint}</p>}
    </div>
  );
}

function UsagePanel({ usage, pro }) {
  const plan = pro ? PLANS.pro : PLANS.free;
  return (
    <div className="adm-panel" style={{ marginBottom: 22 }}>
      <div className="adm-panel-head">
        <h2><HardDrives size={15} weight="bold" style={{ verticalAlign: -2, marginRight: 8 }} />Место в Supabase</h2>
        <span className="adm-status">тариф {plan.label}</span>
      </div>
      {usage === undefined && <div className="adm-loading"><span className="adm-spinner" />Считаю…</div>}
      {usage === null && (
        <p className="adm-hint">
          Нет данных: в базе не установлена функция <code>usage_stats()</code>. Выполните
          {' '}<code>supabase/migrate-usage.sql</code> в SQL Editor — и здесь появятся шкалы.
        </p>
      )}
      {usage && (
        <>
          <UsageBar label={`Файлы (bucket media, ${usage.media_files} шт.)`} used={usage.media_bytes} limit={plan.storage} />
          <UsageBar label="База данных" used={usage.db_bytes} limit={plan.db} />
          <p className="adm-hint" style={{ marginTop: 12 }}>
            Лимит — по тарифу, переключается в Настройках. Трафик (egress) Supabase из браузера не отдаёт —
            смотрите в Dashboard → Usage. Освободить место: удалить лишние файлы из галерей, они удаляются и из bucket.
          </p>
        </>
      )}
    </div>
  );
}
