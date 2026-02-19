'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignUpPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, email, password })
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Unable to create account');
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('Unable to create account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container auth-shell">
      <section className="auth-card">
        <p className="auth-badge">New Account</p>
        <h1 className="auth-title">Sign Up</h1>
        <p className="auth-subtitle">
          Create your account to keep your progress private and synced.
        </p>

        <form className="auth-form" onSubmit={onSubmit}>
          <label className="auth-label">
            Name (optional)
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
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
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {error ? <p className="status-error">{error}</p> : null}

        <div className="auth-page-actions">
          <Link href="/" className="secondary-btn">
            Back to Tracker
          </Link>
          <Link href="/signin" className="secondary-btn">
            Already have an account? Sign In
          </Link>
        </div>
      </section>
    </main>
  );
}
