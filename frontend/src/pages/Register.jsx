import React, { useState } from 'react';
import { authAPI } from '../services/api';

export default function Register({ onRegisterSuccess, switchToLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    ic_number: '',
    email: '',
    phone: '',
    password: '',
    role: 'companion', // default to companion or user
    student_staff_id: ''
  });

  const [genderPreview, setGenderPreview] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleICChange = (icVal) => {
    setFormData((prev) => ({ ...prev, ic_number: icVal }));
    const cleanIc = icVal.replace(/[^0-9]/g, '');
    if (cleanIc.length >= 1) {
      const lastDigit = parseInt(cleanIc.slice(-1), 10);
      setGenderPreview(lastDigit % 2 !== 0 ? 'Lelaki' : 'Perempuan');
    } else {
      setGenderPreview('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authAPI.register(formData);
      if (res.data.user) {
        alert(res.data.message || 'Pendaftaran Berjaya!');
        onRegisterSuccess(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.messages?.error || err.response?.data?.message || 'Pendaftaran gagal. Pastikan No. IC atau Emel belum pernah didaftarkan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '2rem auto' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem', textAlign: 'center' }}>
          Daftar Akaun iPeneman
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1.5rem' }}>
          Sistem Peneman Pesakit - Hospital Sultan Zainal Abidin
        </p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', padding: '0.75rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Peranan Akaun</label>
            <select
              className="form-select"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="companion">Peneman Pesakit (Boleh Mohon Tugasan)</option>
              <option value="user">Pesakit / Waris Pesakit (Boleh Cipta Permohonan)</option>
              <option value="admin">Admin / Staff Wad HoSZA</option>
            </select>
          </div>

          <div className="form-group">
            <label>Nama Penuh (Seperti dalam IC)</label>
            <input
              type="text"
              className="form-input"
              placeholder="contoh: Ahmad bin Abdullah"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>No. Kad Pengenalan / MyKad</label>
            <input
              type="text"
              className="form-input"
              placeholder="contoh: 980512-11-5431"
              value={formData.ic_number}
              onChange={(e) => handleICChange(e.target.value)}
              required
            />
            {genderPreview && (
              <div style={{ fontSize: '0.8rem', marginTop: '0.35rem', color: genderPreview === 'Lelaki' ? '#60a5fa' : '#f472b6', fontWeight: '700' }}>
                ✓ Jantina Dikesan Automatik: {genderPreview} (Ditapis untuk keselamatan wad)
              </div>
            )}
          </div>

          {formData.role === 'companion' && (
            <div className="form-group">
              <label>No. Matrik Pelajar / Staf UniSZA (Jika ada)</label>
              <input
                type="text"
                className="form-input"
                placeholder="contoh: D202312345"
                value={formData.student_staff_id}
                onChange={(e) => setFormData({ ...formData, student_staff_id: e.target.value })}
              />
            </div>
          )}

          <div className="form-group">
            <label>Alamat Emel</label>
            <input
              type="email"
              className="form-input"
              placeholder="contoh: ahmad@gmail.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>No. Telefon</label>
            <input
              type="text"
              className="form-input"
              placeholder="contoh: 012-3456789"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Kata Laluan</label>
            <input
              type="password"
              className="form-input"
              placeholder="Minimum 6 abjad"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Sila tunggu...' : 'Daftar Akaun'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Sudah mendaftar?{' '}
          <span onClick={switchToLogin} style={{ color: '#34d399', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}>
            Log Masuk
          </span>
        </div>
      </div>
    </div>
  );
}
