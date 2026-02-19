'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Unable to sign in');
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container auth-shell">
      <section className="auth-card">
        <p className="auth-badge">Account Access</p>
        <h1 className="auth-title">Sign In</h1>
        <p className="auth-subtitle">Sign in to sync your progress and measurements.</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <label className="auth-label">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="auth-label">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit" className="primary-btn" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {error ? <p className="status-error">{error}</p> : null}

        <div className="auth-page-actions">
          <Link href="/" className="secondary-btn">
            Back to Tracker
          </Link>
          <Link href="/signup" className="secondary-btn">
            Need an account? Sign Up
          </Link>
        </div>
      </section>
    </main>
  );
}
