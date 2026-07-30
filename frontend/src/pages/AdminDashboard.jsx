import React, { useState, useEffect } from 'react';
import { adminAPI, requestAPI } from '../services/api';

export default function AdminDashboard({ user }) {
  const [stats, setStats] = useState({ total_companions: 0, total_requests: 0, active_duties: 0, on_behalf_count: 0 });
  const [requests, setRequests] = useState([]);
  const [showOnBehalfModal, setShowOnBehalfModal] = useState(false);
  const [loading, setLoading] = useState(true);

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      {/* Admin Header */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.2), rgba(15, 23, 42, 0.4))' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Hospital Sultan Zainal Abidin (HoSZA) Admin Portal</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Ward Patient Companion Oversight & Unaccompanied Patient On-Behalf Request Module
          </p>
        </div>
        <button onClick={() => setShowOnBehalfModal(true)} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
          🏥 + Request On-Behalf (No Family)
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-4" style={{ marginBottom: '2.5rem' }}>
        <div className="glass-panel stat-card">
          <div className="stat-icon">👥</div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{stats.total_companions}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Registered Companions</div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon">📋</div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{stats.total_requests}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Requests</div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>🔄</div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{stats.active_duties}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Duty Shifts</div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>🏥</div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{stats.on_behalf_count}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Unaccompanied Cases</div>
          </div>
        </div>
      </div>

      {/* Overview Table */}
      <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>
        HoSZA Wards Complete Request Overview
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
                </tr>
              ))}
            </tbody>
          </table>
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
