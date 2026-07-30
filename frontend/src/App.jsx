import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import CompanionDashboard from './pages/CompanionDashboard';
import AdminDashboard from './pages/AdminDashboard';
import NurseDashboard from './pages/NurseDashboard';

export default function App() {
  // Restore user session from localStorage if available upon refresh
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('ipeneman_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (err) {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('login');

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('ipeneman_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('ipeneman_user');
    setActiveTab('login');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        user={user}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main style={{ flex: 1 }}>
        {!user ? (
          activeTab === 'login' ? (
            <Login
              onLoginSuccess={handleLoginSuccess}
              switchToRegister={() => setActiveTab('register')}
            />
          ) : (
            <Register
              onRegisterSuccess={handleLoginSuccess}
              switchToLogin={() => setActiveTab('login')}
            />
          )
        ) : (
          <>
            {user.role === 'companion' && <CompanionDashboard user={user} />}
            {user.role === 'user' && <PatientDashboard user={user} />}
            {user.role === 'admin' && <AdminDashboard user={user} />}
            {user.role === 'staff' && <NurseDashboard user={user} />}
          </>
        )}
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '1.5rem',
        borderTop: '1px solid var(--border-color)',
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }}>
        © 2026 iPeneman - Hospital Sultan Zainal Abidin (HoSZA). All Rights Reserved.
      </footer>
    </div>
  );
}
