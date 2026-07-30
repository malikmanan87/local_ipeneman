import React, { useState, useEffect } from 'react';
import { requestAPI, adminAPI } from '../services/api';

const STATUS_STYLE = {
  open:        { color: '#34d399', bg: 'rgba(5,150,105,0.15)',   label: 'Open' },
  assigned:    { color: '#fbbf24', bg: 'rgba(245,158,11,0.15)',  label: 'Assigned' },
  in_progress: { color: '#a78bfa', bg: 'rgba(139,92,246,0.15)', label: 'In Progress' },
  completed:   { color: '#94a3b8', bg: 'rgba(100,116,139,0.15)',label: 'Completed' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || { color: '#94a3b8', bg: 'rgba(100,116,139,0.15)', label: status };
  return (
    <span style={{ padding: '0.22rem 0.65rem', borderRadius: '9999px', fontSize: '0.73rem', fontWeight: '800', background: s.bg, color: s.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {s.label}
    </span>
  );
}

export default function PatientDashboard({ user }) {
  const [myRequests, setMyRequests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showApplicantsModal, setShowApplicantsModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedReqForRating, setSelectedReqForRating] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewText, setReviewText] = useState('');

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
      const [reqRes, settingsRes] = await Promise.all([
        requestAPI.getMyRequests(user.id),
        adminAPI.getSettings(),
      ]);
      setMyRequests(reqRes.data || []);
      if (settingsRes.data.settings?.default_hourly_rate) {
        setAdminHourlyRate(parseFloat(settingsRes.data.settings.default_hourly_rate));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMyRequests(); }, [user]);

  const calculateShiftHours = (start, end) => {
    if (!start || !end) return 6;
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    let diff = (eH + eM / 60) - (sH + sM / 60);
    if (diff < 0) diff += 24;
    return diff > 0 ? diff : 6;
  };

  const currentHours = calculateShiftHours(formData.start_time, formData.end_time);
  const calculatedBaseAllowance = (currentHours * adminHourlyRate).toFixed(2);
  const totalAllowanceAmount = (parseFloat(calculatedBaseAllowance) + parseFloat(formData.tip_amount || 0)).toFixed(2);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
      ...initialFormState,
      created_by_user_id: user.id,
      patient_gender: user.gender || 'L',
      allowance_amount: calculateShiftHours('14:00', '20:00') * adminHourlyRate,
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
    } catch (err) { console.error(err); }
    finally { setLoadingApplicants(false); }
  };

  const handleApproveApplicant = async (companionId) => {
    if (!selectedRequest) return;
    try {
      await requestAPI.acceptCompanion({ request_id: selectedRequest.id, companion_id: companionId });
      alert('✓ Companion assigned successfully!');
      setShowApplicantsModal(false);
      fetchMyRequests();
    } catch { alert('Failed to assign companion.'); }
  };

  const handleOpenRatingModal = (req) => {
    setSelectedReqForRating(req);
    setRatingValue(5);
    setReviewText('');
    setShowRatingModal(true);
  };

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReqForRating) return;
    try {
      await requestAPI.rateCompanion({
        request_id: selectedReqForRating.id,
        rated_by_user_id: user.id,
        rating: ratingValue,
        review: reviewText
      });
      alert('✓ Thank you for your feedback!');
      setShowRatingModal(false);
      fetchMyRequests();
    } catch (err) {
      alert(err.response?.data?.messages?.error || err.response?.data?.message || 'Failed to submit rating.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, allowance_amount: calculatedBaseAllowance, tip_amount: formData.tip_amount || 0.00 };
    try {
      if (editingId) {
        await requestAPI.update(editingId, payload);
        alert('✓ Request updated successfully!');
      } else {
        await requestAPI.create(payload);
        alert('✓ Companion request created!');
      }
      setShowModal(false);
      setEditingId(null);
      fetchMyRequests();
    } catch (err) {
      alert(err.response?.data?.messages?.error || err.response?.data?.message || 'Failed to save request.');
    }
  };

  const activeCount = myRequests.filter(r => r.status === 'open' || r.status === 'assigned' || r.status === 'in_progress').length;
  const completedCount = myRequests.filter(r => r.status === 'completed').length;
  const pendingApplicantsCount = myRequests.filter(r => r.status === 'open' && r.application_count > 0).reduce((acc, r) => acc + parseInt(r.application_count), 0);

  return (
    <div style={{ background: 'var(--bg-dark)', minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: '1100px', padding: '2rem 1.5rem' }}>

        {/* ── Page Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#38bdf8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              🏥 Hospital Sultan Zainal Abidin (HoSZA)
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: '800', marginBottom: '0.25rem' }}>Patient & Family Portal</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Welcome, <strong style={{ color: '#f1f5f9' }}>{user.name}</strong> · Request companion services for your patient
            </p>
          </div>
          <button onClick={handleOpenCreateModal} className="btn btn-primary" style={{ fontSize: '0.875rem', padding: '0.65rem 1.4rem' }}>
            + Request New Companion
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.1rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Active Requests', value: activeCount, icon: '📋', color: '#38bdf8' },
            { label: 'Completed Shifts', value: completedCount, icon: '✅', color: '#34d399' },
            { label: 'Pending Applicants', value: pendingApplicantsCount, icon: '👥', color: '#f59e0b', alert: pendingApplicantsCount > 0 },
            { label: 'Total Requests', value: myRequests.length, icon: '📊', color: '#a78bfa' },
          ].map(s => (
            <div key={s.label} className="glass-panel" style={{ padding: '1.25rem', position: 'relative', border: s.alert ? `1.5px solid ${s.color}` : '1px solid var(--glass-border)' }}>
              {s.alert && <span style={{ position: 'absolute', top: '0.85rem', right: '0.85rem', width: '8px', height: '8px', borderRadius: '50%', background: s.color, boxShadow: `0 0 8px ${s.color}` }} />}
              <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{s.icon}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#e2e8f0', marginTop: '0.3rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Requests List ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: '800' }}>📋 My Companion Requests</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{myRequests.length} total</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
        ) : myRequests.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
            No companion requests yet. Click <strong style={{ color: '#f1f5f9' }}>+ Request New Companion</strong> above to get started.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {myRequests.map(req => {
              const isEditable = req.status === 'open' && (!req.application_count || req.application_count === 0);
              const baseAmt = parseFloat(req.allowance_amount || 0);
              const tipAmt = parseFloat(req.tip_amount || 0);
              const totalAmt = baseAmt + tipAmt;

              return (
                <div key={req.id} className="glass-panel" style={{ padding: '1.5rem', borderLeft: `3px solid ${STATUS_STYLE[req.status]?.color || '#94a3b8'}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  {/* Header */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <StatusBadge status={req.status} />
                      <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#f59e0b', fontWeight: '800' }}>{req.request_code}</span>
                    </div>

                    <h3 style={{ fontWeight: '800', fontSize: '1.05rem', marginBottom: '0.5rem' }}>
                      {req.patient_name}
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.78rem', fontWeight: '700', color: req.patient_gender === 'L' ? '#60a5fa' : '#f472b6' }}>
                        {req.patient_gender === 'L' ? '🔵 Male' : '🩷 Female'}
                      </span>
                    </h3>

                    <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '0.75rem' }}>
                      <p>🏥 {req.ward_name} · Bed: <strong style={{ color: '#f1f5f9' }}>{req.bed_number}</strong></p>
                      <p>🗓️ {req.shift_date} · {req.start_time} – {req.end_time}</p>
                      <p>📌 {req.task_details}</p>
                    </div>

                    {/* Allowance Breakdown */}
                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '0.75rem', marginBottom: '0.75rem', fontSize: '0.82rem', lineHeight: '1.65' }}>
                      <div>🏥 Admin Allowance: <strong>RM {baseAmt.toFixed(2)}</strong></div>
                      {tipAmt > 0 && <div style={{ color: '#f59e0b' }}>🎁 Tip: + RM {tipAmt.toFixed(2)}</div>}
                      <div style={{ color: '#34d399', fontWeight: '800', marginTop: '0.2rem' }}>💵 Total: RM {totalAmt.toFixed(2)}</div>
                    </div>

                    {req.user_rating && (
                      <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', color: '#fbbf24', marginBottom: '0.5rem' }}>
                        ⭐ Your Rating: {req.user_rating.rating}/5{req.user_rating.review ? ` — "${req.user_rating.review}"` : ''}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {req.status === 'open' && req.application_count > 0 && (
                      <button onClick={() => handleOpenApplicantsModal(req)} className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '0.5rem' }}>
                        👥 Review Applicants ({req.application_count}) & Approve
                      </button>
                    )}
                    {req.status === 'completed' && !req.user_rating && (
                      <button onClick={() => handleOpenRatingModal(req)} style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)', color: '#fbbf24', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer' }}>
                        ⭐ Rate Companion Service
                      </button>
                    )}
                    {isEditable ? (
                      <button onClick={() => handleOpenEditModal(req)} style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid rgba(56,189,248,0.4)', background: 'rgba(56,189,248,0.08)', color: '#38bdf8', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer' }}>
                        ✏️ Edit Request
                      </button>
                    ) : (req.status === 'assigned' || req.status === 'in_progress') ? (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>🔒 Assigned & In Progress</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ MODALS ══ */}

      {/* Rating Modal */}
      {showRatingModal && selectedReqForRating && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowRatingModal(false)}>
          <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontWeight: '800', fontSize: '1.15rem' }}>⭐ Rate Companion Service</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{selectedReqForRating.request_code}</p>
              </div>
              <button onClick={() => setShowRatingModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            <form onSubmit={handleRatingSubmit}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: '600' }}>Select Rating Score</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', fontSize: '2.2rem', cursor: 'pointer' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <span key={star} onClick={() => setRatingValue(star)} style={{ color: star <= ratingValue ? '#f59e0b' : '#334155', transition: 'color 0.15s ease' }}>★</span>
                  ))}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#f59e0b', fontWeight: '700', marginTop: '0.4rem' }}>{ratingValue} / 5 Stars</div>
              </div>
              <div className="form-group">
                <label>Review / Feedback (Optional)</label>
                <textarea rows="3" className="form-textarea" placeholder="e.g. Companion was polite, punctual, and helpful..." value={reviewText} onChange={e => setReviewText(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', marginTop: '0.5rem' }}>
                Submit Rating
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Applicants Modal */}
      {showApplicantsModal && selectedRequest && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowApplicantsModal(false)}>
          <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontWeight: '800', fontSize: '1.15rem' }}>👥 Companion Applicants</h3>
                <p style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.2rem' }}>
                  {selectedRequest.request_code} · {selectedRequest.ward_name} · {selectedRequest.patient_gender === 'L' ? 'Male Ward' : 'Female Ward'}
                </p>
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
                  {comp.companion_profile?.health_status && (
                    <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.2rem' }}>✓ Health: {comp.companion_profile.health_status}</div>
                  )}
                </div>
                <button onClick={() => handleApproveApplicant(comp.id)} className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}>
                  ✓ Approve & Assign
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create / Edit Request Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontWeight: '800', fontSize: '1.15rem' }}>{editingId ? '✏️ Edit Companion Request' : '+ New Companion Request'}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>HoSZA Ward Companion Service Form</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Patient Full Name</label>
                <input type="text" className="form-input" value={formData.patient_name} onChange={e => setFormData({ ...formData, patient_name: e.target.value })} required />
              </div>

              <div className="form-group">
                <label>Patient Gender <span style={{ color: '#f59e0b', fontWeight: '400' }}>(Strict same-gender companion safety rule applies)</span></label>
                <select className="form-select" value={formData.patient_gender} onChange={e => setFormData({ ...formData, patient_gender: e.target.value })}>
                  <option value="L">Male (Only Male Companions can apply)</option>
                  <option value="P">Female (Only Female Companions can apply)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Patient RN</label>
                  <input type="text" className="form-input" value={formData.patient_rn} onChange={e => setFormData({ ...formData, patient_rn: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Patient Age</label>
                  <input type="number" className="form-input" value={formData.patient_age} onChange={e => setFormData({ ...formData, patient_age: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>HoSZA Ward</label>
                  <select className="form-select" value={formData.ward_name} onChange={e => setFormData({ ...formData, ward_name: e.target.value })}>
                    <option value="Ward 3A (Male)">Ward 3A (Male Ward)</option>
                    <option value="Ward 4B (Female)">Ward 4B (Female Ward)</option>
                    <option value="Daycare / HDW Ward">Daycare / HDW Ward</option>
                    <option value="Pediatric Ward">Pediatric Ward</option>
                  </select>
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

              {/* Allowance Breakdown */}
              <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#38bdf8', marginBottom: '0.65rem' }}>💵 Allowance & Tip Breakdown</div>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                  🏥 Admin Rate: RM {adminHourlyRate.toFixed(2)}/hr × {currentHours.toFixed(1)} hrs =
                  <strong style={{ color: '#34d399', marginLeft: '0.35rem' }}>RM {calculatedBaseAllowance}</strong>
                </div>
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <label style={{ color: '#f59e0b' }}>🎁 Optional Patient / Family Tip (RM)</label>
                  <input type="number" step="5" min="0" className="form-input" placeholder="e.g. 10.00 (Optional)" value={formData.tip_amount} onChange={e => setFormData({ ...formData, tip_amount: parseFloat(e.target.value) || 0 })} />
                </div>
                <div style={{ fontWeight: '800', color: '#34d399', textAlign: 'right', fontSize: '0.9rem' }}>
                  Total: RM {totalAllowanceAmount}
                </div>
              </div>

              <div className="form-group">
                <label>Tasks & Special Requirements</label>
                <textarea rows="3" className="form-textarea" value={formData.task_details} onChange={e => setFormData({ ...formData, task_details: e.target.value })} required />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                {editingId ? 'Save Changes' : 'Submit Companion Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
