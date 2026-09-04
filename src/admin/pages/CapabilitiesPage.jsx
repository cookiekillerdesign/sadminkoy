import { useEffect, useState } from 'react';
import { Plus, Trash, CaretUp, CaretDown, DotsSixVertical } from '@phosphor-icons/react';
import {
  listCapabilityDecks, createCapabilityDeck, updateCapabilityDeck, deleteCapabilityDeck, reorderCapabilityDecks,
  createCapabilityItem, updateCapabilityItem, deleteCapabilityItem, reorderCapabilityItems
} from '../api';
import { clearContentCache } from '../../content/ContentProvider';
import { normalizeCapabilityDecks } from '../../content/normalize';
import { useToast } from '../components/Toasts';
import Confirm from '../components/Confirm';
import { move, dragProps } from '../reorder';
import { LANGS } from '../../i18n';

const LANG_LABEL = { ru: 'Русский', ro: 'Română', en: 'English' };

/** Merges one language's value into an existing {en,ru,ro} object without
    touching the other two - jsonb columns get overwritten wholesale on
    update, so the full object has to be sent, not just the changed key. */
function withLang(i18n, lang, value) {
  return { ...(i18n || {}), [lang]: value };
}

/** Best available title for a deck, preferring the language currently being
    edited - a freshly created deck (see addDeck) only has one language
    filled in, and it isn't always English. */
function deckTitle(deck, lang) {
  return (deck.i18n.h3[lang] || deck.i18n.h3.en || deck.h3 || '').trim();
}

/* ------------------------------------------------------------- item row --- */

function ItemRow({ item, index, total, lang, dragIndex, setDragIndex, onReorder, onPatch, onRemove }) {
  const [label, setLabel] = useState(item.i18n.label[lang] || '');
  useEffect(() => { setLabel(item.i18n.label[lang] || ''); }, [item.id, lang, item.i18n]);

  return (
    <div className={`adm-cap-item${dragIndex === index ? ' dragging' : ''}`} {...dragProps(index, dragIndex, setDragIndex, onReorder)}>
      <span className="adm-drag" title="Перетащите"><DotsSixVertical size={13} weight="bold" /></span>
      <input
        className="adm-input adm-input--sm"
        value={label}
        onChange={e => setLabel(e.target.value)}
        onBlur={() => { const v = label.trim(); if (v && v !== (item.i18n.label[lang] || '')) onPatch(item, v); else if (!v) setLabel(item.i18n.label[lang] || ''); }}
        placeholder="Название пункта"
      />
      <div style={{ display: 'flex', gap: 4 }}>
        <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => onReorder(index, index - 1)} disabled={index === 0} aria-label="Выше"><CaretUp size={11} weight="bold" /></button>
        <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => onReorder(index, index + 1)} disabled={index === total - 1} aria-label="Ниже"><CaretDown size={11} weight="bold" /></button>
        <button type="button" className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => onRemove(item)} aria-label="Удалить пункт"><Trash size={11} weight="bold" /></button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- deck card - */

function DeckField({ label, value, placeholder, onSave }) {
  const [v, setV] = useState(value || '');
  useEffect(() => { setV(value || ''); }, [value]);
  return (
    <label className="adm-field">
      <span className="adm-label">{label}</span>
      <input
        className="adm-input"
        value={v}
        onChange={e => setV(e.target.value)}
        onBlur={() => { if (v !== (value || '')) onSave(v); }}
        placeholder={placeholder}
      />
    </label>
  );
}

function DeckCard({ deck, index, total, lang, dragIndex, setDragIndex, onReorderDeck, onPatchDeck, onRemoveDeck, onAddItem, onPatchItem, onRemoveItem, onReorderItem }) {
  const [newItem, setNewItem] = useState('');
  const [itemDrag, setItemDrag] = useState(null);

  function submitNewItem() {
    const v = newItem.trim();
    if (!v) return;
    onAddItem(deck, v);
    setNewItem('');
  }

  return (
    <div className={`adm-panel${dragIndex === index ? ' dragging' : ''}`} {...dragProps(index, dragIndex, setDragIndex, onReorderDeck)}>
      <div className="adm-panel-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="adm-drag" title="Перетащите блок"><DotsSixVertical size={16} weight="bold" /></span>
          <h2>{deckTitle(deck, lang) || 'Без названия'}</h2>
        </div>
        <div className="adm-actions">
          <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => onReorderDeck(index, index - 1)} disabled={index === 0} aria-label="Выше"><CaretUp size={12} weight="bold" /></button>
          <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => onReorderDeck(index, index + 1)} disabled={index === total - 1} aria-label="Ниже"><CaretDown size={12} weight="bold" /></button>
          <button type="button" className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => onRemoveDeck(deck)}><Trash size={12} weight="bold" />Удалить блок</button>
        </div>
      </div>

      <div className="adm-row">
        <DeckField label="Верхняя строка слева (напр. «A - Продукт и UX»)" value={deck.i18n.top1[lang]} placeholder="A - Продукт и UX" onSave={v => onPatchDeck(deck, 'top1', v)} />
        <DeckField label="Верхняя строка справа" value={deck.i18n.top2[lang]} placeholder="С чего я начинаю" onSave={v => onPatchDeck(deck, 'top2', v)} />
        <DeckField label="Заголовок блока" value={deck.i18n.h3[lang]} placeholder="Продукт и UX дизайн" onSave={v => onPatchDeck(deck, 'h3', v)} />
      </div>

      <span className="adm-label" style={{ marginTop: 6, display: 'block' }}>Пункты ({deck.items.length})</span>
      <div className="adm-cap-items">
        {deck.items.map((item, i) => (
          <ItemRow
            key={item.id}
            item={item}
            index={i}
            total={deck.items.length}
            lang={lang}
            dragIndex={itemDrag}
            setDragIndex={setItemDrag}
            onReorder={(from, to) => onReorderItem(deck, from, to)}
            onPatch={(it, v) => onPatchItem(deck, it, v)}
            onRemove={onRemoveItem}
          />
        ))}
      </div>

      <div className="adm-cap-add">
        <input
          className="adm-input adm-input--sm"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitNewItem(); } }}
          placeholder="Новый пункт этого языка…"
        />
        <button type="button" className="adm-btn adm-btn--sm" onClick={submitNewItem}><Plus size={12} weight="bold" />Добавить</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ page -- */

export default function CapabilitiesPage() {
  const [decks, setDecks] = useState(null);
  const [error, setError] = useState('');
  const [lang, setLang] = useState('ru');
  const [dragIndex, setDragIndex] = useState(null);
  const [pendingDeckDelete, setPendingDeckDelete] = useState(null);
  const [pendingItemDelete, setPendingItemDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    listCapabilityDecks()
      .then(({ decks: d, items }) => { if (!cancelled) setDecks(normalizeCapabilityDecks(d, items)); })
      .catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  async function reorderDecks(from, to) {
    const next = move(decks, from, to);
    const previous = decks;
    setDecks(next);
    try {
      await reorderCapabilityDecks(next.map(d => d.id));
      clearContentCache();
    } catch (err) {
      setDecks(previous);
      toast.error(err);
    }
  }

  async function patchDeck(deck, field, value) {
    const previous = decks;
    const nextI18n = withLang(deck.i18n[field], lang, value);
    setDecks(list => list.map(d => d.id === deck.id
      ? { ...d, i18n: { ...d.i18n, [field]: nextI18n }, [field]: nextI18n.en || d[field] }
      : d));
    try {
      await updateCapabilityDeck(deck.id, { [`${field}_i18n`]: nextI18n });
      clearContentCache();
    } catch (err) {
      setDecks(previous);
      toast.error(err);
    }
  }

  async function addDeck() {
    const title = newDeckTitle.trim();
    if (!title) { toast.error('Впишите заголовок нового блока.'); return; }
    setBusy(true);
    try {
      const row = await createCapabilityDeck({
        top1_i18n: { [lang]: title }, top2_i18n: {}, h3_i18n: { [lang]: title }
      });
      setDecks(list => [...(list || []), normalizeCapabilityDecks([row], [])[0]]);
      clearContentCache();
      setNewDeckTitle('');
      toast.success('Блок добавлен — заполните остальные языки и пункты.');
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function removeDeck() {
    const deck = pendingDeckDelete;
    if (!deck) return;
    setBusy(true);
    try {
      await deleteCapabilityDeck(deck.id);
      setDecks(list => list.filter(d => d.id !== deck.id));
      clearContentCache();
      toast.success('Блок удалён.');
      setPendingDeckDelete(null);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function addItem(deck, label) {
    try {
      const row = await createCapabilityItem(deck.id, { label_i18n: { [lang]: label } });
      const item = { id: row.id, deck_id: row.deck_id, label: label, i18n: { label: { [lang]: label } } };
      setDecks(list => list.map(d => d.id === deck.id ? { ...d, items: [...d.items, item] } : d));
      clearContentCache();
    } catch (err) {
      toast.error(err);
    }
  }

  async function patchItem(deck, item, value) {
    const previous = decks;
    const nextI18n = withLang(item.i18n.label, lang, value);
    setDecks(list => list.map(d => d.id !== deck.id ? d : {
      ...d,
      items: d.items.map(it => it.id === item.id ? { ...it, i18n: { label: nextI18n }, label: nextI18n.en || value } : it)
    }));
    try {
      await updateCapabilityItem(item.id, { label_i18n: nextI18n });
      clearContentCache();
    } catch (err) {
      setDecks(previous);
      toast.error(err);
    }
  }

  async function removeItem() {
    const item = pendingItemDelete;
    if (!item) return;
    setBusy(true);
    try {
      await deleteCapabilityItem(item.id);
      setDecks(list => list.map(d => ({ ...d, items: d.items.filter(it => it.id !== item.id) })));
      clearContentCache();
      toast.success('Пункт удалён.');
      setPendingItemDelete(null);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function reorderItem(deck, from, to) {
    const previous = decks;
    const nextItems = move(deck.items, from, to);
    setDecks(list => list.map(d => d.id === deck.id ? { ...d, items: nextItems } : d));
    try {
      await reorderCapabilityItems(nextItems.map(it => it.id));
      clearContentCache();
    } catch (err) {
      setDecks(previous);
      toast.error(err);
    }
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <div className="adm-eyebrow">Главная страница</div>
          <h1>Компетенции</h1>
          <p className="adm-lede" style={{ marginBottom: 0 }}>
            Четыре блока со страницы «Компетенции» и списка «Что использовали» в проектах. Каждый пункт заполняется на трёх языках — переключите вкладку ниже. Порядок здесь — порядок на сайте.
          </p>
        </div>
        <div className="adm-tabs">
          {LANGS.map(l => (
            <button key={l} type="button" className={`adm-tab${lang === l ? ' active' : ''}`} onClick={() => setLang(l)}>
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="adm-note adm-note--danger"><b>Ошибка</b>{error}</div>}
      {!decks && !error && <div className="adm-loading"><span className="adm-spinner" />Загружаю…</div>}

      {decks && decks.length === 0 && (
        <div className="adm-empty">
          <b>Пока пусто</b>
          Сайт показывает исходные блоки из кода, пока здесь нет ни одного. Добавьте первый блок ниже.
        </div>
      )}

      {decks && decks.map((deck, i) => (
        <DeckCard
          key={deck.id}
          deck={deck}
          index={i}
          total={decks.length}
          lang={lang}
          dragIndex={dragIndex}
          setDragIndex={setDragIndex}
          onReorderDeck={reorderDecks}
          onPatchDeck={patchDeck}
          onRemoveDeck={setPendingDeckDelete}
          onAddItem={addItem}
          onPatchItem={patchItem}
          onRemoveItem={setPendingItemDelete}
          onReorderItem={reorderItem}
        />
      ))}

      {decks && (
        <div className="adm-panel">
          <div className="adm-panel-head"><h2>Новый блок</h2></div>
          <div className="adm-cap-add">
            <input
              className="adm-input"
              value={newDeckTitle}
              onChange={e => setNewDeckTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDeck(); } }}
              placeholder="Заголовок блока на выбранном языке, напр. «Motion Design»"
            />
            <button type="button" className="adm-btn adm-btn--primary adm-btn--sm" onClick={addDeck} disabled={busy}>
              <Plus size={12} weight="bold" />Добавить блок
            </button>
          </div>
          <p className="adm-hint" style={{ marginTop: 12 }}>После создания заполните верхние строки и переведите заголовок на остальных вкладках языка.</p>
        </div>
      )}

      <Confirm
        open={Boolean(pendingDeckDelete)}
        title={`Удалить блок «${pendingDeckDelete ? deckTitle(pendingDeckDelete, lang) : ''}»?`}
        body="Вместе с блоком удалятся все его пункты. Если какой-то из них был отмечен в проекте как «Что использовали», тег просто перестанет показываться там — само описание проекта не пострадает."
        busy={busy}
        onConfirm={removeDeck}
        onCancel={() => setPendingDeckDelete(null)}
      />
      <Confirm
        open={Boolean(pendingItemDelete)}
        title="Удалить пункт?"
        body="Пункт пропадёт из блока. Если он был отмечен как «Что использовали» в каком-то проекте — тег там тоже пропадёт."
        busy={busy}
        onConfirm={removeItem}
        onCancel={() => setPendingItemDelete(null)}
      />
    </>
  );
}
