import React, { useState, useEffect } from 'react';
import { requestAPI, adminAPI } from '../services/api';

export default function PatientDashboard({ user }) {
  const [myRequests, setMyRequests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showApplicantsModal, setShowApplicantsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminHourlyRate, setAdminHourlyRate] = useState(10.00);

  const initialFormState = {
    created_by_user_id: user.id,
    created_by_role: 'user',
    patient_name: '',
    patient_rn: '',
    patient_gender: user.gender || 'L',
    patient_age: 65,
    ward_name: 'Ward 3A (Male)',
    bed_number: 'Bed 08',
    shift_date: new Date().toISOString().split('T')[0],
    start_time: '14:00',
    end_time: '20:00',
    task_details: 'Assist patient with conversation, guide to restroom & assist with meals.',
    allowance_amount: 60.00,
    tip_amount: 0.00
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchMyRequests = async () => {
    setLoading(true);
    try {
      const res = await requestAPI.getMyRequests(user.id);
      setMyRequests(res.data || []);

      const settingsRes = await adminAPI.getSettings();
      if (settingsRes.data.settings?.default_hourly_rate) {
        setAdminHourlyRate(parseFloat(settingsRes.data.settings.default_hourly_rate));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, [user]);

  // Helper to calculate shift duration hours
  const calculateShiftHours = (start, end) => {
    if (!start || !end) return 6;
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    let diff = (eH + eM/60) - (sH + sM/60);
    if (diff < 0) diff += 24;
    return diff > 0 ? diff : 6;
  };

  const currentHours = calculateShiftHours(formData.start_time, formData.end_time);
  const calculatedBaseAllowance = (currentHours * adminHourlyRate).toFixed(2);
  const totalAllowanceAmount = (parseFloat(calculatedBaseAllowance) + parseFloat(formData.tip_amount || 0)).toFixed(2);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    const defaultHours = calculateShiftHours('14:00', '20:00');
    setFormData({
      ...initialFormState,
      created_by_user_id: user.id,
      patient_gender: user.gender || 'L',
      allowance_amount: defaultHours * adminHourlyRate,
      tip_amount: 0.00
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (req) => {
    setEditingId(req.id);
    setFormData({
      created_by_user_id: user.id,
      created_by_role: req.created_by_role || 'user',
      patient_name: req.patient_name || '',
      patient_rn: req.patient_rn || '',
      patient_gender: req.patient_gender || 'L',
      patient_age: req.patient_age || 60,
      ward_name: req.ward_name || 'Ward 3A (Male)',
      bed_number: req.bed_number || '',
      shift_date: req.shift_date || new Date().toISOString().split('T')[0],
      start_time: req.start_time || '14:00',
      end_time: req.end_time || '20:00',
      task_details: req.task_details || '',
      allowance_amount: parseFloat(req.allowance_amount) || (6 * adminHourlyRate),
      tip_amount: parseFloat(req.tip_amount) || 0.00
    });
    setShowModal(true);
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
      fetchMyRequests();
    } catch (err) {
      alert('Failed to approve companion.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      allowance_amount: calculatedBaseAllowance,
      tip_amount: formData.tip_amount || 0.00
    };

    try {
      if (editingId) {
        await requestAPI.update(editingId, payload);
        alert('✓ Companion request updated successfully!');
      } else {
        await requestAPI.create(payload);
        alert('✓ Patient companion request created successfully!');
      }
      setShowModal(false);
      setEditingId(null);
      fetchMyRequests();
    } catch (err) {
      alert(err.response?.data?.messages?.error || err.response?.data?.message || 'Failed to save request.');
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Patient & Family Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Request patient companion services for Hospital Sultan Zainal Abidin (HoSZA) wards
          </p>
        </div>
        <button onClick={handleOpenCreateModal} className="btn btn-primary">
          + Request New Companion
        </button>
      </div>

      {/* List of Requests */}
      <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>
        My Requests
      </h3>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading requests...</div>
      ) : myRequests.length === 0 ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          You have no companion requests yet. Click "+ Request New Companion" above to create one.
        </div>
      ) : (
        <div className="grid grid-2">
          {myRequests.map((req) => {
            const isEditable = req.status === 'open' && (!req.application_count || req.application_count === 0);
            const baseAmt = parseFloat(req.allowance_amount || 0);
            const tipAmt = parseFloat(req.tip_amount || 0);
            const totalAmt = baseAmt + tipAmt;

            return (
              <div key={req.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span className={`badge badge-${req.status}`}>{req.status}</span>
                    <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: '700' }}>{req.request_code}</span>
                  </div>

                  <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.4rem' }}>
                    {req.patient_name} ({req.patient_gender === 'L' ? 'Male' : 'Female'})
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    <strong>Ward:</strong> {req.ward_name} ({req.bed_number})
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    <strong>Date/Time:</strong> {req.shift_date} ({req.start_time} - {req.end_time})
                  </p>
                  
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', background: 'rgba(15, 23, 42, 0.4)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                    <div>🏥 <strong>Admin Standard Allowance:</strong> RM {baseAmt.toFixed(2)}</div>
                    {tipAmt > 0 && (
                      <div style={{ color: '#f59e0b' }}>🎁 <strong>Patient / Family Tip:</strong> + RM {tipAmt.toFixed(2)}</div>
                    )}
                    <div style={{ color: '#34d399', fontWeight: '700', marginTop: '0.2rem' }}>
                      💵 <strong>Total Paid to Companion:</strong> RM {totalAmt.toFixed(2)}
                    </div>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    <strong>Task Details:</strong> {req.task_details}
                  </p>
                </div>

                {/* Edit Button or Review Applicants */}
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {req.status === 'open' && req.application_count > 0 && (
                    <button
                      onClick={() => handleOpenApplicantsModal(req)}
                      className="btn btn-primary"
                      style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', width: '100%', background: 'linear-gradient(135deg, #059669, #0284c7)' }}
                    >
                      👥 Review Applicants ({req.application_count}) & Approve
                    </button>
                  )}

                  {isEditable ? (
                    <button
                      onClick={() => handleOpenEditModal(req)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', width: '100%', background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.2), rgba(59, 130, 246, 0.2))', border: '1px solid #38bdf8', color: '#38bdf8' }}
                    >
                      ✏️ Edit Request (Before Companion Applies)
                    </button>
                  ) : req.status !== 'open' ? (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                      🔒 Assigned / In Duty
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
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

      {/* Create / Edit Request Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>
                {editingId ? 'Edit Companion Request' : 'Companion Request Form'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
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

              <div className="form-group">
                <label>Patient Gender (Required for strict same-gender companion safety rule)</label>
                <select
                  className="form-select"
                  value={formData.patient_gender}
                  onChange={(e) => setFormData({ ...formData, patient_gender: e.target.value })}
                >
                  <option value="L">Male (Only Male Companions can apply)</option>
                  <option value="P">Female (Only Female Companions can apply)</option>
                </select>
              </div>

              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label>HoSZA Ward</label>
                  <select
                    className="form-select"
                    value={formData.ward_name}
                    onChange={(e) => setFormData({ ...formData, ward_name: e.target.value })}
                  >
                    <option value="Ward 3A (Male)">Ward 3A (Male Ward)</option>
                    <option value="Ward 4B (Female)">Ward 4B (Female Ward)</option>
                    <option value="Daycare / HDW Ward">Daycare / HDW Ward</option>
                    <option value="Pediatric Ward">Pediatric Ward</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Ward Bed Number</label>
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

              {/* Allowance & Tip Section */}
              <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.5rem', color: '#38bdf8' }}>
                  💵 Allowance & Optional Tip Breakdown
                </h4>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  🏥 <strong>Hospital Admin Fixed Rate:</strong> RM {adminHourlyRate.toFixed(2)} / hour × {currentHours.toFixed(1)} hrs = <span style={{ color: '#34d399', fontWeight: '700' }}>RM {calculatedBaseAllowance}</span>
                </div>

                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <label style={{ color: '#f59e0b' }}>🎁 Optional Patient / Family Tip (RM)</label>
                  <input
                    type="number"
                    step="5"
                    min="0"
                    className="form-input"
                    placeholder="e.g. 10.00 (Optional)"
                    value={formData.tip_amount}
                    onChange={(e) => setFormData({ ...formData, tip_amount: parseFloat(e.target.value) || 0 })}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Optional token of appreciation added directly to the companion</span>
                </div>

                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#34d399', marginTop: '0.5rem', textAlign: 'right' }}>
                  Total Paid to Companion: RM {totalAllowanceAmount}
                </div>
              </div>

              <div className="form-group">
                <label>Tasks & Special Requirements</label>
                <textarea
                  rows="3"
                  className="form-textarea"
                  value={formData.task_details}
                  onChange={(e) => setFormData({ ...formData, task_details: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                {editingId ? 'Save Changes' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
