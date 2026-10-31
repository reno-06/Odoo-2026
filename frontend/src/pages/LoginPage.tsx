import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  api,
  getApiError,
  registerWithInvitation,
  resetPassword,
} from '../services/api';

export default function LoginPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { signIn, signOut } = useAuth();
  const inviteToken = params.get('invite') ?? '';
  const resetToken = params.get('token') ?? '';
  const resetMode = Boolean(resetToken) || location.pathname === '/reset-password';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (resetMode) {
        if (!resetToken) {
          setError('The password reset link is missing its token.');
          return;
        }
        if (password !== confirmPassword) {
          setError('The password confirmation does not match.');
          return;
        }
        await resetPassword(resetToken, password);
        await signOut();
        setResetDone(true);
        setNotice('Your password has been reset. You can now sign in.');
        return;
      }
      if (inviteToken && !registered) {
        const user = await registerWithInvitation(inviteToken, fullName, password);
        setEmail(user.email);
        setRegistered(true);
        await signIn(user.email, password);
      } else {
        await signIn(email, password);
      }
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card panel">
        <Link to="/" className="brand auth-brand">
          <span className="brand-mark">b</span>
          <span className="brand-name">brightloop<span>.</span></span>
        </Link>
        <div className="auth-heading">
          <div className="eyebrow">{resetMode ? 'ACCOUNT SECURITY' : inviteToken && !registered ? 'WORKSPACE INVITATION' : 'WELCOME BACK'}</div>
          <h1>{resetMode ? 'Reset your password' : inviteToken && !registered ? 'Create your account' : 'Sign in to Brightloop'}</h1>
          <p>{resetMode ? 'Choose a new password for your account.' : inviteToken && !registered ? 'Accept your invitation to join your workspace.' : 'Enter your credentials to continue to your workspace.'}</p>
        </div>
        {registered && <div className="auth-success" role="status">Account created. Sign in to continue.</div>}
        {!resetDone && <form className="auth-form" onSubmit={submit}>
          {inviteToken && !registered && (
            <label className="form-field">
              <span>Full name</span>
              <input
                autoComplete="name"
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </label>
          )}
          {!resetMode && (!inviteToken || registered) && <label className="form-field">
            <span>Email address</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>}
          <label className="form-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={inviteToken || resetMode ? 'new-password' : 'current-password'}
              minLength={inviteToken || resetMode ? 12 : 1}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {resetMode && <label className="form-field">
            <span>Confirm new password</span>
            <input type="password" autoComplete="new-password" minLength={12} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </label>}
          {error && <div className="settings-error" role="alert">{error}</div>}
          {notice && <div className="auth-success" role="status">{notice}</div>}
          <button type="submit" className="button button-primary auth-submit" disabled={busy}>
            {busy ? 'Please wait…' : resetMode ? 'Reset password' : inviteToken && !registered ? 'Accept invitation' : 'Sign in'}
          </button>
        </form>}
        {resetDone && <Link className="button button-primary auth-submit" to="/login">Return to sign in</Link>}
        {!resetMode && (!inviteToken || registered) && (
          <button
            type="button"
            className="auth-text-button"
            disabled={busy}
            onClick={async () => {
              if (!email) {
                setError('Enter your email address first.');
                return;
              }
              setBusy(true);
              setError('');
              setNotice('');
              try {
                await api.post('/auth/password/forgot', { email });
                setNotice('If the account exists, password reset instructions have been sent.');
              } catch (requestError) {
                setError(getApiError(requestError));
              } finally {
                setBusy(false);
              }
            }}
          >
            Forgot password?
          </button>
        )}
      </section>
    </main>
  );
}
