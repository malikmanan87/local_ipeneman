import React, { useState } from 'react';
import { authAPI } from '../services/api';

export default function Login({ onLoginSuccess, switchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authAPI.login({ email, password });
      if (res.data.user) {
        onLoginSuccess(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.messages?.error || err.response?.data?.message || 'Login failed. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div style={{ maxWidth: '440px', margin: '2.5rem auto' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem', textAlign: 'center' }}>
          iPeneman Login
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1.5rem' }}>
          Hospital Patient Companion System — Hospital Sultan Zainal Abidin (HoSZA)
        </p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', padding: '0.75rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. nurse@hosza.my"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Please wait...' : 'Log In'}
          </button>
        </form>

        {/* Quick Demo Accounts Selection */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '0.5rem', textAlign: 'center' }}>
            🔑 QUICK DEMO LOGIN ACCOUNTS (Password: <code style={{ color: '#f59e0b' }}>password123</code>):
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem' }}>
            <button
              onClick={() => handleQuickLogin('nurse@hosza.my')}
              type="button"
              style={{ padding: '0.4rem', borderRadius: '6px', background: 'rgba(2, 132, 199, 0.2)', border: '1px solid #0284c7', color: '#38bdf8', cursor: 'pointer', textAlign: 'left' }}
            >
              🩺 <strong>Jururawat Wad (Nurse):</strong> nurse@hosza.my
            </button>

            <button
              onClick={() => handleQuickLogin('guard@hosza.my')}
              type="button"
              style={{ padding: '0.4rem', borderRadius: '6px', background: 'rgba(5, 150, 105, 0.2)', border: '1px solid #059669', color: '#34d399', cursor: 'pointer', textAlign: 'left' }}
            >
              🛡️ <strong>Pegawai Keselamatan (Guard):</strong> guard@hosza.my
            </button>

            <button
              onClick={() => handleQuickLogin('admin@hosza.my')}
              type="button"
              style={{ padding: '0.4rem', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', color: '#f59e0b', cursor: 'pointer', textAlign: 'left' }}
            >
              👑 <strong>Admin System (HoSZA):</strong> admin@hosza.my
            </button>
            <button
              onClick={() => handleQuickLogin('siti@gmail.com')}
              type="button"
              style={{ padding: '0.4rem', borderRadius: '6px', background: 'rgba(236, 72, 153, 0.2)', border: '1px solid #ec4899', color: '#f472b6', cursor: 'pointer', textAlign: 'left' }}
            >
              👩‍🦱 <strong>Peneman Perempuan:</strong> siti@gmail.com
            </button>

            <button
              onClick={() => handleQuickLogin('ahmad@gmail.com')}
              type="button"
              style={{ padding: '0.4rem', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid #6366f1', color: '#818cf8', cursor: 'pointer', textAlign: 'left' }}
            >
              👨‍🦱 <strong>Ahmad (Peneman Lelaki):</strong> ahmad@gmail.com
            </button>

            <button
              onClick={() => handleQuickLogin('waris@gmail.com')}
              type="button"
              style={{ padding: '0.4rem', borderRadius: '6px', background: 'rgba(236, 72, 153, 0.2)', border: '1px solid #ec4899', color: '#f472b6', cursor: 'pointer', textAlign: 'left' }}
            >
              👨‍👩‍👧 <strong>Fatimah (Pesakit/Waris):</strong> waris@gmail.com
            </button>
          </div>
        </div>

        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <span onClick={switchToRegister} style={{ color: '#34d399', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}>
            Register Now
          </span>
        </div>
      </div>
    </div>
  );
}
