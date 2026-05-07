import { useState } from 'react';
import { api, setToken } from '../api.js';
import Icon from '../components/Icon.jsx';

export default function Login({ onSuccess }) {
  const [email, setEmail] = useState('concierge@aurelia.in');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const { token, user } = await api.login(email, password);
      setToken(token);
      onSuccess(user);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      backgroundImage: 'radial-gradient(circle at 20% 0%, var(--gold-soft), transparent 50%), radial-gradient(circle at 80% 100%, rgba(127,166,122,0.06), transparent 50%)',
      padding: 24,
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 32, boxShadow: '0 24px 60px rgba(0,0,0,.4)' }}>
        <div className="row gap-3" style={{ marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #e3c688, #8a6f3c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#15110c', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22,
          }}>A</div>
          <div>
            <div className="display" style={{ fontSize: 22, lineHeight: 1.1 }}>Aurelia</div>
            <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>Sign in to the hotel CRM</div>
          </div>
        </div>

        <form onSubmit={submit} className="col gap-3">
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Email</div>
            <input className="input" value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" required />
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Password</div>
            <input className="input" value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete="current-password" required placeholder="Your password" />
          </div>
          {err && (
            <div style={{
              fontSize: 12, color: '#db9088', background: 'rgba(201,122,110,0.10)',
              padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(201,122,110,0.28)',
            }}>{err}</div>
          )}
          <button className="btn btn-primary" disabled={busy} type="submit" style={{ marginTop: 8, padding: '12px' }}>
            {busy ? 'Signing in…' : <><Icon name="arrowRight" size={14} strokeWidth={2.4} />Sign in</>}
          </button>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6, textAlign: 'center' }}>
            Default seed credentials are configured via the backend <span className="mono">.env</span> file.
          </div>
        </form>
      </div>
    </div>
  );
}
