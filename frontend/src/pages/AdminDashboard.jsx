import React, { useState, useEffect } from 'react';
import { adminAPI, requestAPI } from '../services/api';

export default function AdminDashboard({ user }) {
  const [stats, setStats] = useState({ total_companions: 0, total_requests: 0, active_duties: 0, on_behalf_count: 0 });
  const [requests, setRequests] = useState([]);
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      const res = await adminAPI.verifyPass(inputPassCode.trim());
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

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      {/* Admin Header */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.2), rgba(15, 23, 42, 0.4))' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Hospital Sultan Zainal Abidin (HoSZA) Admin & Ward Staff Portal</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Nurse Entry Pass Verification & Unaccompanied Patient On-Behalf Module
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => handleOpenVerifyPassModal('')} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #059669, #0284c7)' }}>
            📷 Scan / Verify Ward E-Pass
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

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', background: 'gradient(135deg, #f59e0b, #d97706)' }}>
                Publish Ward Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
