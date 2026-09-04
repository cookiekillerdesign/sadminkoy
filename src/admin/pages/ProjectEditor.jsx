import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowUpRight, Trash, DotsSixVertical, CaretLeft, CaretRight, FloppyDisk, Warning
} from '@phosphor-icons/react';
import MediaDrop from '../components/MediaDrop';
import Confirm from '../components/Confirm';
import { useToast } from '../components/Toasts';
import {
  getProject, createProject, updateProject, deleteProject,
  listMedia, addMedia, updateMedia, deleteMedia, reorderMedia, removeStorageObjects,
  listCapabilityDecks
} from '../api';
import { clearContentCache } from '../../content/ContentProvider';
import { normalizeCapabilityDecks } from '../../content/normalize';
import { LANGS, deckField, itemLabel, STATIC_CAPABILITY_DECKS } from '../../i18n';
import { slugify, isVideo, detectKind } from '../../lib/media';
import { move, dragProps } from '../reorder';

const LANG_LABEL = { ru: 'Русский', ro: 'Română', en: 'English' };

const STATUS_OPTIONS = [
  { value: 'case', label: 'Кейс — работа показана как разбор' },
  { value: 'live', label: 'Работает — продукт живёт в проде' },
  { value: 'dev', label: 'В разработке — ещё не закончен' }
];
const PLATFORM_OPTIONS = [
  { value: 'web', label: 'Веб-платформа' },
  { value: 'ios', label: 'iOS-приложение' },
  { value: 'android', label: 'Android-приложение' },
  { value: 'mobile', label: 'Мобильное приложение' },
  { value: 'print', label: 'Печать и диджитал' }
];
const CATEGORY_OPTIONS = [
  { value: 'product', label: 'Продукт' },
  { value: 'ecommerce', label: 'E-Commerce' },
  { value: 'mobile', label: 'Мобильные' },
  { value: 'branding', label: 'Брендинг' }
];

const BLANK = {
  slug: '', name: '', status: 'case', platform: 'web', category: 'product',
  hue: '#1B3BFF', year: String(new Date().getFullYear()),
  thumb_url: null, preview_url: null, external_url: '',
  chips: [], name_i18n: {}, tags_i18n: {}, overview_i18n: {},
  published: true, sort_order: 0
};

/* ------------------------------------------------------------- covers ---- */

function CoverSlot({ label, hint, ratio, url, storageKey, folder, onSet, maxDimension }) {
  const [confirmClear, setConfirmClear] = useState(false);
  return (
    <div>
      <span className="adm-label">{label}</span>
      {url ? (
        <>
          <div className="adm-media-frame" style={{ aspectRatio: ratio, marginBottom: 10 }}>
            {isVideo(detectKind(url))
              ? <video src={url} muted loop autoPlay playsInline />
              : <img src={url} alt="" />}
          </div>
          <div className="adm-actions">
            <button type="button" className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => setConfirmClear(true)}>
              <Trash size={12} weight="bold" />Убрать
            </button>
          </div>
          <details style={{ marginTop: 10 }}>
            <summary className="adm-hint" style={{ cursor: 'pointer' }}>Заменить файл</summary>
            <div style={{ marginTop: 10 }}>
              <MediaDrop folder={folder} multiple={false} onUploaded={(files) => onSet(files[0], storageKey)} title="Новый файл" subtitle={hint} maxDimension={maxDimension} />
            </div>
          </details>
        </>
      ) : (
        <MediaDrop folder={folder} multiple={false} onUploaded={(files) => onSet(files[0], storageKey)} title="Перетащите файл" subtitle={hint} maxDimension={maxDimension} />
      )}
      <Confirm
        open={confirmClear}
        title="Убрать обложку?"
        body="На сайте вместо неё вернётся сгенерированный узор в цвете проекта."
        confirmLabel="Убрать"
        onConfirm={() => { setConfirmClear(false); onSet(null, storageKey); }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}

/* ------------------------------------------------------------ gallery ---- */

function GalleryCard({ item, index, total, dragIndex, setDragIndex, onReorder, onPatch, onRemove }) {
  const [caption, setCaption] = useState(item.caption || '');
  const video = isVideo(item.kind);

  useEffect(() => { setCaption(item.caption || ''); }, [item.id, item.caption]);

  return (
    <div
      className={`adm-media${dragIndex === index ? ' dragging' : ''}`}
      {...dragProps(index, dragIndex, setDragIndex, onReorder)}
    >
      <div className="adm-media-frame">
        <span className="adm-media-kind">{video ? 'видео' : item.kind === 'gif' ? 'gif' : 'фото'}</span>
        <span className="adm-media-idx">{String(index + 1).padStart(2, '0')}</span>
        {video
          ? <video src={item.url} poster={item.poster_url || undefined} muted loop playsInline preload="metadata" />
          : <img src={item.url} alt="" loading="lazy" />}
      </div>
      <div className="adm-media-body">
        <input
          className="adm-input"
          value={caption}
          onChange={e => setCaption(e.target.value)}
          onBlur={() => { if (caption !== (item.caption || '')) onPatch(item.id, { caption: caption || null }); }}
          placeholder="Подпись (необязательно)"
        />
        <div className="adm-media-foot">
          <div style={{ display: 'flex', gap: 4 }}>
            <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => onReorder(index, index - 1)} disabled={index === 0} aria-label="Левее"><CaretLeft size={11} weight="bold" /></button>
            <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => onReorder(index, index + 1)} disabled={index === total - 1} aria-label="Правее"><CaretRight size={11} weight="bold" /></button>
            <span className="adm-drag" style={{ height: 26, width: 22 }} title="Перетащите"><DotsSixVertical size={13} weight="bold" /></span>
          </div>
          <button type="button" className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => onRemove(item)} aria-label="Удалить кадр"><Trash size={11} weight="bold" /></button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- editor ---- */

export default function ProjectEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(isNew ? BLANK : null);
  const [saved, setSaved] = useState(isNew ? BLANK : null);
  const [media, setMedia] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState('ru');
  const [dragIndex, setDragIndex] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingMediaDelete, setPendingMediaDelete] = useState(null);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const orphanPaths = useRef([]);

  const [decks, setDecks] = useState(null);
  const [decksError, setDecksError] = useState('');

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    (async () => {
      try {
        const [project, mediaRows] = await Promise.all([getProject(id), listMedia(id)]);
        if (cancelled) return;
        setForm(project);
        setSaved(project);
        setMedia(mediaRows);
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isNew]);

  // The chip picker below needs the same deck list the public site reads
  // (see useCapabilityDecks) - fetched here directly rather than through
  // ContentProvider because the admin panel isn't wrapped in that provider.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { decks: d, items } = await listCapabilityDecks();
        if (cancelled) return;
        const normalized = normalizeCapabilityDecks(d, items);
        setDecks(normalized.length ? normalized : STATIC_CAPABILITY_DECKS);
      } catch (err) {
        if (!cancelled) { setDecksError(err.message); setDecks(STATIC_CAPABILITY_DECKS); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // A brand-new project is always "unsaved" — otherwise the button reads
  // "Сохранено" for something that doesn't exist in the database yet.
  const dirty = useMemo(
    () => isNew || Boolean(saved && form && JSON.stringify(form) !== JSON.stringify(saved)),
    [form, saved, isNew]
  );

  // Leaving with unsaved text is the single easiest way to lose work here —
  // uploads save themselves, typed fields don't.
  useEffect(() => {
    if (!dirty || (isNew && !form.name)) return;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    addEventListener('beforeunload', onBeforeUnload);
    return () => removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, isNew, form]);

  const set = useCallback((patch) => setForm(f => ({ ...f, ...patch })), []);

  // ---- autosave plumbing: latest form via ref (so a debounced save always
  // persists what's on screen, not a stale closure) + an in-flight lock so
  // parallel saves can't race each other.
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);
  const inFlightRef = useRef(false);
  const autoErrorShownRef = useRef(false);

  const setI18n = (field, value) => {
    setForm(f => ({ ...f, [field]: { ...(f[field] || {}), [lang]: value } }));
  };

  function toggleChip(itemId) {
    setForm(f => {
      const list = Array.isArray(f.chips) ? f.chips : [];
      const exists = list.includes(itemId);
      return { ...f, chips: exists ? list.filter(id => id !== itemId) : [...list, itemId] };
    });
  }

  function setCover(file, key) {
    const previous = form[key];
    const previousPath = form[`${key}_path`];
    if (previousPath && (!file || file.path !== previousPath)) orphanPaths.current.push(previousPath);
    else if (!file && previous) { /* legacy value with no tracked path — leave the file alone */ }
    set({ [key]: file ? file.url : null, [`${key}_path`]: file ? file.path : null });
  }

  async function save(silent = false) {
    if (inFlightRef.current) return;
    const snapshot = formRef.current;
    const name = (snapshot.name || '').trim();
    const slug = slugify(snapshot.slug || name);
    if (!name) { if (!silent) toast.error('Впишите название проекта.'); return; }
    if (!slug) { if (!silent) toast.error('Не получилось составить адрес проекта. Впишите его латиницей вручную.'); return; }

    inFlightRef.current = true;
    setBusy(true);
    try {
      // *_path are UI bookkeeping for orphan cleanup, not database columns.
      const { thumb_url_path, preview_url_path, ...rest } = snapshot;
      const payload = {
        ...rest,
        name,
        slug,
        year: (snapshot.year || '').trim() || null,
        external_url: (snapshot.external_url || '').trim() || null,
        chips: Array.isArray(snapshot.chips) ? snapshot.chips : []
      };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;

      let result;
      if (isNew) {
        result = await createProject(payload);
      } else {
        result = await updateProject(id, payload);
      }

      if (orphanPaths.current.length) {
        await removeStorageObjects(orphanPaths.current);
        orphanPaths.current = [];
      }

      clearContentCache();
      setSaved(result);
      // Only sync the form to the server row if nothing was typed while the
      // request was in flight - otherwise those keystrokes would be wiped.
      // If it did change, `dirty` stays true and the autosave effect below
      // immediately schedules the next save with the newer state.
      if (formRef.current === snapshot) setForm(result);
      autoErrorShownRef.current = false;
      if (!silent) toast.success(isNew ? 'Проект создан. Теперь всё сохраняется автоматически.' : 'Сохранено — сайт уже обновился.');
      if (isNew) navigate(`/admin/projects/${result.id}`, { replace: true });
    } catch (err) {
      // On autosave, surface the error once (not on every retry tick).
      if (!silent || !autoErrorShownRef.current) toast.error(err);
      if (silent) autoErrorShownRef.current = true;
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  }

  // ---- autosave: any edit on an existing project is persisted ~1.2s after
  // the last keystroke. A brand-new project is still created by the first
  // explicit "Сохранить" (auto-creating rows mid-typing would remount the
  // editor onto the new id and could drop in-flight input) - after that,
  // every field saves itself.
  useEffect(() => {
    if (isNew || !form || !dirty) return;
    const timer = setTimeout(() => { save(true); }, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, saved, dirty, isNew]);

  async function handleUploaded(files) {
    const base = media.length;
    const rows = files.map((f, i) => ({
      project_id: id,
      url: f.url,
      kind: f.kind,
      storage_path: f.path,
      width: f.width,
      height: f.height,
      sort_order: (base + i) * 10
    }));
    const inserted = await addMedia(rows);
    setMedia(list => [...list, ...inserted]);
    clearContentCache();
    toast.success(`Добавлено файлов: ${inserted.length}.`);
  }

  async function patchMedia(mediaId, patch) {
    const previous = media;
    setMedia(list => list.map(m => m.id === mediaId ? { ...m, ...patch } : m));
    try {
      await updateMedia(mediaId, patch);
      clearContentCache();
    } catch (err) {
      setMedia(previous);
      toast.error(err);
    }
  }

  async function reorderGallery(from, to) {
    const next = move(media, from, to);
    const previous = media;
    setMedia(next);
    try {
      await reorderMedia(next.map(m => m.id));
      clearContentCache();
    } catch (err) {
      setMedia(previous);
      toast.error(err);
    }
  }

  async function removeMediaRow() {
    const row = pendingMediaDelete;
    if (!row) return;
    setPendingMediaDelete(null);
    const previous = media;
    setMedia(list => list.filter(m => m.id !== row.id));
    try {
      await deleteMedia(row);
      clearContentCache();
    } catch (err) {
      setMedia(previous);
      toast.error(err);
    }
  }

  async function removeProject() {
    setBusy(true);
    try {
      await deleteProject(id);
      clearContentCache();
      toast.success('Проект удалён.');
      navigate('/admin/projects', { replace: true });
    } catch (err) {
      toast.error(err);
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  if (loadError) return <div className="adm-note adm-note--danger"><b>Не удалось открыть проект</b>{loadError}</div>;
  if (!form) return <div className="adm-loading"><span className="adm-spinner" />Загружаю…</div>;

  const chipList = Array.isArray(form.chips) ? form.chips : [];

  return (
    <>
      <div className="adm-head">
        <div>
          <Link className="adm-btn adm-btn--sm adm-btn--ghost" to="/admin/projects" style={{ marginBottom: 12 }}>
            <ArrowLeft size={12} weight="bold" />Все проекты
          </Link>
          <div className="adm-eyebrow">{isNew ? 'Новый проект' : 'Редактирование'}</div>
          <h1>{form.name || 'Без названия'}</h1>
        </div>
        <div className="adm-actions">
          {!isNew && (
            <a className="adm-btn adm-btn--sm" href={`/project/${form.slug}`} target="_blank" rel="noopener noreferrer">
              Посмотреть<ArrowUpRight size={11} weight="bold" />
            </a>
          )}
          <button type="button" className="adm-btn adm-btn--primary" onClick={() => save(false)} disabled={busy || !dirty}>
            {busy ? <span className="adm-spinner" /> : <FloppyDisk size={13} weight="bold" />}
            {busy ? 'Сохраняю…' : dirty ? 'Сохранить' : 'Сохранено'}
          </button>
        </div>
      </div>

      {isNew && (
        <div className="adm-note adm-note--warn">
          <b><Warning size={13} weight="fill" style={{ verticalAlign: -2, marginRight: 6 }} />Проект ещё не создан</b>
          Нажмите «Сохранить» один раз — дальше каждая правка будет сохраняться автоматически.
        </div>
      )}

      {/* ----------------------------------------------------------- basics */}
      <div className="adm-panel">
        <div className="adm-panel-head"><h2>Основное</h2></div>

        <div className="adm-row">
          <label className="adm-field">
            <span className="adm-label">Название</span>
            <input
              className="adm-input"
              value={form.name || ''}
              onChange={e => {
                const name = e.target.value;
                set(slugTouched ? { name } : { name, slug: slugify(name) });
              }}
              placeholder="Victoriabank"
            />
          </label>

          <label className="adm-field">
            <span className="adm-label">Адрес страницы</span>
            <input
              className="adm-input adm-input--mono"
              value={form.slug || ''}
              onChange={e => { setSlugTouched(true); set({ slug: slugify(e.target.value) }); }}
              placeholder="victoriabank"
            />
            <span className="adm-hint">Только латиница и дефисы. Сайт: /project/{form.slug || '…'}</span>
          </label>
        </div>

        <div className="adm-row">
          <label className="adm-field">
            <span className="adm-label">Статус</span>
            <select className="adm-select" value={form.status} onChange={e => set({ status: e.target.value })}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="adm-field">
            <span className="adm-label">Платформа</span>
            <select className="adm-select" value={form.platform} onChange={e => set({ platform: e.target.value })}>
              {PLATFORM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="adm-field">
            <span className="adm-label">Категория (фильтр в портфолио)</span>
            <select className="adm-select" value={form.category} onChange={e => set({ category: e.target.value })}>
              {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </div>

        <div className="adm-row">
          <label className="adm-field">
            <span className="adm-label">Год</span>
            <input className="adm-input adm-input--mono" value={form.year || ''} onChange={e => set({ year: e.target.value })} placeholder="2025" />
          </label>

          <div className="adm-field">
            <span className="adm-label">Фирменный цвет</span>
            <div className="adm-color">
              <input type="color" value={/^#[0-9a-f]{6}$/i.test(form.hue || '') ? form.hue : '#1B3BFF'} onChange={e => set({ hue: e.target.value })} />
              <input className="adm-input adm-input--mono" value={form.hue || ''} onChange={e => set({ hue: e.target.value })} placeholder="#1B3BFF" />
            </div>
            <span className="adm-hint">Используется в заглушках, акцентах и на карточке проекта.</span>
          </div>

          <label className="adm-field">
            <span className="adm-label">Ссылка наружу (необязательно)</span>
            <input className="adm-input" value={form.external_url || ''} onChange={e => set({ external_url: e.target.value })} placeholder="https://behance.net/…" />
          </label>
        </div>

        <label className="adm-check">
          <input type="checkbox" checked={form.published !== false} onChange={e => set({ published: e.target.checked })} />
          Показывать проект на сайте
        </label>
      </div>

      {/* ------------------------------------------------------------ texts */}
      <div className="adm-panel">
        <div className="adm-panel-head">
          <div>
            <h2>Тексты</h2>
            <p className="adm-hint" style={{ marginTop: 6 }}>Каждый язык заполняется отдельно. Пустое поле подставит название проекта как есть.</p>
          </div>
        </div>

        <div className="adm-tabs">
          {LANGS.map(l => (
            <button key={l} type="button" className={`adm-tab${lang === l ? ' active' : ''}`} onClick={() => setLang(l)}>
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>

        <label className="adm-field">
          <span className="adm-label">Название на этом языке</span>
          <input
            className="adm-input"
            value={(form.name_i18n || {})[lang] || ''}
            onChange={e => setI18n('name_i18n', e.target.value)}
            placeholder={form.name || 'Оставьте пустым, если название не переводится'}
          />
          <span className="adm-hint">Бренды обычно не переводят — оставьте пустым.</span>
        </label>

        <label className="adm-field">
          <span className="adm-label">Подзаголовок / формат работы</span>
          <input
            className="adm-input"
            value={(form.tags_i18n || {})[lang] || ''}
            onChange={e => setI18n('tags_i18n', e.target.value)}
            placeholder="Банковская платформа · Продуктовый дизайн"
          />
        </label>

        <label className="adm-field">
          <span className="adm-label">Описание кейса</span>
          <textarea
            className="adm-textarea"
            rows={5}
            value={(form.overview_i18n || {})[lang] || ''}
            onChange={e => setI18n('overview_i18n', e.target.value)}
            placeholder="Что за продукт, какая была задача, что вы сделали и что изменилось."
          />
          <span className="adm-hint">Этот текст идёт и на страницу кейса, и в описание для поисковиков.</span>
        </label>
      </div>

      {/* ----------------------------------------------------------- covers */}
      <div className="adm-panel">
        <div className="adm-panel-head">
          <div>
            <h2>Обложки</h2>
            <p className="adm-hint" style={{ marginTop: 6 }}>Квадрат — в списке работ на главной. Горизонтальная 4:3 — на карточках страницы «Портфолио», в превью при наведении и фоном в блоке «Следующий проект». Без картинок рисуется узор в фирменном цвете — тоже нормально.</p>
          </div>
        </div>
        <div className="adm-grid2">
          <CoverSlot
            label="Квадрат — список работ на главной"
            hint="Ровно 1:1, от 400×400 — попадает в маленький квадратный блок в списке работ на главной странице. Только туда. Большие фото сжимаются автоматически при загрузке."
            ratio="1 / 1"
            url={form.thumb_url}
            storageKey="thumb_url"
            folder={`projects/${form.slug || 'draft'}/cover`}
            onSet={setCover}
            maxDimension={960}
          />
          <CoverSlot
            label="Горизонтальная 4:3 — портфолио / превью / следующий проект"
            hint="Ровно 4:3, от 1600×1200 — идёт на карточку «Портфолио» (рамка строго 4:3), в large-превью при наведении в списке на главной и растягивается фоном в блоке «Следующий проект». Чем крупнее файл, тем чётче."
            ratio="4 / 3"
            url={form.preview_url}
            storageKey="preview_url"
            folder={`projects/${form.slug || 'draft'}/cover`}
            onSet={setCover}
          />
        </div>
      </div>

      {/* ------------------------------------------------------------ chips */}
      <div className="adm-panel">
        <div className="adm-panel-head">
          <div>
            <h2>Что использовали</h2>
            <p className="adm-hint" style={{ marginTop: 6 }}>
              Отмеченные пункты выводятся тегами на странице кейса. Список берётся из блока «Компетенции» —{' '}
              <Link to="/admin/capabilities">добавить или переименовать пункты можно там</Link>.
            </p>
          </div>
          <span className="adm-status">выбрано: {chipList.length}</span>
        </div>

        {decksError && <div className="adm-note adm-note--warn" style={{ marginBottom: 14 }}><b>Показан запасной список</b>{decksError}</div>}
        {!decks && <div className="adm-loading"><span className="adm-spinner" />Загружаю…</div>}

        {decks && decks.map(deck => (
          <div className="adm-chip-group" key={deck.id}>
            <span>{deckField(deck, 'h3', lang)}</span>
            <div className="adm-chipset">
              {deck.items.map(item => {
                const on = chipList.includes(item.id);
                return (
                  <button key={item.id} type="button" className={`adm-chip${on ? ' on' : ''}`} onClick={() => toggleChip(item.id)} aria-pressed={on}>
                    {itemLabel(item, lang)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ---------------------------------------------------------- gallery */}
      <div className="adm-panel">
        <div className="adm-panel-head">
          <div>
            <h2>Галерея проекта</h2>
            <p className="adm-hint" style={{ marginTop: 6 }}>Фото, гифки и видео. Порядок карточек — порядок на странице кейса.</p>
          </div>
          <span className="adm-status">{media.length} файл(ов)</span>
        </div>

        {isNew ? (
          <div className="adm-empty">
            <b>Сначала сохраните проект</b>
            Файлы привязываются к проекту, поэтому сначала нажмите «Сохранить» вверху — потом появится загрузка.
          </div>
        ) : (
          <>
            <MediaDrop folder={`projects/${form.slug || id}/gallery`} onUploaded={handleUploaded} />

            {media.length > 0 && (
              <div className="adm-media-grid" style={{ marginTop: 18 }}>
                {media.map((m, i) => (
                  <GalleryCard
                    key={m.id}
                    item={m}
                    index={i}
                    total={media.length}
                    dragIndex={dragIndex}
                    setDragIndex={setDragIndex}
                    onReorder={reorderGallery}
                    onPatch={patchMedia}
                    onRemove={setPendingMediaDelete}
                  />
                ))}
              </div>
            )}

            <p className="adm-hint" style={{ marginTop: 16 }}>
              Видео на сайте играет без звука и по кругу, само включается, когда кадр появляется на экране.
              Если подписать <b>каждый</b> кадр, под галереей появится кликабельный список — как в кейсе с логотипами.
            </p>
          </>
        )}
      </div>

      {/* ----------------------------------------------------------- danger */}
      {!isNew && (
        <div className="adm-panel">
          <div className="adm-panel-head"><h2>Удаление</h2></div>
          <p className="adm-hint" style={{ marginBottom: 14 }}>
            Чтобы просто убрать проект с сайта, снимите галочку «Показывать проект на сайте» — данные останутся.
          </p>
          <button type="button" className="adm-btn adm-btn--danger" onClick={() => setConfirmDelete(true)}>
            <Trash size={13} weight="bold" />Удалить проект навсегда
          </button>
        </div>
      )}

      <Confirm
        open={confirmDelete}
        title={`Удалить «${form.name}»?`}
        body={`Вместе с проектом удалятся ${media.length} загруженных файл(ов). Восстановить не получится.`}
        busy={busy}
        onConfirm={removeProject}
        onCancel={() => setConfirmDelete(false)}
      />
      <Confirm
        open={Boolean(pendingMediaDelete)}
        title="Удалить кадр?"
        body="Файл пропадёт со страницы кейса и из хранилища."
        onConfirm={removeMediaRow}
        onCancel={() => setPendingMediaDelete(null)}
      />
    </>
  );
}
