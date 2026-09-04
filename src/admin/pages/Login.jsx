import { useState } from 'react';
import PixelHeart from '../../components/PixelHeart';
import { signIn } from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      await signIn(email, password);
      // No redirect here on purpose: the auth listener in AdminApp swaps the
      // screen as soon as the session lands, so a manual navigate would race it.
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="adm">
      <div className="adm-login">
        <div className="adm-login-card">
          <div className="adm-login-mark"><PixelHeart />Cookiekiller® · админка</div>
          <h1>Вход</h1>
          <p className="adm-lede" style={{ marginBottom: 24 }}>Панель управления сайтом. Доступ только по приглашению.</p>

          <form onSubmit={submit} noValidate>
            <label className="adm-field">
              <span className="adm-label">Почта</span>
              <input
                className="adm-input"
                type="email"
                autoComplete="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </label>
            <label className="adm-field">
              <span className="adm-label">Пароль</span>
              <input
                className="adm-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>

            {error && <p className="adm-field-error" role="alert">{error}</p>}

            <button className="adm-btn adm-btn--primary" type="submit" disabled={busy || !email || !password}>
              {busy && <span className="adm-spinner" />}
              {busy ? 'Проверяю…' : 'Войти'}
            </button>
          </form>

          <p className="adm-hint" style={{ marginTop: 20 }}>
            Забыли пароль — сбросьте его в Supabase → Authentication → Users → «…» → Reset password.
          </p>
        </div>
      </div>
    </div>
  );
}
