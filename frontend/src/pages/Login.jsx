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
      setError(err.response?.data?.messages?.error || err.response?.data?.message || 'Gagal log masuk. Semak emel dan kata laluan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '420px', margin: '3rem auto' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem', textAlign: 'center' }}>
          Log Masuk iPeneman
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1.5rem' }}>
          Sistem Peneman Pesakit Hospital Sultan Zainal Abidin
        </p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', padding: '0.75rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Alamat Emel</label>
            <input
              type="email"
              className="form-input"
              placeholder="contoh: user@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Kata Laluan</label>
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
            {loading ? 'Sila tunggu...' : 'Log Masuk'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Belum ada akaun?{' '}
          <span onClick={switchToRegister} style={{ color: '#34d399', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}>
            Daftar Sekarang
          </span>
        </div>
      </div>
    </div>
  );
}
