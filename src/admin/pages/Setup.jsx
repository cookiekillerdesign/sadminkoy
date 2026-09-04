import PixelHeart from '../../components/PixelHeart';

/**
 * What the panel shows before anything is wired up. Deliberately a checklist
 * rather than an error: at this point nothing is broken, the project simply
 * hasn't been connected yet, and the person reading this needs the next step.
 */
export default function Setup() {
  return (
    <div className="adm">
      <div className="adm-login">
        <div className="adm-login-card" style={{ maxWidth: 560 }}>
          <div className="adm-login-mark"><PixelHeart />Cookiekiller® · админка</div>
          <h1>Осталось подключить базу</h1>
          <p className="adm-lede" style={{ marginBottom: 24 }}>
            Панель не видит адрес проекта Supabase. Это нормально при первом запуске —
            нужно добавить две переменные и передеплоить сайт.
          </p>

          <div className="adm-note">
            <b>Что сделать</b>
            1. Откройте проект на Vercel → <b>Settings</b> → <b>Environment Variables</b>.<br />
            2. Добавьте <code>VITE_SUPABASE_URL</code> — адрес вида <code>https://xxxx.supabase.co</code>.<br />
            3. Добавьте <code>VITE_SUPABASE_ANON_KEY</code> — публичный ключ <i>anon</i>.<br />
            4. Нажмите <b>Redeploy</b> и вернитесь на эту страницу.
          </div>

          <p className="adm-hint">
            Оба значения лежат в Supabase → Project Settings → API. Ключ <i>anon</i> публичный,
            его можно держать в переменных фронтенда. Ключ <i>service_role</i> сюда вставлять нельзя —
            он даёт полный доступ к базе.
          </p>

          <p className="adm-hint" style={{ marginTop: 16 }}>
            Пошаговая инструкция со скриншотами лежит в файле <code>docs/admin-guide-ru.pdf</code> в репозитории.
          </p>

          <div className="adm-actions" style={{ marginTop: 26 }}>
            <a className="adm-btn" href="/">На сайт</a>
          </div>
        </div>
      </div>
    </div>
  );
}
