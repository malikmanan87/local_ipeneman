import React, { useState } from 'react';
import { authAPI } from '../services/api';
import { showSuccess } from '../utils/swal';

export default function Register({ onRegisterSuccess, switchToLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    ic_number: '',
    email: '',
    phone: '',
    password: '',
    role: 'companion',
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
      setGenderPreview(lastDigit % 2 !== 0 ? 'Male' : 'Female');
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
      if (res.status === 201 || res.data.status === 201 || res.data.message) {
        await showSuccess('Registration Submitted', res.data.message || 'Registration submitted successfully! Awaiting Admin approval before login.');
        switchToLogin();
      }
    } catch (err) {
      const errMsgs = err.response?.data?.messages;
      const errorText = typeof errMsgs === 'object' 
        ? Object.values(errMsgs).join(' ') 
        : (err.response?.data?.message || 'Registration failed. Ensure IC or Email is not already registered.');
      setError(errorText);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '520px', margin: '2.5rem auto' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '2.25rem' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '0.4rem', textAlign: 'center' }}>
          Create iPeneman Account
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1.75rem' }}>
          Hospital Sultan Zainal Abidin (HoSZA) Ward Patient Companion System
        </p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Account Role Selection Cards */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.75rem' }}>
              Select Account Registration Type:
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {/* Companion Card */}
              <div
                onClick={() => setFormData({ ...formData, role: 'companion' })}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  border: formData.role === 'companion' ? '2px solid #34d399' : '1px solid var(--border-color)',
                  background: formData.role === 'companion' ? 'rgba(5, 150, 105, 0.15)' : 'rgba(15, 23, 42, 0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <div style={{ fontSize: '1.5rem' }}>👨‍🦱</div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: formData.role === 'companion' ? '#34d399' : 'white' }}>
                    Patient Companion (UniSZA Student / Volunteer)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Apply for ward companion duty shifts & receive hourly allowances
                  </div>
                </div>
              </div>

              {/* Family / Patient Card */}
              <div
                onClick={() => setFormData({ ...formData, role: 'user' })}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  border: formData.role === 'user' ? '2px solid #38bdf8' : '1px solid var(--border-color)',
                  background: formData.role === 'user' ? 'rgba(2, 132, 199, 0.15)' : 'rgba(15, 23, 42, 0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <div style={{ fontSize: '1.5rem' }}>👨‍👩‍👧</div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: formData.role === 'user' ? '#38bdf8' : 'white' }}>
                    Patient / Family Member
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Create companion ward requests, review applicants & give ratings
                  </div>
                </div>
              </div>

              {/* Nurse / Staff Card */}
              <div
                onClick={() => setFormData({ ...formData, role: 'staff' })}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  border: formData.role === 'staff' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                  background: formData.role === 'staff' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(15, 23, 42, 0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <div style={{ fontSize: '1.5rem' }}>🩺</div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: formData.role === 'staff' ? '#f59e0b' : 'white' }}>
                    HoSZA Ward Nurse / Security Officer
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Scan & verify Digital Ward Entry Pass at ward entrance
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Full Name (as per MyKad / IC)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Ahmad bin Abdullah"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>IC / MyKad Number</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 980512-11-5431"
              value={formData.ic_number}
              onChange={(e) => handleICChange(e.target.value)}
              required
            />
            {genderPreview && (
              <div style={{ fontSize: '0.8rem', marginTop: '0.35rem', color: genderPreview === 'Male' ? '#60a5fa' : '#f472b6', fontWeight: '700' }}>
                ✓ Auto-detected Gender: {genderPreview} (Enforces strict same-gender ward companion rule)
              </div>
            )}
          </div>

          {formData.role === 'companion' && (
            <div className="form-group">
              <label>UniSZA Student / Staff ID Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. D202312345 (UniSZA Student ID)"
                value={formData.student_staff_id}
                onChange={(e) => setFormData({ ...formData, student_staff_id: e.target.value })}
                required
              />
            </div>
          )}

          <div className="grid grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. ahmad@gmail.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 012-9876543"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.75rem', padding: '0.85rem' }} disabled={loading}>
            {loading ? 'Registering...' : 'Register Account'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <span onClick={switchToLogin} style={{ color: '#34d399', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}>
            Log In Here
          </span>
        </div>
      </div>
    </div>
  );
}
