import { useEffect, useState } from 'react';
import { Plus, Trash, CaretUp, CaretDown, DotsSixVertical } from '@phosphor-icons/react';
import {
  listCertifications, createCertification, updateCertification, deleteCertification, reorderCertifications
} from '../api';
import { clearContentCache } from '../../content/ContentProvider';
import { normalizeCertifications } from '../../content/normalize';
import MediaDrop from '../components/MediaDrop';
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

/* ------------------------------------------------------------ image slot -- */

function CertImage({ url, onSet }) {
  const [confirmClear, setConfirmClear] = useState(false);
  return (
    <div>
      {url ? (
        <>
          <div className="adm-media-frame" style={{ aspectRatio: '1024/791', marginBottom: 8, maxWidth: 220 }}>
            <img src={url} alt="" />
          </div>
          <div className="adm-actions" style={{ marginBottom: 8 }}>
            <button type="button" className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => setConfirmClear(true)}>
              <Trash size={11} weight="bold" />Убрать
            </button>
          </div>
          <details>
            <summary className="adm-hint" style={{ cursor: 'pointer' }}>Заменить скан</summary>
            <div style={{ marginTop: 10, maxWidth: 320 }}>
              <MediaDrop folder="certifications" multiple={false} onUploaded={(files) => onSet(files[0].url)} title="Новый файл" subtitle="JPG · PNG — фото или скан сертификата" />
            </div>
          </details>
        </>
      ) : (
        <div style={{ maxWidth: 320 }}>
          <MediaDrop folder="certifications" multiple={false} onUploaded={(files) => onSet(files[0].url)} title="Загрузите скан" subtitle="JPG · PNG — фото или скан сертификата" />
        </div>
      )}
      <Confirm
        open={confirmClear}
        title="Убрать скан?"
        body="Карточка останется без фото на обороте — на сайте она просто не будет переворачиваться."
        confirmLabel="Убрать"
        onConfirm={() => { setConfirmClear(false); onSet(''); }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}

/* -------------------------------------------------------------- one card - */

function CertCardEditor({ cert, index, total, dragIndex, setDragIndex, onReorder, onPatch, onRemove }) {
  return (
    <div className={`adm-panel${dragIndex === index ? ' dragging' : ''}`} {...dragProps(index, dragIndex, setDragIndex, onReorder)}>
      <div className="adm-panel-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="adm-drag" title="Перетащите карточку"><DotsSixVertical size={16} weight="bold" /></span>
          <h2>{cert.name || 'Без названия'}</h2>
        </div>
        <div className="adm-actions">
          <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => onReorder(index, index - 1)} disabled={index === 0} aria-label="Выше"><CaretUp size={12} weight="bold" /></button>
          <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => onReorder(index, index + 1)} disabled={index === total - 1} aria-label="Ниже"><CaretDown size={12} weight="bold" /></button>
          <button type="button" className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => onRemove(cert)}><Trash size={12} weight="bold" />Удалить</button>
        </div>
      </div>

      <div className="adm-row">
        <Field label="Название сертификата" value={cert.name} placeholder="Adobe Certified Professional - Visual Design" onSave={v => onPatch(cert, { name: v })} />
        <Field label="Кто выдал" value={cert.issuer} placeholder="Adobe" onSave={v => onPatch(cert, { issuer: v })} />
      </div>
      <div className="adm-row">
        <Field label="Дата (как показать на сайте)" value={cert.dateLabel} placeholder="Oct 2020" onSave={v => onPatch(cert, { date_label: v })} />
        <Field label="Код сертификата (необязательно)" value={cert.code} placeholder="FBAF-XM7X" mono onSave={v => onPatch(cert, { code: v })} />
      </div>
      <Field label="Ссылка для проверки подлинности" value={cert.verifyUrl} placeholder="https://verify.certiport.com" onSave={v => onPatch(cert, { verify_url: v })} />

      <span className="adm-label" style={{ marginTop: 6, display: 'block' }}>Скан / фото сертификата</span>
      <CertImage url={cert.img} onSet={(url) => onPatch(cert, { image_url: url })} />
    </div>
  );
}

/* ------------------------------------------------------------------ page -- */

export default function CertificationsPage() {
  const [certs, setCerts] = useState(null);
  const [error, setError] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    listCertifications()
      .then(rows => { if (!cancelled) setCerts(normalizeCertifications(rows)); })
      .catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  async function reorder(from, to) {
    const previous = certs;
    const next = move(certs, from, to);
    setCerts(next);
    try {
      await reorderCertifications(next.map(c => c.id));
      clearContentCache();
    } catch (err) {
      setCerts(previous);
      toast.error(err);
    }
  }

  async function patch(cert, fieldPatch) {
    const previous = certs;
    // fieldPatch uses db column names (date_label, verify_url, image_url) -
    // mirror the same change onto the camelCase shape the UI reads from.
    const uiPatch = {
      ...('date_label' in fieldPatch ? { dateLabel: fieldPatch.date_label } : {}),
      ...('verify_url' in fieldPatch ? { verifyUrl: fieldPatch.verify_url } : {}),
      ...('image_url' in fieldPatch ? { img: fieldPatch.image_url } : {}),
      ...('name' in fieldPatch ? { name: fieldPatch.name } : {}),
      ...('issuer' in fieldPatch ? { issuer: fieldPatch.issuer } : {}),
      ...('code' in fieldPatch ? { code: fieldPatch.code } : {})
    };
    setCerts(list => list.map(c => c.id === cert.id ? { ...c, ...uiPatch } : c));
    try {
      await updateCertification(cert.id, fieldPatch);
      clearContentCache();
    } catch (err) {
      setCerts(previous);
      toast.error(err);
    }
  }

  async function addCert() {
    const name = newName.trim();
    if (!name) { toast.error('Впишите название сертификата.'); return; }
    setBusy(true);
    try {
      const row = await createCertification({ name, issuer: '', date_label: '', code: '', verify_url: '', image_url: '' });
      setCerts(list => [...(list || []), normalizeCertifications([row])[0]]);
      clearContentCache();
      setNewName('');
      toast.success('Сертификат добавлен — заполните остальные поля и загрузите скан.');
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function removeCert() {
    const cert = pendingDelete;
    if (!cert) return;
    setBusy(true);
    try {
      await deleteCertification(cert.id);
      setCerts(list => list.filter(c => c.id !== cert.id));
      clearContentCache();
      toast.success('Сертификат удалён.');
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
          <div className="adm-eyebrow">Главная страница</div>
          <h1>Сертификаты</h1>
          <p className="adm-lede" style={{ marginBottom: 0 }}>
            Карточки в секции «Certifications» на главной. Порядок здесь — порядок на сайте.
            На лицевой стороне — название и статус, на обороте (по наведению/тапу) — сам скан.
          </p>
        </div>
      </div>

      {error && <div className="adm-note adm-note--danger"><b>Ошибка</b>{error}</div>}
      {!certs && !error && <div className="adm-loading"><span className="adm-spinner" />Загружаю…</div>}

      {certs && certs.length === 0 && (
        <div className="adm-empty">
          <b>Пока пусто</b>
          Сайт показывает исходные 5 сертификатов из кода, пока здесь нет ни одного. Добавьте первый ниже.
        </div>
      )}

      {certs && certs.map((cert, i) => (
        <CertCardEditor
          key={cert.id}
          cert={cert}
          index={i}
          total={certs.length}
          dragIndex={dragIndex}
          setDragIndex={setDragIndex}
          onReorder={reorder}
          onPatch={patch}
          onRemove={setPendingDelete}
        />
      ))}

      {certs && (
        <div className="adm-panel">
          <div className="adm-panel-head"><h2>Новый сертификат</h2></div>
          <div className="adm-cap-add">
            <input
              className="adm-input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCert(); } }}
              placeholder="Название, напр. «Google UX Design Certificate»"
            />
            <button type="button" className="adm-btn adm-btn--primary adm-btn--sm" onClick={addCert} disabled={busy}>
              <Plus size={12} weight="bold" />Добавить
            </button>
          </div>
          <p className="adm-hint" style={{ marginTop: 12 }}>После создания заполните остальные поля и загрузите скан ниже в карточке.</p>
        </div>
      )}

      <Confirm
        open={Boolean(pendingDelete)}
        title={`Удалить «${pendingDelete?.name || ''}»?`}
        body="Карточка и загруженный к ней скан пропадут с сайта. Восстановить не получится."
        busy={busy}
        onConfirm={removeCert}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
