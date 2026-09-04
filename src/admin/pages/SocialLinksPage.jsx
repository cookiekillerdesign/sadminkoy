import { useEffect, useState } from 'react';
import { Plus, Trash, CaretUp, CaretDown, DotsSixVertical } from '@phosphor-icons/react';
import {
  listSocialLinks, createSocialLink, updateSocialLink, deleteSocialLink, reorderSocialLinks
} from '../api';
import { clearContentCache } from '../../content/ContentProvider';
import { normalizeSocialLinks } from '../../content/normalize';
import { SOCIAL_ICON_OPTIONS, iconFor } from '../../lib/socialIcons';
import { useToast } from '../components/Toasts';
import Confirm from '../components/Confirm';
import { move, dragProps } from '../reorder';

/* ------------------------------------------------------------- fields ---- */

function Field({ label, value, placeholder, onSave, mono }) {
  const [v, setV] = useState(value || '');
  useEffect(() => { setV(value || ''); }, [value]);
  return (
    <label className="adm-field">
      <span className="adm-label">{label}</span>
      <input
        className="adm-input"
        style={mono ? { fontFamily: "'IBM Plex Mono', monospace" } : undefined}
        value={v}
        onChange={e => setV(e.target.value)}
        onBlur={() => { if (v !== (value || '')) onSave(v); }}
        placeholder={placeholder}
      />
    </label>
  );
}

/* -------------------------------------------------------------- one row -- */

function LinkEditor({ link, index, total, dragIndex, setDragIndex, onReorder, onPatch, onRemove }) {
  const Icon = iconFor(link.icon);
  return (
    <div className={`adm-panel${dragIndex === index ? ' dragging' : ''}`} {...dragProps(index, dragIndex, setDragIndex, onReorder)}>
      <div className="adm-panel-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="adm-drag" title="Перетащите ссылку"><DotsSixVertical size={16} weight="bold" /></span>
          <span style={{ display: 'inline-flex', width: 26, height: 26, borderRadius: 8, background: 'var(--a-raised)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={14} weight="bold" />
          </span>
          <h2>{link.label || 'Без названия'}</h2>
        </div>
        <div className="adm-actions">
          <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => onReorder(index, index - 1)} disabled={index === 0} aria-label="Выше"><CaretUp size={12} weight="bold" /></button>
          <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => onReorder(index, index + 1)} disabled={index === total - 1} aria-label="Ниже"><CaretDown size={12} weight="bold" /></button>
          <button type="button" className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => onRemove(link)}><Trash size={12} weight="bold" />Удалить</button>
        </div>
      </div>

      <div className="adm-row">
        <label className="adm-field">
          <span className="adm-label">Иконка</span>
          <select className="adm-select" value={link.icon} onChange={e => onPatch(link, { icon: e.target.value })}>
            {SOCIAL_ICON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <Field label="Подпись (видимый текст ссылки)" value={link.label} placeholder="WhatsApp" onSave={v => onPatch(link, { label: v })} />
      </div>
      <Field
        label="Куда ведёт"
        value={link.url}
        placeholder="https://wa.me/37369555534 · tel:+37369555534 · mailto:you@example.com"
        mono
        onSave={v => onPatch(link, { url: v })}
      />
      {!link.url && <p className="adm-hint" style={{ marginTop: -6 }}>Без адреса ссылка на сайте не показывается.</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ page -- */

export default function SocialLinksPage() {
  const [links, setLinks] = useState(null);
  const [error, setError] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    listSocialLinks()
      .then(rows => { if (!cancelled) setLinks(normalizeSocialLinks(rows)); })
      .catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  async function reorder(from, to) {
    const previous = links;
    const next = move(links, from, to);
    setLinks(next);
    try {
      await reorderSocialLinks(next.map(l => l.id));
      clearContentCache();
    } catch (err) {
      setLinks(previous);
      toast.error(err);
    }
  }

  async function patch(link, fieldPatch) {
    const previous = links;
    setLinks(list => list.map(l => l.id === link.id ? { ...l, ...fieldPatch } : l));
    try {
      await updateSocialLink(link.id, fieldPatch);
      clearContentCache();
    } catch (err) {
      setLinks(previous);
      toast.error(err);
    }
  }

  async function addLink() {
    const label = newLabel.trim();
    if (!label) { toast.error('Впишите подпись для новой ссылки.'); return; }
    setBusy(true);
    try {
      const row = await createSocialLink({ icon: 'link', label, url: '' });
      setLinks(list => [...(list || []), normalizeSocialLinks([row])[0]]);
      clearContentCache();
      setNewLabel('');
      toast.success('Ссылка добавлена — выберите иконку и впишите адрес ниже.');
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function removeLink() {
    const link = pendingDelete;
    if (!link) return;
    setBusy(true);
    try {
      await deleteSocialLink(link.id);
      setLinks(list => list.filter(l => l.id !== link.id));
      clearContentCache();
      toast.success('Ссылка удалена.');
      setPendingDelete(null);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <div className="adm-eyebrow">Сайт</div>
          <h1>Контакты</h1>
          <p className="adm-lede" style={{ marginBottom: 0 }}>
            Иконки-ссылки в подвале сайта — Behance, LinkedIn, WhatsApp, телефон и что угодно ещё.
            Порядок здесь — порядок на сайте, показываются на каждой странице.
          </p>
        </div>
      </div>

      {error && <div className="adm-note adm-note--danger"><b>Ошибка</b>{error}</div>}
      {!links && !error && <div className="adm-loading"><span className="adm-spinner" />Загружаю…</div>}

      {links && links.length === 0 && (
        <div className="adm-empty">
          <b>Пока пусто</b>
          Сайт показывает исходный набор ссылок из кода, пока здесь нет ни одной. Добавьте первую ниже.
        </div>
      )}

      {links && links.map((link, i) => (
        <LinkEditor
          key={link.id}
          link={link}
          index={i}
          total={links.length}
          dragIndex={dragIndex}
          setDragIndex={setDragIndex}
          onReorder={reorder}
          onPatch={patch}
          onRemove={setPendingDelete}
        />
      ))}

      {links && (
        <div className="adm-panel">
          <div className="adm-panel-head"><h2>Новая ссылка</h2></div>
          <div className="adm-cap-add">
            <input
              className="adm-input"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
              placeholder="Подпись, напр. «Telegram»"
            />
            <button type="button" className="adm-btn adm-btn--primary adm-btn--sm" onClick={addLink} disabled={busy}>
              <Plus size={12} weight="bold" />Добавить
            </button>
          </div>
          <p className="adm-hint" style={{ marginTop: 12 }}>После создания выберите иконку и впишите адрес ниже в карточке.</p>
        </div>
      )}

      <Confirm
        open={Boolean(pendingDelete)}
        title={`Удалить «${pendingDelete?.label || ''}»?`}
        body="Ссылка пропадёт из подвала сайта. Восстановить не получится."
        busy={busy}
        onConfirm={removeLink}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
