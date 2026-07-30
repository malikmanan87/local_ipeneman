import React, { useState, useEffect } from 'react';
import { adminAPI, requestAPI } from '../services/api';

export default function AdminDashboard({ user }) {
  const [stats, setStats] = useState({
    total_users: 0,
    total_companions: 0,
    total_families: 0,
    total_staff: 0,
    pending_approvals: 0,
    total_requests: 0,
    active_duties: 0
  });

  const [activeTab, setActiveTab] = useState('requests'); // 'requests', 'users', 'approvals', 'active_duties'
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'companion', 'user', 'staff', 'admin'

  const [requests, setRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [unverifiedUsers, setUnverifiedUsers] = useState([]);
  
  const [showOnBehalfModal, setShowOnBehalfModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showApplicantsModal, setShowApplicantsModal] = useState(false);
  const [showVerifyPassModal, setShowVerifyPassModal] = useState(false);

  const [inputPassCode, setInputPassCode] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [loading, setLoading] = useState(true);

  // System Payment Settings
  const [rateSettings, setRateSettings] = useState({
    default_hourly_rate: '10.00',
    min_hourly_rate: '8.00',
    max_hourly_rate: '30.00'
  });

  // Form state for On-Behalf Request (Admin creating for patient without family/waris)
  const [formData, setFormData] = useState({
    created_by_user_id: user.id,
    created_by_role: 'admin',
    patient_name: '',
    patient_rn: '',
    patient_gender: 'L',
    patient_age: 70,
    ward_name: 'Ward 3A (Male)',
    bed_number: 'Bed 14',
    shift_date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '16:00',
    task_details: 'UNACCOMPANIED PATIENT (NO FAMILY): Assist with lunch, restroom guidance & emotional support.',
    allowance_type: 'paid',
    allowance_amount: 50.00
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const statsRes = await adminAPI.getStats();
      if (statsRes.data.stats) setStats(statsRes.data.stats);

      const reqRes = await adminAPI.getAllRequests();
      setRequests(reqRes.data || []);

      const settingsRes = await adminAPI.getSettings();
      if (settingsRes.data.settings) {
        setRateSettings(settingsRes.data.settings);
      }

      const unverifiedRes = await adminAPI.getUnverifiedUsers();
      setUnverifiedUsers(unverifiedRes.data.data || []);

      const usersRes = await adminAPI.getAllUsers();
      setAllUsers(usersRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveUserAccount = async (targetUserId) => {
    try {
      await adminAPI.verifyUser(targetUserId);
      alert('✓ User account approved and activated successfully!');
      fetchData();
    } catch (err) {
      alert('Failed to approve user account.');
    }
  };

  const handleRejectUserAccount = async (targetUserId) => {
    if (!window.confirm('Are you sure you want to reject and remove this account registration?')) return;
    try {
      await adminAPI.rejectUser(targetUserId);
      alert('✓ User account registration rejected.');
      fetchData();
    } catch (err) {
      alert('Failed to reject user account.');
    }
  };

  const handleOpenVerifyPassModal = (reqCode = '') => {
    setInputPassCode(reqCode);
    setVerificationResult(null);
    setShowVerifyPassModal(true);
  };

  const handleVerifyPassSubmit = async (e) => {
    e.preventDefault();
    if (!inputPassCode.trim()) return;
    setVerifying(true);
    setVerificationResult(null);
    try {
      const res = await adminAPI.verifyPass(inputPassCode.trim(), user.id);
      setVerificationResult(res.data);
    } catch (err) {
      setVerificationResult({
        is_valid: false,
        error_message: err.response?.data?.messages?.error || err.response?.data?.message || 'Invalid or unassigned Pass Code.'
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleOpenApplicantsModal = async (req) => {
    setSelectedRequest(req);
    setShowApplicantsModal(true);
    setLoadingApplicants(true);
    try {
      const res = await requestAPI.getApplicants(req.id);
      setApplicants(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingApplicants(false);
    }
  };

  const handleApproveApplicant = async (companionId) => {
    if (!selectedRequest) return;
    try {
      await requestAPI.acceptCompanion({
        request_id: selectedRequest.id,
        companion_id: companionId
      });
      alert('✓ Companion approved and assigned to ward request successfully!');
      setShowApplicantsModal(false);
      fetchData();
    } catch (err) {
      alert('Failed to approve companion.');
    }
  };

  const handleOnBehalfSubmit = async (e) => {
    e.preventDefault();
    try {
      await requestAPI.create(formData);
      alert('✓ Request created on-behalf of patient (Unaccompanied) successfully!');
      setShowOnBehalfModal(false);
      fetchData();
    } catch (err) {
      alert('Failed to create admin on-behalf request.');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await adminAPI.updateSettings(rateSettings);
      alert('✓ Payment rate settings updated successfully!');
      if (res.data.settings) setRateSettings(res.data.settings);
      setShowSettingsModal(false);
    } catch (err) {
      alert('Failed to update payment rate settings.');
    }
  };

  const filteredUsers = allUsers.filter((u) => {
    if (roleFilter === 'all') return true;
    if (roleFilter === 'staff') return u.role === 'staff' || u.role === 'admin';
    return u.role === roleFilter;
  });

  const activeDutiesList = requests.filter((r) => r.status === 'in_progress' || r.status === 'assigned');

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      {/* Admin Header */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.2), rgba(15, 23, 42, 0.4))' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Hospital Sultan Zainal Abidin (HoSZA) Admin & Control Portal</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Registered Users Oversight, Ward Requests, Active Duties & Digital Pass Verification
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => handleOpenVerifyPassModal('')} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #059669, #0284c7)' }}>
            📷 Scan / Verify E-Pass
          </button>
          <button onClick={() => setShowSettingsModal(true)} className="btn btn-secondary" style={{ border: '1px solid #34d399', color: '#34d399' }}>
            ⚙️ Payment Rates
          </button>
          <button onClick={() => setShowOnBehalfModal(true)} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            🏥 + Request On-Behalf
          </button>
        </div>
      </div>

      {/* Payment Rates Quick Banner */}
      <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid #34d399' }}>
        <div>
          <strong style={{ color: '#34d399', fontSize: '0.95rem' }}>💰 Current Active Payment Rate Settings:</strong>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginLeft: '0.75rem' }}>
            Standard Rate: <strong>RM {parseFloat(rateSettings.default_hourly_rate || 10).toFixed(2)}/hr</strong> | 
            Allowed Range: <strong>RM {parseFloat(rateSettings.min_hourly_rate || 8).toFixed(2)}/hr</strong> – <strong>RM {parseFloat(rateSettings.max_hourly_rate || 30).toFixed(2)}/hr</strong>
          </span>
        </div>
        <button onClick={() => setShowSettingsModal(true)} style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}>
          Configure Rates
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-4" style={{ marginBottom: '2.5rem' }}>
        {/* Total Users */}
        <div 
          onClick={() => setActiveTab('users')} 
          className="glass-panel stat-card" 
          style={{ cursor: 'pointer', border: activeTab === 'users' ? '2px solid #38bdf8' : 'none' }}
        >
          <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>👥</div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{stats.total_users}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Registered Users (All Roles)</div>
            <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '0.2rem' }}>
              Companions: {stats.total_companions} | Waris: {stats.total_families} | Staff: {stats.total_staff}
            </div>
          </div>
        </div>

        {/* Total Requests */}
        <div 
          onClick={() => setActiveTab('requests')} 
          className="glass-panel stat-card" 
          style={{ cursor: 'pointer', border: activeTab === 'requests' ? '2px solid #f59e0b' : 'none' }}
        >
          <div className="stat-icon">📋</div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{stats.total_requests}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Ward Requests</div>
          </div>
        </div>

        {/* Active Duty Shifts */}
        <div 
          onClick={() => setActiveTab('active_duties')} 
          className="glass-panel stat-card" 
          style={{ cursor: 'pointer', border: activeTab === 'active_duties' ? '2px solid #34d399' : 'none' }}
        >
          <div className="stat-icon" style={{ background: 'rgba(5, 150, 105, 0.15)', color: '#34d399' }}>🔄</div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{stats.active_duties}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Duty Shifts</div>
          </div>
        </div>

        {/* Pending Account Approvals */}
        <div 
          onClick={() => setActiveTab('approvals')} 
          className="glass-panel stat-card" 
          style={{ cursor: 'pointer', border: activeTab === 'approvals' ? '2px solid #ec4899' : 'none' }}
        >
          <div className="stat-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>🔔</div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: stats.pending_approvals > 0 ? '#f472b6' : 'white' }}>
              {stats.pending_approvals}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pending Acc Approvals</div>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('requests')}
          className="btn"
          style={{
            background: activeTab === 'requests' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
            color: activeTab === 'requests' ? '#f59e0b' : 'var(--text-muted)',
            border: activeTab === 'requests' ? '1px solid #f59e0b' : '1px solid transparent',
            fontWeight: '700'
          }}
        >
          📋 Ward Requests ({requests.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className="btn"
          style={{
            background: activeTab === 'users' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            color: activeTab === 'users' ? '#38bdf8' : 'var(--text-muted)',
            border: activeTab === 'users' ? '1px solid #38bdf8' : '1px solid transparent',
            fontWeight: '700'
          }}
        >
          👥 Registered Users Directory ({allUsers.length})
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className="btn"
          style={{
            background: activeTab === 'approvals' ? 'rgba(236, 72, 153, 0.25)' : 'transparent',
            color: activeTab === 'approvals' ? '#f472b6' : 'var(--text-muted)',
            border: activeTab === 'approvals' ? '1px solid #f472b6' : '1px solid transparent',
            fontWeight: '700'
          }}
        >
          🔔 Pending Approvals ({unverifiedUsers.length})
        </button>

        <button
          onClick={() => setActiveTab('active_duties')}
          className="btn"
          style={{
            background: activeTab === 'active_duties' ? 'rgba(5, 150, 105, 0.25)' : 'transparent',
            color: activeTab === 'active_duties' ? '#34d399' : 'var(--text-muted)',
            border: activeTab === 'active_duties' ? '1px solid #34d399' : '1px solid transparent',
            fontWeight: '700'
          }}
        >
          🔄 Active Duties ({activeDutiesList.length})
        </button>
      </div>

      {/* TAB 1: Ward Requests Overview */}
      {activeTab === 'requests' && (
        <div className="animate-fade-in">
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>
            HoSZA Wards Complete Request Overview & Nurse Pass Verification
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading list...</div>
          ) : (
            <div className="glass-panel" style={{ overflowX: 'auto', padding: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>Request Code</th>
                    <th style={{ padding: '0.75rem' }}>Creator</th>
                    <th style={{ padding: '0.75rem' }}>Patient (RN)</th>
                    <th style={{ padding: '0.75rem' }}>Gender</th>
                    <th style={{ padding: '0.75rem' }}>Ward Location</th>
                    <th style={{ padding: '0.75rem' }}>Date & Time</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: '700', color: '#f59e0b' }}>{req.request_code}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {req.created_by_role === 'admin' ? (
                          <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>HOSZA STAFF (ON-BEHALF)</span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>PATIENT FAMILY</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>{req.patient_name} ({req.patient_rn})</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className={`badge ${req.patient_gender === 'L' ? 'badge-male' : 'badge-female'}`}>
                          {req.patient_gender === 'L' ? 'Male' : 'Female'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{req.ward_name} ({req.bed_number})</td>
                      <td style={{ padding: '0.75rem' }}>{req.shift_date} ({req.start_time}-{req.end_time})</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className={`badge badge-${req.status}`}>{req.status}</span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {req.status === 'open' && (
                            <button
                              onClick={() => handleOpenApplicantsModal(req)}
                              className="btn btn-primary"
                              style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                            >
                              👥 Applicants
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenVerifyPassModal(req.request_code)}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', border: '1px solid #34d399', color: '#34d399' }}
                          >
                            🔍 Verify Pass
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Registered Users Directory */}
      {activeTab === 'users' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>
              👥 All Registered Users Directory ({filteredUsers.length})
            </h3>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setRoleFilter('all')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  background: roleFilter === 'all' ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                  color: roleFilter === 'all' ? '#0f172a' : 'white',
                  border: 'none',
                  fontWeight: '700'
                }}
              >
                All Roles ({allUsers.length})
              </button>

              <button
                onClick={() => setRoleFilter('companion')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  background: roleFilter === 'companion' ? '#34d399' : 'rgba(255,255,255,0.1)',
                  color: roleFilter === 'companion' ? '#0f172a' : 'white',
                  border: 'none',
                  fontWeight: '700'
                }}
              >
                👨‍🦱 Companions ({stats.total_companions})
              </button>

              <button
                onClick={() => setRoleFilter('user')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  background: roleFilter === 'user' ? '#60a5fa' : 'rgba(255,255,255,0.1)',
                  color: roleFilter === 'user' ? '#0f172a' : 'white',
                  border: 'none',
                  fontWeight: '700'
                }}
              >
                👨‍👩‍👧 Patients/Family ({stats.total_families})
              </button>

              <button
                onClick={() => setRoleFilter('staff')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  background: roleFilter === 'staff' ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                  color: roleFilter === 'staff' ? '#0f172a' : 'white',
                  border: 'none',
                  fontWeight: '700'
                }}
              >
                🩺 Nurses/Staff ({stats.total_staff})
              </button>
            </div>
          </div>

          <div className="glass-panel" style={{ overflowX: 'auto', padding: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Name</th>
                  <th style={{ padding: '0.75rem' }}>IC / MyKad</th>
                  <th style={{ padding: '0.75rem' }}>Gender</th>
                  <th style={{ padding: '0.75rem' }}>Role</th>
                  <th style={{ padding: '0.75rem' }}>Email & Phone</th>
                  <th style={{ padding: '0.75rem' }}>UniSZA ID / Notes</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: '700' }}>{u.name}</td>
                    <td style={{ padding: '0.75rem' }}>{u.ic_number}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`badge ${u.gender === 'L' ? 'badge-male' : 'badge-female'}`}>
                        {u.gender === 'L' ? 'Lelaki' : 'Perempuan'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className="badge" style={{ background: u.role === 'companion' ? 'rgba(5, 150, 105, 0.3)' : u.role === 'staff' || u.role === 'admin' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(2, 132, 199, 0.3)', color: u.role === 'companion' ? '#34d399' : u.role === 'staff' || u.role === 'admin' ? '#f59e0b' : '#38bdf8' }}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div>{u.email}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.phone}</div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {u.companion_profile?.student_staff_id ? (
                        <span style={{ color: '#34d399', fontWeight: '700' }}>🎓 {u.companion_profile.student_staff_id}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {intval(u.is_verified) === 1 ? (
                        <span className="badge" style={{ background: 'rgba(5, 150, 105, 0.25)', color: '#34d399' }}>✓ Verified</span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.25)', color: '#f59e0b' }}>Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Pending Account Approvals */}
      {activeTab === 'approvals' && (
        <div className="animate-fade-in">
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem', color: '#f472b6' }}>
            🔔 Pending User Account Registration Approvals ({unverifiedUsers.length})
          </h3>

          {unverifiedUsers.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              ✓ No pending user registrations. All registered accounts are verified and active!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {unverifiedUsers.map((acc) => (
                <div key={acc.id} className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(15, 23, 42, 0.6)', borderLeft: '4px solid #f472b6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: '800' }}>{acc.name}</h4>
                        <span className="badge" style={{ background: acc.role === 'companion' ? 'rgba(5, 150, 105, 0.3)' : acc.role === 'staff' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(2, 132, 199, 0.3)', color: acc.role === 'companion' ? '#34d399' : acc.role === 'staff' ? '#f59e0b' : '#38bdf8' }}>
                          {acc.role.toUpperCase()}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                        <p>🪪 MyKad IC: <strong>{acc.ic_number}</strong> ({acc.gender === 'L' ? 'Male' : 'Female'})</p>
                        <p>📧 Email: <strong>{acc.email}</strong> | 📱 Phone: <strong>{acc.phone}</strong></p>
                        {acc.companion_profile?.student_staff_id && (
                          <p>🎓 UniSZA ID: <strong>{acc.companion_profile.student_staff_id}</strong></p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleApproveUserAccount(acc.id)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', background: 'linear-gradient(135deg, #059669, #0284c7)' }}
                      >
                        ✓ Approve Account
                      </button>
                      <button
                        onClick={() => handleRejectUserAccount(acc.id)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', border: '1px solid #f43f5e', color: '#fda4af' }}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Active Duty Shifts */}
      {activeTab === 'active_duties' && (
        <div className="animate-fade-in">
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem', color: '#34d399' }}>
            🔄 Active Ward Duty Shifts ({activeDutiesList.length})
          </h3>

          {activeDutiesList.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No active in-progress duty shifts in HoSZA wards currently.
            </div>
          ) : (
            <div className="glass-panel" style={{ overflowX: 'auto', padding: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>Pass / Request Code</th>
                    <th style={{ padding: '0.75rem' }}>Patient Name (RN)</th>
                    <th style={{ padding: '0.75rem' }}>Ward & Bed</th>
                    <th style={{ padding: '0.75rem' }}>Shift Hours</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDutiesList.map((req) => (
                    <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: '700', color: '#38bdf8' }}>{req.request_code}</td>
                      <td style={{ padding: '0.75rem' }}>{req.patient_name} ({req.patient_rn})</td>
                      <td style={{ padding: '0.75rem' }}>{req.ward_name} ({req.bed_number})</td>
                      <td style={{ padding: '0.75rem' }}>{req.shift_date} ({req.start_time} - {req.end_time})</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className="badge badge-in_progress">Active Duty</span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <button
                          onClick={() => handleOpenVerifyPassModal(req.request_code)}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', border: '1px solid #34d399', color: '#34d399' }}
                        >
                          🔍 Check Pass Info
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Nurse Verify E-Pass Scanner */}
      {showVerifyPassModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>📷 Nurse / Staff Ward Pass Verification</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Scan or type Digital Ward Entry Pass Code / QR Token</p>
              </div>
              <button onClick={() => setShowVerifyPassModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleVerifyPassSubmit} style={{ marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label>Enter Pass Code / QR Token</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. IPENEMAN-20260730-8472"
                    value={inputPassCode}
                    onChange={(e) => setInputPassCode(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #059669, #0284c7)' }}>
                    {verifying ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>
            </form>

            {/* Verification Result Display */}
            {verificationResult && (
              <div>
                {verificationResult.is_valid ? (
                  verificationResult.already_scanned ? (
                    /* DUPLICATE SCAN ALERT */
                    <div style={{ background: 'rgba(245, 158, 11, 0.25)', border: '2px solid #f59e0b', borderRadius: '12px', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{ color: '#f59e0b', fontWeight: '800', fontSize: '1.1rem' }}>
                          ⚠️ ATTENTION: PASS HAS ALREADY BEEN SCANNED BY SYSTEM!
                        </div>
                        <span className="badge" style={{ background: '#f59e0b', color: '#0f172a', fontWeight: '800' }}>
                          DUPLICATE SCAN
                        </span>
                      </div>

                      <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.825rem' }}>
                        <p style={{ color: '#f59e0b', fontWeight: '700' }}>
                          🕒 First Scanned At: {verificationResult.previous_scan_info?.scanned_at}
                        </p>
                        <p style={{ color: '#e2e8f0' }}>
                          👤 Scanned By: <strong>{verificationResult.previous_scan_info?.scanned_by_name}</strong>
                        </p>
                      </div>

                      <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: '#e2e8f0' }}>
                        <p>👨‍🦱 <strong>Companion Name:</strong> {verificationResult.companion?.name}</p>
                        <p>🪪 <strong>IC / MyKad:</strong> {verificationResult.companion?.ic_number}</p>
                        <p>🏥 <strong>Authorized Ward:</strong> {verificationResult.request?.ward_name} ({verificationResult.request?.bed_number})</p>
                        <p>👴 <strong>Patient Name (RN):</strong> {verificationResult.request?.patient_name} ({verificationResult.request?.patient_rn})</p>
                      </div>
                    </div>
                  ) : (
                    /* FIRST TIME SCAN SUCCESS */
                    <div style={{ background: 'rgba(5, 150, 105, 0.25)', border: '2px solid #34d399', borderRadius: '12px', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: '800', fontSize: '1.1rem', marginBottom: '0.75rem' }}>
                        ✓ VALID DIGITAL WARD ENTRY PASS (HOSZA)
                      </div>

                      <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: '#e2e8f0' }}>
                        <p>👨‍🦱 <strong>Companion Name:</strong> {verificationResult.companion?.name}</p>
                        <p>🪪 <strong>IC / MyKad:</strong> {verificationResult.companion?.ic_number}</p>
                        <p>📱 <strong>Phone:</strong> {verificationResult.companion?.phone}</p>
                        <p>🎓 <strong>UniSZA ID:</strong> {verificationResult.companion?.profile?.student_staff_id || 'N/A'}</p>
                        <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />
                        <p>🏥 <strong>Authorized Ward:</strong> {verificationResult.request?.ward_name} ({verificationResult.request?.bed_number})</p>
                        <p>👴 <strong>Patient Name (RN):</strong> {verificationResult.request?.patient_name} ({verificationResult.request?.patient_rn})</p>
                        <p>⏰ <strong>Shift Hours:</strong> {verificationResult.request?.shift_date} ({verificationResult.request?.start_time} - {verificationResult.request?.end_time})</p>
                        <p style={{ color: '#38bdf8' }}>🔒 <strong>Safety Filter:</strong> {verificationResult.request?.patient_gender === 'L' ? 'Male Companion for Male Patient (Verified)' : 'Female Companion for Female Patient (Verified)'}</p>
                      </div>

                      <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                        Verified At: {verificationResult.verified_at}
                      </div>
                    </div>
                  )
                ) : (
                  <div style={{ background: 'rgba(225, 29, 72, 0.25)', border: '2px solid #f43f5e', borderRadius: '12px', padding: '1.25rem', color: '#fda4af' }}>
                    <div style={{ fontWeight: '800', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                      ⛔ INVALID OR UNAPPROVED PASS
                    </div>
                    <p style={{ fontSize: '0.85rem' }}>{verificationResult.error_message}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Review Applicants */}
      {showApplicantsModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Review Companion Applicants</h3>
                <p style={{ fontSize: '0.8rem', color: '#f59e0b' }}>
                  Request Code: {selectedRequest.request_code} | Ward: {selectedRequest.ward_name} ({selectedRequest.patient_gender === 'L' ? 'Male Ward' : 'Female Ward'})
                </p>
              </div>
              <button onClick={() => setShowApplicantsModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            {loadingApplicants ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading companion applications...</div>
            ) : applicants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No companions have applied for this request yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {applicants.map((comp) => (
                  <div key={comp.id} className="glass-panel" style={{ padding: '1rem 1.25rem', background: 'rgba(15, 23, 42, 0.6)', borderLeft: '4px solid #34d399' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: '700' }}>{comp.name}</h4>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          IC: <strong>{comp.ic_number}</strong> | Gender: <strong>{comp.gender === 'L' ? 'Male' : 'Female'}</strong>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          UniSZA ID: <strong>{comp.companion_profile?.student_staff_id || 'N/A'}</strong> | Rating: ⭐ <strong>{comp.companion_profile?.rating_avg || '5.00'}</strong>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#34d399', marginTop: '0.25rem' }}>
                          ✓ Health Declaration: Healthy ({comp.companion_profile?.health_status})
                        </div>
                      </div>

                      <button
                        onClick={() => handleApproveApplicant(comp.id)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', background: 'linear-gradient(135deg, #059669, #0284c7)' }}
                      >
                        ✓ Approve & Assign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Settings Payment Rates */}
      {showSettingsModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>⚙️ Payment Rate Configuration</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Configure hospital system companion hourly allowance rates</p>
              </div>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleSaveSettings}>
              <div className="form-group">
                <label>Standard Hourly Rate (RM / hour)</label>
                <input
                  type="number"
                  step="0.50"
                  className="form-input"
                  value={rateSettings.default_hourly_rate}
                  onChange={(e) => setRateSettings({ ...rateSettings, default_hourly_rate: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recommended standard rate used for auto-calculating shift allowance</span>
              </div>

              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label>Minimum Hourly Rate (RM)</label>
                  <input
                    type="number"
                    step="0.50"
                    className="form-input"
                    value={rateSettings.min_hourly_rate}
                    onChange={(e) => setRateSettings({ ...rateSettings, min_hourly_rate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Maximum Hourly Rate (RM)</label>
                  <input
                    type="number"
                    step="0.50"
                    className="form-input"
                    value={rateSettings.max_hourly_rate}
                    onChange={(e) => setRateSettings({ ...rateSettings, max_hourly_rate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', background: 'linear-gradient(135deg, #059669, #0284c7)' }}>
                Save Payment Rate Settings
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal On-Behalf Request (Admin) */}
      {showOnBehalfModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Create Request (On Behalf of Patient)</h3>
                <p style={{ fontSize: '0.8rem', color: '#f59e0b' }}>For patients without family / unaccompanied in HoSZA</p>
              </div>
              <button onClick={() => setShowOnBehalfModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleOnBehalfSubmit}>
              <div className="form-group">
                <label>Patient Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.patient_name}
                  onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label>Patient Registration Number (RN HoSZA)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.patient_rn}
                    onChange={(e) => setFormData({ ...formData, patient_rn: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Patient Gender (Required for companion matching)</label>
                  <select
                    className="form-select"
                    value={formData.patient_gender}
                    onChange={(e) => setFormData({ ...formData, patient_gender: e.target.value })}
                  >
                    <option value="L">Male (Male Companion Only)</option>
                    <option value="P">Female (Female Companion Only)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label>HoSZA Ward Location</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.ward_name}
                    onChange={(e) => setFormData({ ...formData, ward_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Bed Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.bed_number}
                    onChange={(e) => setFormData({ ...formData, bed_number: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-3" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label>Shift Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.shift_date}
                    onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Ward Staff Instructions & Notes</label>
                <textarea
                  rows="3"
                  className="form-textarea"
                  value={formData.task_details}
                  onChange={(e) => setFormData({ ...formData, task_details: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                Publish Ward Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
