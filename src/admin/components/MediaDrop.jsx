import { useRef, useState } from 'react';
import { UploadSimple } from '@phosphor-icons/react';
import { uploadFile, probeDimensions } from '../api';
import { ACCEPTED_MIME, formatBytes, resizeImageIfNeeded } from '../../lib/media';
import { useToast } from './Toasts';

/**
 * Drop zone + file picker. Uploads sequentially rather than in parallel:
 * six 100 MB videos fired at once saturate a home connection and every bar
 * crawls, whereas one at a time finishes the first file in a tenth the time
 * and gives honest feedback about what's happening.
 */
export default function MediaDrop({
  folder,
  multiple = true,
  onUploaded,
  title = 'Перетащите файлы сюда',
  subtitle = 'JPG · PNG · WEBP · GIF · MP4 · WEBM — до 200 МБ',
  // Set only for slots with a small, fixed display size (e.g. the square
  // homepage cover) - downscales an oversized photo client-side before
  // upload so it doesn't cost every visitor bytes it can't even show.
  maxDimension = null
}) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const [queue, setQueue] = useState([]);
  const toast = useToast();

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const batch = multiple ? files : files.slice(0, 1);

    setQueue(batch.map(f => ({ name: f.name, size: f.size, pct: 0, done: false })));

    const uploaded = [];
    for (let i = 0; i < batch.length; i++) {
      const original = batch[i];
      try {
        const file = await resizeImageIfNeeded(original, maxDimension);
        if (file.size !== original.size) {
          setQueue(q => q.map((item, idx) => idx === i ? { ...item, size: file.size } : item));
        }
        const dims = await probeDimensions(file);
        const result = await uploadFile(file, folder, (pct) => {
          setQueue(q => q.map((item, idx) => idx === i ? { ...item, pct } : item));
        });
        setQueue(q => q.map((item, idx) => idx === i ? { ...item, pct: 100, done: true } : item));
        uploaded.push({ ...result, ...dims, originalName: original.name });
      } catch (err) {
        toast.error(err);
        setQueue(q => q.map((item, idx) => idx === i ? { ...item, failed: true } : item));
      }
    }

    if (uploaded.length) {
      try {
        await onUploaded(uploaded);
      } catch (err) {
        toast.error(err);
      }
    }
    setTimeout(() => setQueue([]), 700);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      <div
        className={`adm-drop${over ? ' over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); handleFiles(e.dataTransfer.files); }}
        role="button"
        tabIndex={0}
      >
        <UploadSimple size={26} weight="bold" />
        <span className="adm-drop-title">{title}</span>
        <span className="adm-drop-sub">{subtitle}</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME}
        multiple={multiple}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      {queue.length > 0 && (
        <div style={{ marginTop: 14 }}>
          {queue.map((item, i) => (
            <div className="adm-upload" key={`${item.name}-${i}`}>
              <span className="adm-upload-name">{item.name}</span>
              <span className="adm-upload-bar"><i style={{ width: `${item.pct}%` }} /></span>
              <span className="adm-upload-pct">
                {item.failed ? 'сбой' : item.done ? formatBytes(item.size) : `${item.pct}%`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
