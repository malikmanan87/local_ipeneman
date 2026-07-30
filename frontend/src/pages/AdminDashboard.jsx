import React, { useState, useEffect } from 'react';
import { adminAPI, requestAPI } from '../services/api';

const ROLE_CONFIG = {
  companion: { label: 'Companion',     color: '#34d399', bg: 'rgba(5,150,105,0.18)',  icon: '👨‍🦱' },
  user:      { label: 'Patient/Family',color: '#38bdf8', bg: 'rgba(2,132,199,0.18)',  icon: '👨‍👩‍👧' },
  staff:     { label: 'Ward Nurse',    color: '#f59e0b', bg: 'rgba(245,158,11,0.18)', icon: '🩺' },
  admin:     { label: 'Admin',         color: '#a78bfa', bg: 'rgba(139,92,246,0.18)', icon: '👑' },
};

const STATUS_BADGE = {
  open:        { label: 'Open',        color: '#34d399', bg: 'rgba(5,150,105,0.15)' },
  assigned:    { label: 'Assigned',    color: '#fbbf24', bg: 'rgba(245,158,11,0.15)' },
  in_progress: { label: 'In Progress', color: '#a78bfa', bg: 'rgba(139,92,246,0.15)' },
  completed:   { label: 'Completed',   color: '#94a3b8', bg: 'rgba(100,116,139,0.15)' },
};

function SectionBadge({ status }) {
  const s = STATUS_BADGE[status] || { label: status, color: '#94a3b8', bg: 'rgba(100,116,139,0.15)' };
  return (
    <span style={{ padding: '0.25rem 0.65rem', borderRadius: '9999px', fontSize: '0.73rem', fontWeight: '700', background: s.bg, color: s.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {s.label}
    </span>
  );
}

function RoleBadge({ role }) {
  const c = ROLE_CONFIG[role] || { label: role, color: '#94a3b8', bg: 'rgba(100,116,139,0.15)', icon: '👤' };
  return (
    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.73rem', fontWeight: '700', background: c.bg, color: c.color }}>
      {c.icon} {c.label}
    </span>
  );
}

function VerifyPassResult({ result }) {
  if (!result) return null;

  if (!result.is_valid) {
    return (
      <div style={{ background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.4)', borderRadius: '12px', padding: '1.25rem', marginTop: '1rem' }}>
        <div style={{ color: '#f87171', fontWeight: '800', fontSize: '1rem', marginBottom: '0.4rem' }}>⛔ Invalid or Unapproved Pass</div>
        <p style={{ fontSize: '0.85rem', color: '#fca5a5' }}>{result.error_message}</p>
      </div>
    );
  }

  if (result.already_scanned) {
    return (
      <div style={{ background: 'rgba(245,158,11,0.12)', border: '1.5px solid rgba(245,158,11,0.45)', borderRadius: '12px', padding: '1.25rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ color: '#fbbf24', fontWeight: '800', fontSize: '0.97rem' }}>⚠️ ATTENTION: Pass Already Scanned by System!</span>
          <span style={{ background: '#f59e0b', color: '#0f172a', padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '800' }}>DUPLICATE</span>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem', fontSize: '0.83rem' }}>
          <div style={{ color: '#fbbf24', fontWeight: '700' }}>🕒 First Scanned At: {result.previous_scan_info?.scanned_at}</div>
          <div style={{ color: '#e2e8f0', marginTop: '0.2rem' }}>👤 Scanned By: <strong>{result.previous_scan_info?.scanned_by_name}</strong></div>
        </div>
        <div style={{ fontSize: '0.84rem', color: '#e2e8f0', lineHeight: '1.65' }}>
          <p><strong>Companion:</strong> {result.companion?.name} — IC: {result.companion?.ic_number}</p>
          <p><strong>Ward:</strong> {result.request?.ward_name} ({result.request?.bed_number}) | Patient: {result.request?.patient_name}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'rgba(5,150,105,0.12)', border: '1.5px solid rgba(5,150,105,0.45)', borderRadius: '12px', padding: '1.25rem', marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span style={{ color: '#34d399', fontWeight: '800', fontSize: '0.97rem' }}>✅ Valid Digital Ward Entry Pass</span>
        <span style={{ background: '#059669', color: 'white', padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '800' }}>AUTHORIZED</span>
      </div>
      <div style={{ fontSize: '0.84rem', color: '#e2e8f0', lineHeight: '1.7' }}>
        <p>👨‍🦱 <strong>Companion:</strong> {result.companion?.name} ({result.companion?.ic_number})</p>
        <p>📱 <strong>Phone:</strong> {result.companion?.phone} | 🎓 UniSZA: {result.companion?.profile?.student_staff_id || 'N/A'}</p>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0.65rem 0' }} />
        <p>🏥 <strong>Ward:</strong> {result.request?.ward_name} ({result.request?.bed_number})</p>
        <p>👴 <strong>Patient:</strong> {result.request?.patient_name} ({result.request?.patient_rn})</p>
        <p>⏰ <strong>Shift:</strong> {result.request?.shift_date} · {result.request?.start_time} – {result.request?.end_time}</p>
        <p style={{ color: '#38bdf8', marginTop: '0.2rem' }}>🔒 {result.request?.patient_gender === 'L' ? 'Male Companion — Male Ward (Verified)' : 'Female Companion — Female Ward (Verified)'}</p>
      </div>
      <div style={{ textAlign: 'right', fontSize: '0.74rem', color: '#64748b', marginTop: '0.75rem' }}>Verified at {result.verified_at}</div>
    </div>
  );
}

export default function AdminDashboard({ user }) {
  const [stats, setStats] = useState({ total_users: 0, total_companions: 0, total_families: 0, total_staff: 0, pending_approvals: 0, total_requests: 0, active_duties: 0 });
  const [activeTab, setActiveTab] = useState('requests');
  const [roleFilter, setRoleFilter] = useState('all');
  const [requestStatusFilter, setRequestStatusFilter] = useState('open');
  const [financeFilter, setFinanceFilter] = useState('all');
  const [requests, setRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [unverifiedUsers, setUnverifiedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showOnBehalfModal, setShowOnBehalfModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showApplicantsModal, setShowApplicantsModal] = useState(false);
  const [showVerifyPassModal, setShowVerifyPassModal] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetailRequest, setSelectedDetailRequest] = useState(null);

  const [inputPassCode, setInputPassCode] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  const [rateSettings, setRateSettings] = useState({ default_hourly_rate: '10.00', min_hourly_rate: '8.00', max_hourly_rate: '30.00' });

  const [formData, setFormData] = useState({
    created_by_user_id: user.id,
    created_by_role: 'admin',
    patient_name: '', patient_rn: '', patient_gender: 'L', patient_age: 70,
    ward_name: '', bed_number: '',
    shift_date: new Date().toISOString().split('T')[0],
    start_time: '08:00', end_time: '16:00',
    task_details: '', allowance_type: 'paid', allowance_amount: 50.00
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, reqRes, settingsRes, unverifiedRes, usersRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getAllRequests(),
        adminAPI.getSettings(),
        adminAPI.getUnverifiedUsers(),
        adminAPI.getAllUsers(),
      ]);
      if (statsRes.data.stats) setStats(statsRes.data.stats);
      setRequests(reqRes.data || []);
      if (settingsRes.data.settings) setRateSettings(settingsRes.data.settings);
      setUnverifiedUsers(unverifiedRes.data.data || []);
      setAllUsers(usersRes.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApproveUser = async (id) => {
    try { await adminAPI.verifyUser(id); fetchData(); }
    catch { alert('Failed to approve account.'); }
  };

  const handleRejectUser = async (id) => {
    if (!window.confirm('Reject and permanently remove this account?')) return;
    try { await adminAPI.rejectUser(id); fetchData(); }
    catch { alert('Failed to reject account.'); }
  };

  const handleVerifyPassSubmit = async (e) => {
    e.preventDefault();
    setVerifying(true); setVerificationResult(null);
    try {
      const res = await adminAPI.verifyPass(inputPassCode.trim(), user.id);
      setVerificationResult(res.data);
    } catch (err) {
      setVerificationResult({ is_valid: false, error_message: err.response?.data?.messages?.error || err.response?.data?.message || 'Invalid or unassigned Pass Code.' });
    } finally { setVerifying(false); }
  };

  const handleOpenApplicants = async (req) => {
    setSelectedRequest(req); setShowApplicantsModal(true); setLoadingApplicants(true);
    try { const res = await requestAPI.getApplicants(req.id); setApplicants(res.data.data || []); }
    catch { console.error('Failed to fetch applicants'); }
    finally { setLoadingApplicants(false); }
  };

  const handleApproveApplicant = async (companionId) => {
    try {
      await requestAPI.acceptCompanion({ request_id: selectedRequest.id, companion_id: companionId });
      setShowApplicantsModal(false); fetchData();
    } catch { alert('Failed to assign companion.'); }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try { await adminAPI.updateSettings(rateSettings); setShowSettingsModal(false); fetchData(); }
    catch { alert('Failed to update settings.'); }
  };

  const handleOnBehalfSubmit = async (e) => {
    e.preventDefault();
    try { await requestAPI.create(formData); setShowOnBehalfModal(false); fetchData(); }
    catch { alert('Failed to create request.'); }
  };

  const handleExportCSV = () => {
    if (!requests || requests.length === 0) {
      alert('No financial data available to export.');
      return;
    }

    const headers = ['Pass Code', 'Status', 'Companion Name', 'Companion IC', 'UniSZA ID', 'Patient Name', 'Patient RN', 'Ward', 'Bed', 'Shift Date', 'Start Time', 'End Time', 'Base Allowance (RM)', 'Tips (RM)', 'Total Payout (RM)', 'Payout Status'];

    const rows = requests.map(r => {
      const base = parseFloat(r.allowance_amount || 0);
      const tip = parseFloat(r.tip_amount || 0);
      const total = base + tip;
      let payoutStatus = 'Unassigned';
      if (r.status === 'completed') payoutStatus = 'Disbursed / Paid';
      else if (r.assigned_companion_id) payoutStatus = 'Pending Shift';

      return [
        `"${r.request_code || ''}"`,
        `"${r.status || ''}"`,
        `"${r.companion?.name || ''}"`,
        `"${r.companion?.ic_number || ''}"`,
        `"${r.companion?.companion_profile?.student_staff_id || ''}"`,
        `"${r.patient_name || ''}"`,
        `"${r.patient_rn || ''}"`,
        `"${r.ward_name || ''}"`,
        `"${r.bed_number || ''}"`,
        `"${r.shift_date || ''}"`,
        `"${r.start_time || ''}"`,
        `"${r.end_time || ''}"`,
        base.toFixed(2),
        tip.toFixed(2),
        total.toFixed(2),
        `"${payoutStatus}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HoSZA_Financial_Ledger_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeDutiesList = requests.filter(r => r.status === 'in_progress' || r.status === 'assigned');

  // Dynamic Financial Sums for Stat Cards
  const totalGrandSum = requests.reduce((sum, r) => sum + (parseFloat(r.allowance_amount || 0) + parseFloat(r.tip_amount || 0)), 0);
  const totalDisbursedSum = requests.filter(r => r.status === 'completed').reduce((sum, r) => sum + (parseFloat(r.allowance_amount || 0) + parseFloat(r.tip_amount || 0)), 0);

  // Accurate counts from actual allUsers list
  const userCounts = {
    all:       allUsers.length,
    companion: allUsers.filter(u => u.role === 'companion').length,
    user:      allUsers.filter(u => u.role === 'user').length,
    staff:     allUsers.filter(u => u.role === 'staff').length,
    admin:     allUsers.filter(u => u.role === 'admin').length,
  };

  const filteredUsers = allUsers.filter(u => {
    if (roleFilter === 'all') return true;
    return u.role === roleFilter;
  });

  const TABS = [
    { key: 'requests',      label: 'Ward Requests',    icon: '📋', count: requests.length,        color: '#f59e0b' },
    { key: 'active_duties', label: 'Active Shifts',    icon: '🔄', count: activeDutiesList.length, color: '#34d399' },
    { key: 'approvals',     label: 'Pending Approvals',icon: '🔔', count: unverifiedUsers.length,  color: '#f472b6' },
    { key: 'users',         label: 'Total Users',      icon: '👥', count: allUsers.length,         color: '#38bdf8' },
  ];

  return (
    <div style={{ background: 'var(--bg-dark)', minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: '1280px', padding: '2rem 1.5rem' }}>

        {/* ── Page Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#38bdf8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              🏥 Hospital Sultan Zainal Abidin (HoSZA)
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: '800', marginBottom: '0.25rem' }}>Admin Control Portal</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Logged in as <strong style={{ color: '#f1f5f9' }}>{user.name}</strong> · Administrator
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button onClick={() => { setInputPassCode(''); setVerificationResult(null); setShowVerifyPassModal(true); }} className="btn btn-primary" style={{ fontSize: '0.875rem', padding: '0.65rem 1.2rem' }}>
              📷 Scan Ward E-Pass
            </button>
            <button onClick={() => setShowOnBehalfModal(true)} className="btn btn-secondary" style={{ fontSize: '0.875rem', padding: '0.65rem 1.2rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)' }}>
              🏥 New On-Behalf Request
            </button>
            <button onClick={() => setShowSettingsModal(true)} className="btn btn-secondary" style={{ fontSize: '0.875rem', padding: '0.65rem 1.2rem' }}>
              ⚙️ Payment Rates
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          {/* Card 1: Ward Requests */}
          <div
            onClick={() => setActiveTab('requests')}
            className="glass-panel"
            style={{
              padding: '1.4rem 1.5rem', cursor: 'pointer',
              border: activeTab === 'requests' ? '1.5px solid #f59e0b' : '1px solid var(--glass-border)',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: '1.6rem', marginBottom: '0.65rem' }}>📋</div>
            <div style={{ fontSize: '1.9rem', fontWeight: '800', color: '#f59e0b', lineHeight: 1 }}>{stats.total_requests}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#f1f5f9', marginTop: '0.3rem' }}>Ward Requests</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>All time</div>
          </div>

          {/* Card 2: Financial Ledger */}
          <div
            onClick={() => setActiveTab('finance')}
            className="glass-panel"
            style={{
              padding: '1.4rem 1.5rem', cursor: 'pointer',
              border: activeTab === 'finance' ? '1.5px solid #34d399' : '1px solid var(--glass-border)',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: '1.6rem', marginBottom: '0.65rem' }}>💵</div>
            <div style={{ fontSize: '1.9rem', fontWeight: '800', color: '#34d399', lineHeight: 1 }}>RM {totalGrandSum.toFixed(2)}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#f1f5f9', marginTop: '0.3rem' }}>Financial Ledger</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>RM {totalDisbursedSum.toFixed(2)} disbursed</div>
          </div>

          {/* Combined Card 3 & 4: Pending Approvals + Total Users with Separator */}
          <div
            className="glass-panel"
            style={{
              padding: '1.4rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
              alignItems: 'center', position: 'relative', overflow: 'hidden',
              border: (activeTab === 'approvals' ? '1.5px solid #f472b6' : activeTab === 'users' ? '1.5px solid #38bdf8' : '1px solid var(--glass-border)'),
              transition: 'all 0.2s ease',
            }}
          >
            {/* Part A: Pending Approvals */}
            <div
              onClick={() => setActiveTab('approvals')}
              style={{ cursor: 'pointer', paddingRight: '0.5rem', position: 'relative' }}
            >
              {stats.pending_approvals > 0 && (
                <span style={{ position: 'absolute', top: 0, right: '0.2rem', width: '8px', height: '8px', borderRadius: '50%', background: '#f472b6', boxShadow: '0 0 8px #f472b6' }} />
              )}
              <div style={{ fontSize: '1.6rem', marginBottom: '0.65rem' }}>🔔</div>
              <div style={{ fontSize: '1.9rem', fontWeight: '800', color: '#f472b6', lineHeight: 1 }}>{stats.pending_approvals}</div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: activeTab === 'approvals' ? '#f472b6' : '#f1f5f9', marginTop: '0.3rem' }}>Pending Approvals</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Review accounts</div>
            </div>

            {/* Separator + Part B: Total Users */}
            <div
              onClick={() => setActiveTab('users')}
              style={{ cursor: 'pointer', borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: '1rem' }}
            >
              <div style={{ fontSize: '1.6rem', marginBottom: '0.65rem' }}>👥</div>
              <div style={{ fontSize: '1.9rem', fontWeight: '800', color: '#38bdf8', lineHeight: 1 }}>{stats.total_users}</div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: activeTab === 'users' ? '#38bdf8' : '#f1f5f9', marginTop: '0.3rem' }}>Total Users</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{stats.total_companions} comp · {stats.total_families} fam</div>
            </div>
          </div>
        </div>



        {/* ── Tab: Ward Requests ── */}
        {activeTab === 'requests' && (() => {
          const statusCounts = {
            all: requests.length,
            open: requests.filter(r => r.status === 'open').length,
            in_progress: requests.filter(r => r.status === 'in_progress' || r.status === 'assigned').length,
            completed: requests.filter(r => r.status === 'completed').length,
          };

          const filteredRequests = requests.filter(r => {
            if (requestStatusFilter === 'all') return true;
            if (requestStatusFilter === 'open') return r.status === 'open';
            if (requestStatusFilter === 'in_progress') return r.status === 'in_progress' || r.status === 'assigned';
            if (requestStatusFilter === 'completed') return r.status === 'completed';
            return true;
          });

          return (
            <div className="glass-panel animate-fade-in" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: '800' }}>📋 Ward Requests Overview</h2>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Showing {filteredRequests.length} of {requests.length} requests</div>
                </div>
                {/* Status Filter Pills */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {[
                    { key: 'open',        label: 'Open',        count: statusCounts.open },
                    { key: 'in_progress', label: 'In Progress', count: statusCounts.in_progress },
                    { key: 'completed',   label: 'Completed',   count: statusCounts.completed },
                    { key: 'all',         label: 'All',         count: statusCounts.all },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setRequestStatusFilter(f.key)}
                      style={{
                        padding: '0.35rem 0.85rem', borderRadius: '9999px', fontSize: '0.8rem',
                        fontWeight: '700', cursor: 'pointer',
                        background: requestStatusFilter === f.key ? '#f59e0b' : 'rgba(255,255,255,0.07)',
                        color: requestStatusFilter === f.key ? '#0f172a' : 'var(--text-muted)',
                        border: 'none', transition: 'all 0.15s ease',
                      }}
                    >
                      {f.label} <span style={{ opacity: 0.75 }}>({f.count})</span>
                    </button>
                  ))}
                </div>
              </div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
              ) : filteredRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No ward requests found for this filter.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                        {['No.', 'Pass Code', 'Creator', 'Patient (RN)', 'Ward & Bed', 'Shift', 'Payout (RM)', 'Status', ''].map(h => (
                          <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((req, i) => (
                        <tr key={req.id} style={{ borderTop: '1px solid var(--border-color)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: '800', color: 'var(--text-muted)', fontSize: '0.82rem', fontFamily: 'monospace' }}>{i + 1}</td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: '800', color: '#f59e0b', fontFamily: 'monospace', fontSize: '0.8rem' }}>{req.request_code}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {req.created_by_role === 'admin'
                              ? <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>HoSZA On-Behalf</span>
                              : <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>Patient Family</span>
                            }
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: '600' }}>{req.patient_name}</div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{req.patient_rn} · {req.patient_gender === 'L' ? '🔵 Male' : '🩷 Female'}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div>{req.ward_name}</div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{req.bed_number}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                            <div style={{ fontSize: '0.82rem' }}>{req.shift_date}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.start_time} – {req.end_time}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: '800', color: '#34d399', fontFamily: 'monospace' }}>
                            RM {(parseFloat(req.allowance_amount || 0) + parseFloat(req.tip_amount || 0)).toFixed(2)}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}><SectionBadge status={req.status} /></td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {req.status === 'open' && (
                                <button onClick={() => handleOpenApplicants(req)} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}>
                                  👥 Applicants
                                </button>
                              )}
                              <button
                                onClick={() => { setSelectedDetailRequest(req); setShowDetailModal(true); }}
                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.4)', background: 'rgba(56,189,248,0.08)', color: '#38bdf8', cursor: 'pointer', fontWeight: '700' }}
                              >
                                📄 Details
                              </button>
                              <button
                                onClick={() => { setInputPassCode(req.request_code); setVerificationResult(null); setShowVerifyPassModal(true); }}
                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', borderRadius: '8px', border: '1px solid rgba(52,211,153,0.4)', background: 'rgba(52,211,153,0.08)', color: '#34d399', cursor: 'pointer', fontWeight: '700' }}
                              >
                                🔍 Pass
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
          );
        })()}

        {/* ── Tab: Financial Ledger & Payout Oversight ── */}
        {activeTab === 'finance' && (() => {
          const filteredFinanceRequests = requests.filter(r => {
            if (financeFilter === 'completed') return r.status === 'completed';
            if (financeFilter === 'pending') return r.status === 'in_progress' || r.status === 'assigned';
            if (financeFilter === 'open') return r.status === 'open';
            return true;
          });

          // Accurate dynamic calculations directly from requests array
          const completedPayoutCalc = requests
            .filter(r => r.status === 'completed')
            .reduce((sum, r) => sum + (parseFloat(r.allowance_amount || 0) + parseFloat(r.tip_amount || 0)), 0);

          const pendingPayoutCalc = requests
            .filter(r => r.status === 'in_progress' || r.status === 'assigned' || r.status === 'open')
            .reduce((sum, r) => sum + (parseFloat(r.allowance_amount || 0) + parseFloat(r.tip_amount || 0)), 0);

          const grandTotalCalc = requests
            .reduce((sum, r) => sum + (parseFloat(r.allowance_amount || 0) + parseFloat(r.tip_amount || 0)), 0);

          const tipsCalc = requests
            .reduce((sum, r) => sum + parseFloat(r.tip_amount || 0), 0);

          return (
            <div className="animate-fade-in">
              {/* Unified Financial Summary Panel with Separators */}
              <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid #34d399' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center' }}>
                  
                  {/* Item 1: Disbursed Payout */}
                  <div style={{ paddingRight: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Disbursed Payout (Completed)</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#34d399', marginTop: '0.2rem' }}>
                      RM {completedPayoutCalc.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>Full duty completed & verified</div>
                  </div>

                  {/* Item 2: Pending Shift Payout */}
                  <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1.1rem', paddingRight: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Shift Payout</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#fbbf24', marginTop: '0.2rem' }}>
                      RM {pendingPayoutCalc.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>Reserved for active/open shifts</div>
                  </div>

                  {/* Item 3: Grand Total Finance Value */}
                  <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1.1rem', paddingRight: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Grand Total Finance Value</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#38bdf8', marginTop: '0.2rem' }}>
                      RM {grandTotalCalc.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>All-time total shift value</div>
                  </div>

                  {/* Item 4: Total Tips / Bonus Collected */}
                  <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1.1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Tips / Bonus Collected</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#a78bfa', marginTop: '0.2rem' }}>
                      RM {tipsCalc.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>Optional tips from patient family</div>
                  </div>

                </div>
              </div>

              {/* Main Ledger Table Panel */}
              <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#34d399' }}>💵 HoSZA Shift Financial Ledger</h2>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Showing {filteredFinanceRequests.length} shift transactions</div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Status Filter Pills */}
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {[
                        { key: 'all',       label: 'All Shifts' },
                        { key: 'completed', label: 'Disbursed' },
                        { key: 'pending',   label: 'Pending' },
                        { key: 'open',      label: 'Unassigned' },
                      ].map(f => (
                        <button
                          key={f.key}
                          onClick={() => setFinanceFilter(f.key)}
                          style={{
                            padding: '0.35rem 0.8rem', borderRadius: '9999px', fontSize: '0.78rem',
                            fontWeight: '700', cursor: 'pointer',
                            background: financeFilter === f.key ? '#34d399' : 'rgba(255,255,255,0.07)',
                            color: financeFilter === f.key ? '#0f172a' : 'var(--text-muted)',
                            border: 'none', transition: 'all 0.15s ease',
                          }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {/* Export CSV Button */}
                    <button
                      onClick={handleExportCSV}
                      className="btn btn-primary"
                      style={{ fontSize: '0.8rem', padding: '0.45rem 1rem', background: 'linear-gradient(135deg, #059669, #10b981)', whiteSpace: 'nowrap' }}
                    >
                      📥 Export CSV Report
                    </button>
                  </div>
                </div>

                {filteredFinanceRequests.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>No financial transactions found for this filter.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                          {['No.', 'Pass Code', 'Companion / Staff', 'Patient & Ward', 'Shift Date', 'Base (RM)', 'Tips (RM)', 'Total Payout', 'Payout Status'].map(h => (
                            <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFinanceRequests.map((req, i) => {
                          const base = parseFloat(req.allowance_amount || 0);
                          const tip = parseFloat(req.tip_amount || 0);
                          const total = base + tip;

                          return (
                            <tr key={req.id} style={{ borderTop: '1px solid var(--border-color)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                              <td style={{ padding: '0.85rem 1rem', fontWeight: '800', color: 'var(--text-muted)', fontSize: '0.82rem', fontFamily: 'monospace' }}>{i + 1}</td>
                              <td style={{ padding: '0.85rem 1rem', fontWeight: '800', color: '#f59e0b', fontFamily: 'monospace', fontSize: '0.8rem' }}>{req.request_code}</td>
                              <td style={{ padding: '0.85rem 1rem' }}>
                                {req.companion ? (
                                  <div>
                                    <div style={{ fontWeight: '700', color: '#f1f5f9' }}>{req.companion.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      IC: {req.companion.ic_number} {req.companion.companion_profile?.student_staff_id && `· 🎓 ${req.companion.companion_profile.student_staff_id}`}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', italic: 'true', fontSize: '0.8rem' }}>Not assigned yet</span>
                                )}
                              </td>
                              <td style={{ padding: '0.85rem 1rem' }}>
                                <div style={{ fontWeight: '600' }}>{req.patient_name}</div>
                                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{req.ward_name} ({req.bed_number})</div>
                              </td>
                              <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                                <div style={{ fontSize: '0.82rem' }}>{req.shift_date}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.start_time} – {req.end_time}</div>
                              </td>
                              <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.83rem' }}>RM {base.toFixed(2)}</td>
                              <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.83rem', color: '#fbbf24' }}>RM {tip.toFixed(2)}</td>
                              <td style={{ padding: '0.85rem 1rem', fontWeight: '900', color: '#34d399', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                                RM {total.toFixed(2)}
                              </td>
                              <td style={{ padding: '0.85rem 1rem' }}>
                                {req.status === 'completed' ? (
                                  <span style={{ fontSize: '0.73rem', fontWeight: '800', color: '#34d399', background: 'rgba(5,150,105,0.18)', padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>✓ DISBURSED</span>
                                ) : req.assigned_companion_id ? (
                                  <span style={{ fontSize: '0.73rem', fontWeight: '800', color: '#fbbf24', background: 'rgba(245,158,11,0.18)', padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>⏳ PENDING SHIFT</span>
                                ) : (
                                  <span style={{ fontSize: '0.73rem', fontWeight: '800', color: '#94a3b8', background: 'rgba(100,116,139,0.18)', padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>UNASSIGNED</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Tab: Active Shifts ── */}
        {activeTab === 'active_duties' && (
          <div className="glass-panel animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#34d399' }}>🔄 Active Ward Duty Shifts</h2>
            </div>
            {activeDutiesList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>No active shifts at this time.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                      {['No.', 'Pass Code', 'Patient (RN)', 'Ward & Bed', 'Shift Hours', 'Status', ''].map(h => (
                        <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeDutiesList.map((req, i) => (
                      <tr key={req.id} style={{ borderTop: '1px solid var(--border-color)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: '800', color: 'var(--text-muted)', fontSize: '0.82rem', fontFamily: 'monospace' }}>{i + 1}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: '800', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.8rem' }}>{req.request_code}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: '600' }}>{req.patient_name}</div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{req.patient_rn}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>{req.ward_name} · {req.bed_number}</td>
                        <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                          {req.shift_date}<br /><span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{req.start_time} – {req.end_time}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}><SectionBadge status={req.status} /></td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <button
                            onClick={() => { setInputPassCode(req.request_code); setVerificationResult(null); setShowVerifyPassModal(true); }}
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', borderRadius: '8px', border: '1px solid rgba(52,211,153,0.4)', background: 'rgba(52,211,153,0.08)', color: '#34d399', cursor: 'pointer', fontWeight: '700' }}
                          >
                            🔍 Check Pass
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

        {/* ── Tab: Pending Approvals ── */}
        {activeTab === 'approvals' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f472b6' }}>🔔 Pending Account Registrations ({unverifiedUsers.length})</h2>
            </div>
            {unverifiedUsers.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                ✓ All accounts are verified. No pending registrations.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {unverifiedUsers.map(acc => (
                  <div key={acc.id} className="glass-panel" style={{ padding: '1.25rem 1.5rem', borderLeft: '3px solid #f472b6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '800', fontSize: '1rem' }}>{acc.name}</span>
                        <RoleBadge role={acc.role} />
                        <span style={{ fontSize: '0.73rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '0.15rem 0.55rem', borderRadius: '9999px', fontWeight: '700' }}>PENDING</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                        <span>🪪 {acc.ic_number}</span>
                        <span style={{ margin: '0 0.5rem' }}>·</span>
                        <span>{acc.gender === 'L' ? '🔵 Male' : '🩷 Female'}</span>
                        <span style={{ margin: '0 0.5rem' }}>·</span>
                        <span>📧 {acc.email}</span>
                        <span style={{ margin: '0 0.5rem' }}>·</span>
                        <span>📱 {acc.phone}</span>
                        {acc.companion_profile?.student_staff_id && (
                          <><span style={{ margin: '0 0.5rem' }}>·</span><span style={{ color: '#34d399' }}>🎓 {acc.companion_profile.student_staff_id}</span></>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleApproveUser(acc.id)} className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}>✓ Approve</button>
                      <button onClick={() => handleRejectUser(acc.id)} style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer', fontWeight: '700' }}>✕ Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: User Directory ── */}
        {activeTab === 'users' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: '800' }}>👥 Total Users</h2>
              {/* Role filter pills — counts from actual allUsers array */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {[
                  { key: 'all',       label: 'All',        count: userCounts.all       },
                  { key: 'companion', label: 'Companions',  count: userCounts.companion },
                  { key: 'user',      label: 'Family',      count: userCounts.user      },
                  { key: 'staff',     label: 'Staff',       count: userCounts.staff     },
                  { key: 'admin',     label: 'Admin',       count: userCounts.admin     },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setRoleFilter(f.key)}
                    style={{
                      padding: '0.35rem 0.85rem', borderRadius: '9999px', fontSize: '0.8rem',
                      fontWeight: '700', cursor: 'pointer',
                      background: roleFilter === f.key ? '#38bdf8' : 'rgba(255,255,255,0.07)',
                      color: roleFilter === f.key ? '#0f172a' : 'var(--text-muted)',
                      border: 'none', transition: 'all 0.15s ease',
                    }}
                  >
                    {f.label} <span style={{ opacity: 0.75 }}>({f.count})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
              ) : filteredUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No users found for this filter.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                        {['No.', 'Name', 'IC / MyKad', 'Gender', 'Role', 'Contact', 'UniSZA ID', 'Account'].map(h => (
                          <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u, i) => (
                        <tr key={u.id} style={{ borderTop: '1px solid var(--border-color)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: '800', color: 'var(--text-muted)', fontSize: '0.82rem', fontFamily: 'monospace' }}>{i + 1}</td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: '700' }}>{u.name}</td>
                          <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{u.ic_number}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {u.gender === 'L'
                              ? <span style={{ color: '#60a5fa', fontWeight: '700', fontSize: '0.8rem' }}>🔵 Male</span>
                              : <span style={{ color: '#f472b6', fontWeight: '700', fontSize: '0.8rem' }}>🩷 Female</span>
                            }
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}><RoleBadge role={u.role} /></td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontSize: '0.82rem' }}>{u.email}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.phone}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: u.companion_profile?.student_staff_id ? '#34d399' : 'var(--text-muted)', fontWeight: u.companion_profile?.student_staff_id ? '700' : '400', fontSize: '0.82rem' }}>
                            {u.companion_profile?.student_staff_id || '—'}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {parseInt(u.is_verified) === 1
                              ? <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#34d399', background: 'rgba(5,150,105,0.15)', padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>✓ Verified</span>
                              : <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>⏳ Pending</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          MODALS
      ══════════════════════════════════════ */}

      {/* Modal: E-Pass Verification */}
      {showVerifyPassModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowVerifyPassModal(false)}>
          <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontWeight: '800', fontSize: '1.15rem' }}>📷 Verify Ward Digital E-Pass</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Enter or scan the companion pass code to verify</p>
              </div>
              <button onClick={() => setShowVerifyPassModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            <form onSubmit={handleVerifyPassSubmit}>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <input type="text" className="form-input" placeholder="e.g. IPENEMAN-20260730-8472" value={inputPassCode} onChange={e => setInputPassCode(e.target.value.toUpperCase())} style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }} required />
                <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap', minWidth: '100px' }} disabled={verifying}>{verifying ? '...' : 'Verify'}</button>
              </div>
            </form>
            <VerifyPassResult result={verificationResult} />
          </div>
        </div>
      )}

      {/* Modal: Applicants */}
      {showApplicantsModal && selectedRequest && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowApplicantsModal(false)}>
          <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontWeight: '800', fontSize: '1.15rem' }}>👥 Companion Applicants</h3>
                <p style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.2rem' }}>{selectedRequest.request_code} · {selectedRequest.ward_name} · {selectedRequest.patient_gender === 'L' ? 'Male Ward' : 'Female Ward'}</p>
              </div>
              <button onClick={() => setShowApplicantsModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            {loadingApplicants ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>Loading applicants...</div>
            ) : applicants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>No companions have applied yet.</div>
            ) : applicants.map(comp => (
              <div key={comp.id} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: '700', marginBottom: '0.25rem' }}>{comp.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    IC: {comp.ic_number} · {comp.gender === 'L' ? '🔵 Male' : '🩷 Female'} · ⭐ {comp.companion_profile?.rating_avg || '5.00'}
                    {comp.companion_profile?.student_staff_id && <span> · 🎓 {comp.companion_profile.student_staff_id}</span>}
                  </div>
                </div>
                <button onClick={() => handleApproveApplicant(comp.id)} className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}>✓ Assign</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Payment Rate Settings */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowSettingsModal(false)}>
          <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontWeight: '800', fontSize: '1.15rem' }}>⚙️ Payment Rate Settings</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Configure companion hourly allowance rates</p>
              </div>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            <form onSubmit={handleSaveSettings}>
              <div className="form-group">
                <label>Standard Hourly Rate (RM/hour)</label>
                <input type="number" step="0.50" className="form-input" value={rateSettings.default_hourly_rate} onChange={e => setRateSettings({ ...rateSettings, default_hourly_rate: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Min Rate (RM/hr)</label>
                  <input type="number" step="0.50" className="form-input" value={rateSettings.min_hourly_rate} onChange={e => setRateSettings({ ...rateSettings, min_hourly_rate: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Max Rate (RM/hr)</label>
                  <input type="number" step="0.50" className="form-input" value={rateSettings.max_hourly_rate} onChange={e => setRateSettings({ ...rateSettings, max_hourly_rate: e.target.value })} required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>Save Settings</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: On-Behalf Request */}
      {showOnBehalfModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowOnBehalfModal(false)}>
          <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontWeight: '800', fontSize: '1.15rem' }}>🏥 New On-Behalf Request</h3>
                <p style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.2rem' }}>For unaccompanied patients without family in HoSZA</p>
              </div>
              <button onClick={() => setShowOnBehalfModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            <form onSubmit={handleOnBehalfSubmit}>
              <div className="form-group">
                <label>Patient Full Name</label>
                <input type="text" className="form-input" value={formData.patient_name} onChange={e => setFormData({ ...formData, patient_name: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Patient RN</label>
                  <input type="text" className="form-input" value={formData.patient_rn} onChange={e => setFormData({ ...formData, patient_rn: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Patient Gender</label>
                  <select className="form-select" value={formData.patient_gender} onChange={e => setFormData({ ...formData, patient_gender: e.target.value })}>
                    <option value="L">Male (Male Companion)</option>
                    <option value="P">Female (Female Companion)</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Ward Location</label>
                  <input type="text" className="form-input" value={formData.ward_name} onChange={e => setFormData({ ...formData, ward_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Bed Number</label>
                  <input type="text" className="form-input" value={formData.bed_number} onChange={e => setFormData({ ...formData, bed_number: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Shift Date</label>
                  <input type="date" className="form-input" value={formData.shift_date} onChange={e => setFormData({ ...formData, shift_date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Start Time</label>
                  <input type="time" className="form-input" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input type="time" className="form-input" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Ward Staff Instructions</label>
                <textarea rows="3" className="form-textarea" value={formData.task_details} onChange={e => setFormData({ ...formData, task_details: e.target.value })} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                Publish Ward Request
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Completed Requests */}
      {showCompletedModal && (() => {
        const completedRequests = requests.filter(r => r.status === 'completed');
        return (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCompletedModal(false)}>
            <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '820px', padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontWeight: '800', fontSize: '1.1rem' }}>✅ Completed Requests</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{completedRequests.length} records</div>
                </div>
                <button onClick={() => setShowCompletedModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
              </div>
              {completedRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No completed requests yet.</div>
              ) : (
                <div style={{ overflowX: 'auto', maxHeight: '65vh', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr style={{ background: 'rgba(15,23,42,0.95)' }}>
                        {['No.', 'Pass Code', 'Patient (RN)', 'Ward & Bed', 'Shift', 'Creator'].map(h => (
                          <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {completedRequests.map((req, i) => (
                        <tr key={req.id} style={{ borderTop: '1px solid var(--border-color)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: '800', color: 'var(--text-muted)', fontSize: '0.82rem', fontFamily: 'monospace' }}>{i + 1}</td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: '800', color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.8rem' }}>{req.request_code}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: '600' }}>{req.patient_name}</div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{req.patient_rn} · {req.patient_gender === 'L' ? '🔵 Male' : '🩷 Female'}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div>{req.ward_name}</div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{req.bed_number}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                            <div style={{ fontSize: '0.82rem' }}>{req.shift_date}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.start_time} – {req.end_time}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {req.created_by_role === 'admin'
                              ? <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>HoSZA On-Behalf</span>
                              : <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>Patient Family</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}
      {/* Modal: Comprehensive Request Details */}
      {showDetailModal && selectedDetailRequest && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDetailModal(false)}>
          <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: '800', fontSize: '1.15rem', color: '#f59e0b', fontFamily: 'monospace' }}>{selectedDetailRequest.request_code}</span>
                  <SectionBadge status={selectedDetailRequest.status} />
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Patient: <strong style={{ color: '#f1f5f9' }}>{selectedDetailRequest.patient_name}</strong> ({selectedDetailRequest.patient_rn}) · {selectedDetailRequest.patient_gender === 'L' ? '🔵 Male' : '🩷 Female'}
                </p>
              </div>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            {/* Ward & Shift Details */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', fontSize: '0.85rem', lineHeight: '1.6' }}>
              <div style={{ fontWeight: '700', color: '#38bdf8', marginBottom: '0.4rem', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🏥 Ward & Shift Info</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div><strong>Ward:</strong> {selectedDetailRequest.ward_name} ({selectedDetailRequest.bed_number})</div>
                <div><strong>Shift Date:</strong> {selectedDetailRequest.shift_date}</div>
                <div><strong>Scheduled Time:</strong> {selectedDetailRequest.start_time} – {selectedDetailRequest.end_time}</div>
                <div><strong>Allowance:</strong> RM {parseFloat(selectedDetailRequest.allowance_amount || 0).toFixed(2)}</div>
              </div>
              {selectedDetailRequest.task_details && (
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <strong>Task Details / Instructions:</strong>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>{selectedDetailRequest.task_details}</div>
                </div>
              )}
            </div>

            {/* Financial & Shift Earnings Breakdown */}
            <div style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: '700', color: '#34d399', marginBottom: '0.5rem', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>💵 Financial Payout Breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Base Allowance</div>
                  <div style={{ fontWeight: '800', color: '#f1f5f9', marginTop: '0.2rem', fontSize: '0.95rem' }}>
                    RM {parseFloat(selectedDetailRequest.allowance_amount || 0).toFixed(2)}
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Tips / Bonus</div>
                  <div style={{ fontWeight: '800', color: '#fbbf24', marginTop: '0.2rem', fontSize: '0.95rem' }}>
                    RM {parseFloat(selectedDetailRequest.tip_amount || 0).toFixed(2)}
                  </div>
                </div>
                <div style={{ background: 'rgba(52,211,153,0.15)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(52,211,153,0.3)' }}>
                  <div style={{ fontSize: '0.74rem', color: '#34d399', fontWeight: '700' }}>Total Companion Payout</div>
                  <div style={{ fontWeight: '900', color: '#34d399', marginTop: '0.2rem', fontSize: '1.05rem' }}>
                    RM {(parseFloat(selectedDetailRequest.allowance_amount || 0) + parseFloat(selectedDetailRequest.tip_amount || 0)).toFixed(2)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Allowance Type: <strong style={{ color: '#e2e8f0', textTransform: 'capitalize' }}>{selectedDetailRequest.allowance_type || 'paid'}</strong></span>
                <span style={{
                  padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.73rem', fontWeight: '800',
                  background: selectedDetailRequest.status === 'completed' ? 'rgba(5,150,105,0.2)' : 'rgba(245,158,11,0.2)',
                  color: selectedDetailRequest.status === 'completed' ? '#34d399' : '#fbbf24'
                }}>
                  {selectedDetailRequest.status === 'completed' ? '✓ DISBURSED / PAID' : '⏳ PENDING SHIFT COMPLETION'}
                </span>
              </div>
            </div>

            {/* Assigned Companion Details */}
            <div style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: '700', color: '#34d399', marginBottom: '0.4rem', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>👨‍🦱 Companion Assigned</div>
              {selectedDetailRequest.companion ? (
                <div style={{ lineHeight: '1.65' }}>
                  <div><strong style={{ color: '#f1f5f9' }}>{selectedDetailRequest.companion.name}</strong> ({selectedDetailRequest.companion.ic_number})</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    📱 {selectedDetailRequest.companion.phone} · 📧 {selectedDetailRequest.companion.email}
                    {selectedDetailRequest.companion.companion_profile?.student_staff_id && (
                      <span style={{ color: '#34d399', marginLeft: '0.5rem' }}>· 🎓 UniSZA ID: {selectedDetailRequest.companion.companion_profile.student_staff_id}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>No companion assigned yet.</div>
              )}
            </div>

            {/* Check-In & Check-Out Times */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: '700', color: '#fbbf24', marginBottom: '0.5rem', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🕒 Actual Check-In & Check-Out Logs</div>
              {selectedDetailRequest.duty_log ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Actual Check-In</div>
                    <div style={{ fontWeight: '700', color: selectedDetailRequest.duty_log.check_in ? '#34d399' : '#94a3b8', marginTop: '0.2rem' }}>
                      {selectedDetailRequest.duty_log.check_in ? selectedDetailRequest.duty_log.check_in : 'Not checked in yet'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Actual Check-Out</div>
                    <div style={{ fontWeight: '700', color: selectedDetailRequest.duty_log.check_out ? '#38bdf8' : '#94a3b8', marginTop: '0.2rem' }}>
                      {selectedDetailRequest.duty_log.check_out ? selectedDetailRequest.duty_log.check_out : 'In progress / Not checked out'}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Duty shift has not started yet.</div>
              )}
            </div>

            {/* Patient Care Notes */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: '700', color: '#a78bfa', marginBottom: '0.5rem', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📝 Patient Care Notes</div>
              {selectedDetailRequest.duty_log && selectedDetailRequest.duty_log.care_notes_list && selectedDetailRequest.duty_log.care_notes_list.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedDetailRequest.duty_log.care_notes_list.map((n, idx) => (
                    <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', display: 'flex', gap: '0.6rem' }}>
                      <span style={{ color: '#a78bfa', fontWeight: '700', whiteSpace: 'nowrap' }}>[{n.time || '—'}]</span>
                      <span style={{ color: '#e2e8f0' }}>{n.note}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No care notes recorded yet.</div>
              )}
            </div>

            {/* Rating & Review */}
            <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '1rem', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: '700', color: '#f59e0b', marginBottom: '0.4rem', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⭐ Rating & Review</div>
              {selectedDetailRequest.rating ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '1.1rem', color: '#fbbf24' }}>{'⭐'.repeat(parseInt(selectedDetailRequest.rating.rating || 5))}</span>
                    <span style={{ fontWeight: '800', color: '#fbbf24' }}>{selectedDetailRequest.rating.rating} / 5.0</span>
                  </div>
                  {selectedDetailRequest.rating.review && (
                    <p style={{ color: '#e2e8f0', fontSize: '0.83rem', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '0.65rem', borderRadius: '8px', marginTop: '0.4rem' }}>
                      "{selectedDetailRequest.rating.review}"
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  {selectedDetailRequest.status === 'completed' ? 'No rating submitted yet by family.' : 'Rating will be available after shift completion.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
