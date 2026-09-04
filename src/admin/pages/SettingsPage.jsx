import { useEffect, useState } from 'react';
import { listSiteSettings, saveSiteSetting } from '../api';
import { clearContentCache } from '../../content/ContentProvider';
import { useToast } from '../components/Toasts';

const SWITCHES = [
  {
    key: 'lang_switcher',
    title: 'Переключатель языка (RU / RO / EN)',
    desc: 'Кнопки языка в шапке сайта. Когда выключено, сайт всегда показывает английскую версию, как и было по умолчанию.'
  },
  {
    key: 'supabase_pro',
    title: 'Тариф Supabase — Pro',
    desc: 'Только для шкалы «Место в Supabase» на Обзоре. Выключено = бесплатный тариф (1 ГБ файлов, 500 МБ база). Включено = Pro (100 ГБ файлов, 8 ГБ база). На сам сайт не влияет.',
    onLabel: 'Оплачен план Pro',
    offLabel: 'Оплачен план Pro'
  }
];

export default function SettingsPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState({});
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    listSiteSettings()
      .then(data => { if (!cancelled) setRows(data); })
      .catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  const byKey = {};
  (rows || []).forEach(r => { byKey[r.key] = r; });

  async function toggle(sw, next) {
    setSaving(s => ({ ...s, [sw.key]: true }));
    try {
      const saved = await saveSiteSetting(sw.key, next);
      setRows(list => {
        const rest = (list || []).filter(r => r.key !== sw.key);
        return [...rest, saved];
      });
      clearContentCache();
      toast.success(next ? 'Включено — уже на сайте.' : 'Выключено — уже на сайте.');
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(s => ({ ...s, [sw.key]: false }));
    }
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <div className="adm-eyebrow">Настройки</div>
          <h1>Настройки сайта</h1>
          <p className="adm-lede" style={{ marginBottom: 0 }}>
            Общие переключатели для всего сайта, не привязанные к конкретному проекту или странице.
          </p>
        </div>
      </div>

      {error && <div className="adm-note adm-note--danger"><b>Ошибка</b>{error}</div>}
      {!rows && !error && <div className="adm-loading"><span className="adm-spinner" />Загружаю…</div>}

      {rows && SWITCHES.map(sw => {
        const enabled = byKey[sw.key] ? byKey[sw.key].enabled === true : false;
        return (
          <div className="adm-panel" key={sw.key}>
            <div className="adm-panel-head">
              <div>
                <h2>{sw.title}</h2>
                <p className="adm-hint" style={{ marginTop: 6, maxWidth: '54ch' }}>{sw.desc}</p>
              </div>
              <span className={`adm-status${enabled ? '' : ' adm-status--off'}`}>
                {enabled ? 'включено' : 'выключено'}
              </span>
            </div>
            <label className="adm-check">
              <input
                type="checkbox"
                checked={enabled}
                disabled={!!saving[sw.key]}
                onChange={e => toggle(sw, e.target.checked)}
              />
              {sw.onLabel || 'Показывать на сайте'}
            </label>
          </div>
        );
      })}
    </>
  );
}
