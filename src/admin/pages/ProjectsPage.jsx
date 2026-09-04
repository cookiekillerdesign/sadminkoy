import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DotsSixVertical, Plus, PencilSimple, Trash, Eye, EyeSlash, CaretUp, CaretDown } from '@phosphor-icons/react';
import { listProjects, reorderProjects, updateProject, deleteProject } from '../api';
import { clearContentCache } from '../../content/ContentProvider';
import { useToast } from '../components/Toasts';
import Confirm from '../components/Confirm';
import { move, dragProps } from '../reorder';
import { initials } from '../../lib/format';
import { detectKind, isVideo } from '../../lib/media';

const STATUS_LABEL = { live: 'Работает', dev: 'В разработке', case: 'Кейс' };

export default function ProjectsPage() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    listProjects()
      .then(data => { if (!cancelled) setItems(data); })
      .catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  async function applyOrder(next) {
    const previous = items;
    setItems(next); // optimistic — dragging that waits for a round trip feels broken
    try {
      await reorderProjects(next.map(p => p.id));
      clearContentCache();
    } catch (err) {
      setItems(previous);
      toast.error(err);
    }
  }

  function reorder(from, to) {
    applyOrder(move(items, from, to));
  }

  async function togglePublished(project) {
    const next = !project.published;
    setItems(list => list.map(p => p.id === project.id ? { ...p, published: next } : p));
    try {
      await updateProject(project.id, { published: next });
      clearContentCache();
      toast.success(next ? `«${project.name}» снова виден на сайте.` : `«${project.name}» скрыт с сайта.`);
    } catch (err) {
      setItems(list => list.map(p => p.id === project.id ? { ...p, published: !next } : p));
      toast.error(err);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteProject(pendingDelete.id);
      setItems(list => list.filter(p => p.id !== pendingDelete.id));
      clearContentCache();
      toast.success(`«${pendingDelete.name}» удалён.`);
      setPendingDelete(null);
    } catch (err) {
      toast.error(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <div className="adm-eyebrow">Портфолио</div>
          <h1>Проекты</h1>
          <p className="adm-lede" style={{ marginBottom: 0 }}>
            Порядок в списке — это порядок на сайте. Тяните за точки слева или пользуйтесь стрелками.
          </p>
        </div>
        <div className="adm-actions">
          <button type="button" className="adm-btn adm-btn--primary" onClick={() => navigate('/admin/projects/new')}>
            <Plus size={13} weight="bold" />Новый проект
          </button>
        </div>
      </div>

      {error && <div className="adm-note adm-note--danger"><b>Ошибка</b>{error}</div>}
      {!items && !error && <div className="adm-loading"><span className="adm-spinner" />Загружаю…</div>}

      {items && items.length === 0 && (
        <div className="adm-empty">
          <b>Пока ни одного проекта</b>
          Пока список пуст, сайт показывает исходные двенадцать работ из кода.
          Добавьте первый проект — и сайт переключится на базу.
        </div>
      )}

      {items && items.length > 0 && (
        <div className="adm-list">
          {items.map((p, i) => (
            <div
              key={p.id}
              className={`adm-item${dragIndex === i ? ' dragging' : ''}`}
              {...dragProps(i, dragIndex, setDragIndex, reorder)}
            >
              <div className="adm-drag" title="Перетащите, чтобы поменять порядок">
                <DotsSixVertical size={17} weight="bold" />
              </div>

              <div className="adm-thumb">
                {p.thumb_url
                  ? (isVideo(detectKind(p.thumb_url))
                      ? <video src={p.thumb_url} muted loop playsInline />
                      : <img src={p.thumb_url} alt="" />)
                  : <span style={{ color: p.hue }}>{initials(p.name)}</span>}
              </div>

              <div className="adm-item-name">
                <b>{p.name}</b>
                <span>/{p.slug} · {p.year || 'без года'}</span>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`adm-badge adm-badge--${p.status}`}>{STATUS_LABEL[p.status] || p.status}</span>
                {!p.published && <span className="adm-badge adm-badge--hidden">скрыт</span>}
              </div>

              <div className="adm-actions">
                <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => reorder(i, i - 1)} disabled={i === 0} aria-label="Выше">
                  <CaretUp size={12} weight="bold" />
                </button>
                <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => reorder(i, i + 1)} disabled={i === items.length - 1} aria-label="Ниже">
                  <CaretDown size={12} weight="bold" />
                </button>
                <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => togglePublished(p)} title={p.published ? 'Скрыть с сайта' : 'Показать на сайте'}>
                  {p.published ? <Eye size={13} weight="bold" /> : <EyeSlash size={13} weight="bold" />}
                </button>
                <Link className="adm-btn adm-btn--sm" to={`/admin/projects/${p.id}`}>
                  <PencilSimple size={12} weight="bold" />Открыть
                </Link>
                <button type="button" className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => setPendingDelete(p)} aria-label="Удалить">
                  <Trash size={12} weight="bold" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Confirm
        open={Boolean(pendingDelete)}
        title={`Удалить «${pendingDelete?.name || ''}»?`}
        body="Вместе с проектом удалятся все загруженные к нему фото и видео. Восстановить не получится. Если нужно просто убрать проект с сайта — закройте это окно и нажмите иконку глаза."
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
