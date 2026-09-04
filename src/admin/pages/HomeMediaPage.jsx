import { useEffect, useState } from 'react';
import { Trash, ArrowUpRight } from '@phosphor-icons/react';
import MediaDrop from '../components/MediaDrop';
import Confirm from '../components/Confirm';
import { listSiteMedia, saveSiteMedia, removeStorageObjects } from '../api';
import { clearContentCache } from '../../content/ContentProvider';
import { useToast } from '../components/Toasts';
import { isVideo } from '../../lib/media';

const SLOTS = [
  {
    key: 'hero_media',
    title: 'Фон первого экрана',
    desc: 'Показывается за заголовком «Я убиваю плохой дизайн». Работает и видео, и гифка. Прозрачность лучше держать в районе 30–40%, иначе текст перестанет читаться.',
    hasOpacity: true,
    ratio: 'Лучше всего горизонтальный кадр, минимум 1920×1080'
  },
  {
    key: 'about_media',
    title: 'Фото в блоке «Обо мне»',
    desc: 'Широкая полоса между текстом и цифрами. Подпись под фото берётся из поля «Описание».',
    hasOpacity: false,
    ratio: 'Горизонтальный кадр, примерно 2400×1000'
  },
  {
    key: 'og_image',
    title: 'Картинка для соцсетей',
    desc: 'Превью при отправке ссылки в Telegram, WhatsApp, LinkedIn. Только изображение — видео там не работает.',
    hasOpacity: false,
    ratio: 'Строго 1200×630'
  },
  {
    key: 'special_vet_media',
    title: 'Фото в блоке «Приюты и ветеринары»',
    desc: 'Левая половина карточки в разделе «Side Quests». Пока пусто — вместо фото рисуется сгенерированный узор, ничего не сломается.',
    hasOpacity: false,
    ratio: 'Вертикальный или квадратный кадр, минимум 1200×1200',
    previewRatio: '4 / 5'
  },
  {
    key: 'special_metal_media',
    title: 'Фото в блоке «Метал-группы и лейблы»',
    desc: 'Правая половина карточки в разделе «Side Quests». Пока пусто — вместо фото рисуется сгенерированный узор, ничего не сломается.',
    hasOpacity: false,
    ratio: 'Вертикальный или квадратный кадр, минимум 1200×1200',
    previewRatio: '4 / 5'
  }
];

function SlotCard({ slot, row, onChange }) {
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const toast = useToast();

  const value = row || { key: slot.key, url: '', alt: '', opacity: 1, enabled: true, kind: 'image' };

  async function patch(next, message) {
    setSaving(true);
    try {
      const saved = await saveSiteMedia(slot.key, { ...next, key: slot.key });
      onChange(saved);
      clearContentCache();
      if (message) toast.success(message);
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleUploaded(files) {
    const file = files[0];
    if (!file) return;
    // Replacing the file leaves the previous one orphaned in the bucket.
    if (value.storage_path && value.storage_path !== file.path) {
      await removeStorageObjects([value.storage_path]);
    }
    await patch({
      url: file.url,
      kind: file.kind,
      storage_path: file.path,
      alt: value.alt || '',
      opacity: value.opacity ?? 1,
      enabled: true
    }, 'Файл загружен и уже на сайте.');
  }

  async function clearSlot() {
    setConfirmClear(false);
    if (value.storage_path) await removeStorageObjects([value.storage_path]);
    await patch({ url: null, storage_path: null, poster_url: null }, 'Слот очищен — блок исчез со страницы.');
  }

  return (
    <div className="adm-panel">
      <div className="adm-panel-head">
        <div>
          <h2>{slot.title}</h2>
          <p className="adm-hint" style={{ marginTop: 6, maxWidth: '54ch' }}>{slot.desc}</p>
        </div>
        <span className={`adm-status${value.url ? '' : ' adm-status--off'}`}>
          {value.url ? 'заполнен' : 'пусто'}
        </span>
      </div>

      {value.url ? (
        <>
          <div className="adm-media-frame" style={{ marginBottom: 14, aspectRatio: slot.previewRatio || '21 / 9' }}>
            {isVideo(value.kind)
              ? <video src={value.url} muted loop autoPlay playsInline />
              : <img src={value.url} alt="" />}
          </div>

          <label className="adm-field">
            <span className="adm-label">Описание (подпись и alt для поисковиков)</span>
            <input
              className="adm-input"
              value={value.alt || ''}
              onChange={e => onChange({ ...value, alt: e.target.value })}
              onBlur={e => patch({ ...value, alt: e.target.value })}
              placeholder="Например: рабочий стол с макетами"
            />
          </label>

          {slot.hasOpacity && (
            <label className="adm-field">
              <span className="adm-label">Прозрачность</span>
              <div className="adm-range">
                <input
                  type="range" min="0.05" max="1" step="0.05"
                  value={value.opacity ?? 1}
                  onChange={e => onChange({ ...value, opacity: Number(e.target.value) })}
                  onMouseUp={e => patch({ ...value, opacity: Number(e.target.value) })}
                  onTouchEnd={e => patch({ ...value, opacity: Number(e.target.value) })}
                  onKeyUp={e => patch({ ...value, opacity: Number(e.target.value) })}
                />
                <b>{Math.round((value.opacity ?? 1) * 100)}%</b>
              </div>
            </label>
          )}

          <label className="adm-check" style={{ marginBottom: 16 }}>
            <input
              type="checkbox"
              checked={value.enabled !== false}
              onChange={e => patch({ ...value, enabled: e.target.checked }, e.target.checked ? 'Блок снова виден.' : 'Блок скрыт, файл сохранён.')}
            />
            Показывать на сайте
          </label>

          <div className="adm-actions">
            <button type="button" className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => setConfirmClear(true)} disabled={saving}>
              <Trash size={12} weight="bold" />Убрать файл
            </button>
            <a className="adm-btn adm-btn--sm adm-btn--ghost" href={value.url} target="_blank" rel="noopener noreferrer">
              Открыть оригинал<ArrowUpRight size={11} weight="bold" />
            </a>
            {saving && <span className="adm-spinner" />}
          </div>

          <p className="adm-hint" style={{ marginTop: 14 }}>Чтобы заменить — просто перетащите новый файл ниже.</p>
          <div style={{ marginTop: 10 }}>
            <MediaDrop folder={`site/${slot.key}`} multiple={false} onUploaded={handleUploaded} title="Заменить файл" subtitle={slot.ratio} />
          </div>
        </>
      ) : (
        <MediaDrop folder={`site/${slot.key}`} multiple={false} onUploaded={handleUploaded} subtitle={slot.ratio} />
      )}

      <Confirm
        open={confirmClear}
        title="Убрать файл?"
        body="Файл удалится из хранилища, а блок пропадёт со страницы. Отменить это нельзя."
        confirmLabel="Убрать"
        onConfirm={clearSlot}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}

export default function HomeMediaPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listSiteMedia()
      .then(data => { if (!cancelled) setRows(data); })
      .catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  const byKey = {};
  (rows || []).forEach(r => { byKey[r.key] = r; });

  function update(next) {
    setRows(list => {
      const rest = (list || []).filter(r => r.key !== next.key);
      return [...rest, next];
    });
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <div className="adm-eyebrow">Главная страница</div>
          <h1>Фото и видео</h1>
          <p className="adm-lede" style={{ marginBottom: 0 }}>
            Пять слотов на главной. Пустой слот на сайте не рисуется вообще — блок просто отсутствует
            (кроме двух блоков Side Quests — там вместо пустого места остаётся сгенерированный узор),
            так что можно спокойно оставить что-то незаполненным.
          </p>
        </div>
      </div>

      <div className="adm-note">
        <b>Миниатюры проектов — не здесь</b>
        Квадратные картинки в списке работ и превью, которое всплывает при наведении, задаются
        внутри каждого проекта: «Проекты» → нужный проект → блок «Обложки».
      </div>

      {error && <div className="adm-note adm-note--danger"><b>Ошибка</b>{error}</div>}
      {!rows && !error && <div className="adm-loading"><span className="adm-spinner" />Загружаю…</div>}

      {rows && SLOTS.map(slot => (
        <SlotCard key={slot.key} slot={slot} row={byKey[slot.key]} onChange={update} />
      ))}
    </>
  );
}
