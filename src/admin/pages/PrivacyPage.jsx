import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ArrowCounterClockwise, FloppyDisk } from '@phosphor-icons/react';
import { getSiteText, saveSiteText } from '../api';
import { useToast } from '../components/Toasts';
import Confirm from '../components/Confirm';
import { PRIVACY_DEFAULT, PRIVACY_LABELS, parsePrivacy } from '../../data/privacy';

const LANGS = [
  { code: 'ru', label: 'Русский' },
  { code: 'ro', label: 'Română' },
  { code: 'en', label: 'English' }
];

const KEY = 'privacy';

export default function PrivacyPage() {
  const [text, setText] = useState(null);   // { ru, ro, en } as in the editor
  const [saved, setSaved] = useState(null);  // last state known to be in the DB
  const [lang, setLang] = useState('ru');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSiteText(KEY)
      .then(row => {
        if (cancelled) return;
        // Empty column = the site shows the default; prefill the editor with
        // it so the admin edits real text rather than a blank box.
        const next = {};
        LANGS.forEach(({ code }) => { next[code] = (row && row[code]) || PRIVACY_DEFAULT[code]; });
        setText(next);
        setSaved(row ? { ru: row.ru || '', ro: row.ro || '', en: row.en || '' } : { ru: '', ro: '', en: '' });
      })
      .catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  const dirty = useMemo(() => {
    if (!text || !saved) return false;
    return LANGS.some(({ code }) => {
      const cur = text[code].trim();
      const was = saved[code].trim();
      // An editor showing the untouched default equals an empty DB column.
      return cur !== was && !(was === '' && cur === PRIVACY_DEFAULT[code].trim());
    });
  }, [text, saved]);

  const preview = useMemo(() => text ? parsePrivacy(text[lang]) : null, [text, lang]);
  const isDefault = text ? text[lang].trim() === PRIVACY_DEFAULT[lang].trim() : true;

  async function save() {
    setSaving(true);
    try {
      // Text identical to the built-in default is stored as NULL, so future
      // code updates to the default keep flowing through until it's edited.
      const payload = {};
      LANGS.forEach(({ code }) => {
        const v = text[code].trim();
        payload[code] = v === PRIVACY_DEFAULT[code].trim() ? null : v;
      });
      const row = await saveSiteText(KEY, payload);
      setSaved({ ru: row.ru || '', ro: row.ro || '', en: row.en || '' });
      toast.success('Сохранено — уже на сайте.');
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  function resetLang() {
    setText(t => ({ ...t, [lang]: PRIVACY_DEFAULT[lang] }));
    setResetOpen(false);
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <div className="adm-eyebrow">Тексты</div>
          <h1>Политика конфиденциальности</h1>
          <p className="adm-lede" style={{ marginBottom: 0 }}>
            Страница <code>/privacy</code>. Три языка, каждый редактируется отдельно. Пустой язык на сайте показывает встроенный текст.
          </p>
        </div>
        <div className="adm-head-actions">
          <a className="adm-btn adm-btn--sm adm-btn--ghost" href="/privacy" target="_blank" rel="noopener noreferrer">
            Открыть страницу<ArrowUpRight size={11} weight="bold" />
          </a>
          <button type="button" className="adm-btn adm-btn--primary" disabled={!dirty || saving} onClick={save}>
            <FloppyDisk size={14} weight="bold" />{saving ? 'Сохраняю…' : 'Сохранить'}
          </button>
        </div>
      </div>

      {error && <div className="adm-note adm-note--danger"><b>Ошибка</b>{error}</div>}
      {!text && !error && <div className="adm-loading"><span className="adm-spinner" />Загружаю…</div>}

      {text && (
        <>
          <div className="adm-note">
            <b>Разметка</b>
            Первый абзац до первого заголовка — вступление под названием страницы.
            Строка <code>## Заголовок</code> начинает нумерованный раздел, пустая строка — новый абзац,
            <code>**жирный**</code> и <code>[текст ссылки](https://адрес)</code> работают внутри абзацев.
            Дата «Обновлено» на странице ставится автоматически при сохранении.
          </div>

          <div className="adm-tabs">
            {LANGS.map(l => (
              <button
                key={l.code}
                type="button"
                className={`adm-tab${lang === l.code ? ' active' : ''}`}
                onClick={() => setLang(l.code)}
              >
                {l.label}
                {text[l.code].trim() !== PRIVACY_DEFAULT[l.code].trim() && <i className="adm-tab-dot" title="Изменён" />}
              </button>
            ))}
          </div>

          <div className="adm-privacy-grid">
            <div className="adm-panel">
              <div className="adm-panel-head">
                <h2>Текст · {LANGS.find(l => l.code === lang).label}</h2>
                <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" disabled={isDefault} onClick={() => setResetOpen(true)}>
                  <ArrowCounterClockwise size={12} weight="bold" />Вернуть стандартный
                </button>
              </div>
              <textarea
                className="adm-textarea adm-textarea--tall adm-input--mono"
                value={text[lang]}
                spellCheck
                lang={lang}
                onChange={e => setText(t => ({ ...t, [lang]: e.target.value }))}
              />
              <p className="adm-hint" style={{ marginTop: 8 }}>
                {preview.sections.length} разделов · {text[lang].trim().length} символов{isDefault ? ' · стандартный текст' : ''}
              </p>
            </div>

            <div className="adm-panel adm-privacy-preview">
              <div className="adm-panel-head"><h2>Как это выглядит</h2></div>
              <div className="adm-privacy-page">
                <p className="adm-privacy-eyebrow">{PRIVACY_LABELS[lang].eyebrow}</p>
                <h3>{PRIVACY_LABELS[lang].title}</h3>
                {preview.intro && <p className="adm-privacy-intro">{preview.intro}</p>}
                {preview.sections.map((s, i) => (
                  <section key={i}>
                    <h4><span>{String(i + 1).padStart(2, '0')}</span>{s.title}</h4>
                    {s.body.map((para, j) => <p key={j} dangerouslySetInnerHTML={{ __html: inlineHtml(para) }} />)}
                  </section>
                ))}
                {!preview.sections.length && <p className="adm-hint">Ни одного раздела — добавьте строку, начинающуюся с <code>## </code>.</p>}
              </div>
            </div>
          </div>
        </>
      )}

      <Confirm
        open={resetOpen}
        title={`Вернуть стандартный текст (${LANGS.find(l => l.code === lang).label})?`}
        body="Текст этого языка в редакторе будет заменён встроенным. На сайт попадёт только после «Сохранить»."
        confirmLabel="Вернуть"
        tone="primary"
        onConfirm={resetLang}
        onCancel={() => setResetOpen(false)}
      />
    </>
  );
}

/* Preview-only renderer. Escapes HTML first, then applies the two inline
   markers, so nothing typed into the textarea can inject markup. */
function inlineHtml(text) {
  const esc = String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}
