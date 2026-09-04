import { supabase } from '../lib/supabase';
import { SUPABASE_URL, MEDIA_BUCKET } from '../lib/supabaseConfig';
import { detectKind, safeFileName, MAX_FILE_BYTES, formatBytes } from '../lib/media';

/* ============================================================================
 * Every function here throws a plain Error with a message that is already
 * written for the person using the panel. Supabase's raw messages ("new row
 * violates row-level security policy for table \"projects\"") are accurate and
 * completely useless to a designer, so they get translated at the boundary.
 * ========================================================================== */

function fail(error, fallback) {
  if (!error) return;
  const code = error.code || '';
  const msg = String(error.message || '');
  if (code === '42501' || /row-level security/i.test(msg)) {
    throw new Error('Нет прав на это действие. Убедитесь, что ваш аккаунт добавлен в список администраторов (см. инструкцию, шаг 4).');
  }
  if (code === '23505' || /duplicate key/i.test(msg)) {
    throw new Error('Такой адрес проекта (slug) уже занят. Придумайте другой.');
  }
  if (/Failed to fetch|NetworkError/i.test(msg)) {
    throw new Error('Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.');
  }
  if (code === '42P01' || /relation .* does not exist/i.test(msg)) {
    throw new Error('В базе ещё нет нужных таблиц. Откройте supabase/schema.sql и выполните его в Supabase → SQL Editor, затем обновите страницу.');
  }
  throw new Error(fallback ? `${fallback} ${msg}` : msg);
}

function db() {
  if (!supabase) throw new Error('Supabase не настроен. Добавьте переменные окружения и перезапустите деплой.');
  return supabase;
}

/* ---------------------------------------------------------------- auth ---- */

export async function signIn(email, password) {
  const { data, error } = await db().auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    if (/Invalid login credentials/i.test(error.message)) throw new Error('Неверная почта или пароль.');
    if (/Email not confirmed/i.test(error.message)) throw new Error('Почта не подтверждена. Откройте письмо от Supabase или подтвердите пользователя вручную.');
    throw new Error(error.message);
  }
  return data.user;
}

export async function signOut() {
  await db().auth.signOut();
}

/** Confirms the logged-in user is on the admin allowlist, not merely signed in. */
export async function checkAdmin() {
  const { data, error } = await db().from('admin_users').select('user_id').limit(1);
  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

/* ------------------------------------------------------------ projects ---- */

export async function listProjects() {
  const { data, error } = await db()
    .from('projects').select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  fail(error, 'Не удалось загрузить проекты.');
  return data || [];
}

export async function getProject(id) {
  const { data, error } = await db().from('projects').select('*').eq('id', id).single();
  fail(error, 'Не удалось открыть проект.');
  return data;
}

export async function createProject(payload) {
  // Without this every new project is created with sort_order 0 and they all
  // pile up at the top in whatever order the database felt like returning.
  const body = { ...payload };
  if (!body.sort_order) {
    const { data: last } = await db()
      .from('projects').select('sort_order')
      .order('sort_order', { ascending: false }).limit(1);
    body.sort_order = ((last && last[0] && last[0].sort_order) || 0) + 10;
  }
  const { data, error } = await db().from('projects').insert(body).select().single();
  fail(error, 'Не удалось создать проект.');
  return data;
}

export async function updateProject(id, patch) {
  const { data, error } = await db().from('projects').update(patch).eq('id', id).select().single();
  fail(error, 'Не удалось сохранить проект.');
  return data;
}

export async function deleteProject(id) {
  // Media rows cascade in the database; their files in Storage don't, so they
  // are collected and removed first or the bucket slowly fills with orphans.
  const media = await listMedia(id);
  const paths = media.map(m => m.storage_path).filter(Boolean);
  if (paths.length) await removeStorageObjects(paths);
  const { error } = await db().from('projects').delete().eq('id', id);
  fail(error, 'Не удалось удалить проект.');
}

export async function reorderProjects(orderedIds) {
  const updates = orderedIds.map((id, i) =>
    db().from('projects').update({ sort_order: i * 10 }).eq('id', id)
  );
  const results = await Promise.all(updates);
  const bad = results.find(r => r.error);
  if (bad) fail(bad.error, 'Не удалось сохранить порядок.');
}

/* --------------------------------------------------------------- media ---- */

export async function listMedia(projectId) {
  const { data, error } = await db()
    .from('project_media').select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  fail(error, 'Не удалось загрузить медиа.');
  return data || [];
}

export async function addMedia(rows) {
  const { data, error } = await db().from('project_media').insert(rows).select();
  fail(error, 'Не удалось добавить медиа.');
  return data || [];
}

export async function updateMedia(id, patch) {
  const { data, error } = await db().from('project_media').update(patch).eq('id', id).select().single();
  fail(error, 'Не удалось изменить медиа.');
  return data;
}

export async function deleteMedia(row) {
  const { error } = await db().from('project_media').delete().eq('id', row.id);
  fail(error, 'Не удалось удалить медиа.');
  if (row.storage_path) await removeStorageObjects([row.storage_path]);
}

export async function reorderMedia(orderedIds) {
  const results = await Promise.all(orderedIds.map((id, i) =>
    db().from('project_media').update({ sort_order: i * 10 }).eq('id', id)
  ));
  const bad = results.find(r => r.error);
  if (bad) fail(bad.error, 'Не удалось сохранить порядок кадров.');
}

/* ----------------------------------------------------------- site media --- */

export async function listSiteMedia() {
  const { data, error } = await db().from('site_media').select('*');
  fail(error, 'Не удалось загрузить медиа главной страницы.');
  return data || [];
}

export async function saveSiteMedia(key, patch) {
  const { data, error } = await db()
    .from('site_media')
    .upsert({ key, ...patch }, { onConflict: 'key' })
    .select().single();
  fail(error, 'Не удалось сохранить слот.');
  return data;
}

/* ---------------------------------------------------------- settings ---- */

export async function listSiteSettings() {
  const { data, error } = await db().from('site_settings').select('*');
  fail(error, 'Не удалось загрузить настройки сайта.');
  return data || [];
}

export async function saveSiteSetting(key, enabled) {
  const { data, error } = await db()
    .from('site_settings')
    .upsert({ key, enabled }, { onConflict: 'key' })
    .select().single();
  fail(error, 'Не удалось сохранить настройку.');
  return data;
}

/* ------------------------------------------------------- capabilities ---- */
/* "Компетенции" — the four deck cards on the homepage and the chip picker in
   the project editor. Same append-at-the-end sort_order convention as
   projects/media above, and the same optimistic-update-in-the-UI pattern is
   used by the page that calls these (see CapabilitiesPage.jsx). */

export async function listCapabilityDecks() {
  const [{ data: decks, error: e1 }, { data: items, error: e2 }] = await Promise.all([
    db().from('capability_decks').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
    db().from('capability_items').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true })
  ]);
  fail(e1 || e2, 'Не удалось загрузить компетенции.');
  return { decks: decks || [], items: items || [] };
}

export async function createCapabilityDeck(payload) {
  const body = { ...payload };
  if (!body.sort_order) {
    const { data: last } = await db()
      .from('capability_decks').select('sort_order')
      .order('sort_order', { ascending: false }).limit(1);
    body.sort_order = ((last && last[0] && last[0].sort_order) || 0) + 10;
  }
  const { data, error } = await db().from('capability_decks').insert(body).select().single();
  fail(error, 'Не удалось создать блок.');
  return data;
}

export async function updateCapabilityDeck(id, patch) {
  const { data, error } = await db().from('capability_decks').update(patch).eq('id', id).select().single();
  fail(error, 'Не удалось сохранить блок.');
  return data;
}

export async function deleteCapabilityDeck(id) {
  // Items cascade in the database (see supabase/schema.sql), and any project
  // chips pointing at those items are just orphaned ids that resolveChipLabels
  // silently drops - nothing else needs cleaning up here.
  const { error } = await db().from('capability_decks').delete().eq('id', id);
  fail(error, 'Не удалось удалить блок.');
}

export async function reorderCapabilityDecks(orderedIds) {
  const results = await Promise.all(orderedIds.map((id, i) =>
    db().from('capability_decks').update({ sort_order: i * 10 }).eq('id', id)
  ));
  const bad = results.find(r => r.error);
  if (bad) fail(bad.error, 'Не удалось сохранить порядок блоков.');
}

export async function createCapabilityItem(deckId, payload) {
  const body = { deck_id: deckId, ...payload };
  if (!body.sort_order) {
    const { data: last } = await db()
      .from('capability_items').select('sort_order')
      .eq('deck_id', deckId)
      .order('sort_order', { ascending: false }).limit(1);
    body.sort_order = ((last && last[0] && last[0].sort_order) || 0) + 10;
  }
  const { data, error } = await db().from('capability_items').insert(body).select().single();
  fail(error, 'Не удалось добавить пункт.');
  return data;
}

export async function updateCapabilityItem(id, patch) {
  const { data, error } = await db().from('capability_items').update(patch).eq('id', id).select().single();
  fail(error, 'Не удалось сохранить пункт.');
  return data;
}

export async function deleteCapabilityItem(id) {
  const { error } = await db().from('capability_items').delete().eq('id', id);
  fail(error, 'Не удалось удалить пункт.');
}

export async function reorderCapabilityItems(orderedIds) {
  const results = await Promise.all(orderedIds.map((id, i) =>
    db().from('capability_items').update({ sort_order: i * 10 }).eq('id', id)
  ));
  const bad = results.find(r => r.error);
  if (bad) fail(bad.error, 'Не удалось сохранить порядок пунктов.');
}

/* ----------------------------------------------------------- certifications */
/* "Сертификаты" - the credential cards in the homepage's Certifications
   section. Flat list, no per-language columns (see normalizeCertifications),
   same append-at-the-end sort_order convention and optimistic-update pattern
   as capabilities above. */

export async function listCertifications() {
  const { data, error } = await db()
    .from('certifications').select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  fail(error, 'Не удалось загрузить сертификаты.');
  return data || [];
}

export async function createCertification(payload) {
  const body = { ...payload };
  if (!body.sort_order) {
    const { data: last } = await db()
      .from('certifications').select('sort_order')
      .order('sort_order', { ascending: false }).limit(1);
    body.sort_order = ((last && last[0] && last[0].sort_order) || 0) + 10;
  }
  const { data, error } = await db().from('certifications').insert(body).select().single();
  fail(error, 'Не удалось добавить сертификат.');
  return data;
}

export async function updateCertification(id, patch) {
  const { data, error } = await db().from('certifications').update(patch).eq('id', id).select().single();
  fail(error, 'Не удалось сохранить сертификат.');
  return data;
}

export async function deleteCertification(id) {
  const { error } = await db().from('certifications').delete().eq('id', id);
  fail(error, 'Не удалось удалить сертификат.');
}

export async function reorderCertifications(orderedIds) {
  const results = await Promise.all(orderedIds.map((id, i) =>
    db().from('certifications').update({ sort_order: i * 10 }).eq('id', id)
  ));
  const bad = results.find(r => r.error);
  if (bad) fail(bad.error, 'Не удалось сохранить порядок сертификатов.');
}

/* ----------------------------------------------------------- social links */
/* "Контакты" - the footer's "ways to contact me" links (Behance, LinkedIn,
   WhatsApp, tel:, ...), shown on every page. Flat list, same append-at-the-
   end sort_order convention and optimistic-update pattern as certifications
   above. */

export async function listSocialLinks() {
  const { data, error } = await db()
    .from('social_links').select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  fail(error, 'Не удалось загрузить контакты.');
  return data || [];
}

export async function createSocialLink(payload) {
  const body = { ...payload };
  if (!body.sort_order) {
    const { data: last } = await db()
      .from('social_links').select('sort_order')
      .order('sort_order', { ascending: false }).limit(1);
    body.sort_order = ((last && last[0] && last[0].sort_order) || 0) + 10;
  }
  const { data, error } = await db().from('social_links').insert(body).select().single();
  fail(error, 'Не удалось добавить ссылку.');
  return data;
}

export async function updateSocialLink(id, patch) {
  const { data, error } = await db().from('social_links').update(patch).eq('id', id).select().single();
  fail(error, 'Не удалось сохранить ссылку.');
  return data;
}

export async function deleteSocialLink(id) {
  const { error } = await db().from('social_links').delete().eq('id', id);
  fail(error, 'Не удалось удалить ссылку.');
}

export async function reorderSocialLinks(orderedIds) {
  const results = await Promise.all(orderedIds.map((id, i) =>
    db().from('social_links').update({ sort_order: i * 10 }).eq('id', id)
  ));
  const bad = results.find(r => r.error);
  if (bad) fail(bad.error, 'Не удалось сохранить порядок ссылок.');
}

/* -------------------------------------------------------------- storage --- */

export function publicUrl(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

export async function removeStorageObjects(paths) {
  if (!paths.length) return;
  // A failed cleanup must never block the delete the person actually asked for.
  const { error } = await db().storage.from(MEDIA_BUCKET).remove(paths);
  if (error) console.warn('Не удалось удалить файлы из хранилища:', error.message);
}

/**
 * Uploads one file and reports real progress.
 *
 * supabase-js has no progress callback, so this talks to the Storage REST
 * endpoint directly through XMLHttpRequest — the only browser API that still
 * exposes upload progress events. Worth the extra code: a 150 MB showreel
 * uploading behind a frozen spinner is indistinguishable from a hang.
 */
export function uploadFile(file, folder, onProgress) {
  return new Promise((resolve, reject) => {
    if (!supabase) return reject(new Error('Supabase не настроен.'));
    if (file.size > MAX_FILE_BYTES) {
      return reject(new Error(`Файл «${file.name}» весит ${formatBytes(file.size)} — это больше лимита в 200 МБ. Сожмите его или загрузите видео на YouTube/Vimeo.`));
    }

    const path = `${folder}/${safeFileName(file.name)}`;

    supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      if (!token) return reject(new Error('Сессия истекла. Войдите заново.'));

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${MEDIA_BUCKET}/${path}`, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('x-upsert', 'true');
      if (file.type) xhr.setRequestHeader('Content-Type', file.type);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onerror = () => reject(new Error(`Не удалось загрузить «${file.name}». Проверьте интернет.`));
      xhr.onabort = () => reject(new Error('Загрузка отменена.'));
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress && onProgress(100);
          resolve({ path, url: publicUrl(path), kind: detectKind(file, file.type), size: file.size });
        } else if (xhr.status === 403) {
          reject(new Error('Хранилище отклонило загрузку: у аккаунта нет прав администратора (см. инструкцию, шаг 4).'));
        } else if (xhr.status === 413) {
          reject(new Error(`Файл «${file.name}» слишком большой для хранилища.`));
        } else {
          reject(new Error(`Загрузка не удалась (код ${xhr.status}).`));
        }
      };
      xhr.send(file);
    }).catch(reject);
  });
}

/** Reads intrinsic dimensions so the gallery can reserve the right space. */
export function probeDimensions(file) {
  return new Promise((resolve) => {
    const kind = detectKind(file, file.type);
    const url = URL.createObjectURL(file);
    const done = (w, h) => { URL.revokeObjectURL(url); resolve({ width: w || null, height: h || null }); };
    if (kind === 'video') {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => done(v.videoWidth, v.videoHeight);
      v.onerror = () => done(null, null);
      v.src = url;
    } else {
      const img = new Image();
      img.onload = () => done(img.naturalWidth, img.naturalHeight);
      img.onerror = () => done(null, null);
      img.src = url;
    }
  });
}

/* ------------------------------------------------------------ texts ---- */
/* Long-form editable copy (privacy policy). One row per key, one column per
   language; null row = the site uses the built-in default. */

export async function getSiteText(key) {
  const { data, error } = await db().from('site_texts').select('*').eq('key', key).maybeSingle();
  fail(error, 'Не удалось загрузить текст.');
  return data || null;
}

export async function saveSiteText(key, { ru, ro, en }) {
  const { data, error } = await db()
    .from('site_texts')
    .upsert({ key, ru, ro, en }, { onConflict: 'key' })
    .select().single();
  fail(error, 'Не удалось сохранить текст.');
  return data;
}

/* ------------------------------------------------------------ usage ---- */
/* Bytes used in the media bucket + database size, via the admin-only
   usage_stats() SQL function. Resolves to null (not an error) when the
   function hasn't been installed yet, so the dashboard still renders. */

export async function getUsageStats() {
  const { data, error } = await db().rpc('usage_stats');
  if (error) {
    if (/usage_stats/.test(error.message || '')) return null; // migration not run
    fail(error, 'Не удалось получить статистику места.');
  }
  return data || null;
}
