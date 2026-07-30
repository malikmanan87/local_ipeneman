import React from 'react';

export default function Navbar({ user, onLogout, activeTab, setActiveTab }) {
  return (
    <nav className="glass-nav">
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #059669, #0284c7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            fontWeight: '800',
            color: 'white'
          }}>
            iP
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: '800', lineHeight: '1.2' }}>
              iPeneman HoSZA
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Hospital Sultan Zainal Abidin
            </p>
          </div>
        </div>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{user.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Role: <span style={{ textTransform: 'capitalize', color: '#34d399', fontWeight: '700' }}>{user.role}</span> | Gender: <span style={{ fontWeight: '700', color: user.gender === 'L' ? '#60a5fa' : '#f472b6' }}>{user.gender === 'L' ? 'Male' : 'Female'}</span>
              </div>
            </div>

            <button onClick={onLogout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              Log Out
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setActiveTab('login')} className={`btn ${activeTab === 'login' ? 'btn-primary' : 'btn-secondary'}`}>
              Log In
            </button>
            <button onClick={() => setActiveTab('register')} className={`btn ${activeTab === 'register' ? 'btn-primary' : 'btn-secondary'}`}>
              Register
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
