import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAdminAuth } from '../auth';

export default function Login() {
  const { session, profile, loading } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    setBusy(false);
  };

  const notAdmin = !loading && session && profile && profile.role !== 'admin';

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h1>✨ Nakshtra Admin</h1>
        {notAdmin ? (
          <>
            <p className="error">This account is not an admin. Ask an existing admin to grant access, or promote via SQL:</p>
            <code className="code-block">
              update profiles set role = 'admin' where email = '...';
            </code>
          </>
        ) : (
          <>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
