import React, { useState, useEffect } from 'react';
import { requestAPI, companionAPI } from '../services/api';
import EPassModal from '../components/EPassModal';

const STATUS_STYLE = {
  assigned:    { color: '#fbbf24', bg: 'rgba(245,158,11,0.15)',  label: 'Assigned' },
  in_progress: { color: '#a78bfa', bg: 'rgba(139,92,246,0.15)', label: 'In Progress' },
  completed:   { color: '#94a3b8', bg: 'rgba(100,116,139,0.15)',label: 'Completed' },
  open:        { color: '#34d399', bg: 'rgba(5,150,105,0.15)',   label: 'Open' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || { color: '#94a3b8', bg: 'rgba(100,116,139,0.15)', label: status };
  return (
    <span style={{ padding: '0.22rem 0.65rem', borderRadius: '9999px', fontSize: '0.73rem', fontWeight: '800', background: s.bg, color: s.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {s.label}
    </span>
  );
}

export default function CompanionDashboard({ user }) {
  const [availableJobs, setAvailableJobs] = useState([]);
  const [myDuties, setMyDuties] = useState([]);
  const [ratingsData, setRatingsData] = useState({ rating_avg: 5.0, total_reviews: 0, data: [] });
  const [loading, setLoading] = useState(true);
  const [activeDutyForPass, setActiveDutyForPass] = useState(null);
  const [careNoteText, setCareNoteText] = useState({});
  const [activeTab, setActiveTab] = useState('duties');
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedClaimDuty, setSelectedClaimDuty] = useState(null);

  const fetchCompanionData = async () => {
    setLoading(true);
    try {
      const [jobsRes, dutiesRes, ratingsRes] = await Promise.all([
        requestAPI.getAvailable(user.gender, user.id),
        companionAPI.getMyDuties(user.id),
        companionAPI.getRatings(user.id),
      ]);
      setAvailableJobs(jobsRes.data.data || []);
      setMyDuties(dutiesRes.data || []);
      if (ratingsRes.data) setRatingsData(ratingsRes.data);
    } catch (err) {
      console.error('Error fetching companion data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanionData(); }, [user]);

  const handleApply = async (requestId) => {
    try {
      const res = await companionAPI.applyJob({ request_id: requestId, companion_id: user.id });
      alert(res.data.message || 'Application submitted!');
      fetchCompanionData();
    } catch (err) {
      alert(err.response?.data?.messages?.error || err.response?.data?.message || 'Failed to apply.');
    }
  };

  const handleCheckIn = async (requestId) => {
    try {
      await companionAPI.checkIn({ request_id: requestId, companion_id: user.id });
      alert('✓ Checked in at HoSZA Ward!');
      fetchCompanionData();
    } catch (err) { alert('Check-in failed.'); }
  };

  const handleCheckOut = async (requestId) => {
    if (!window.confirm('Complete and end this duty shift?')) return;
    try {
      await companionAPI.checkOut({ request_id: requestId, companion_id: user.id });
      alert('✓ Shift completed successfully.');
      fetchCompanionData();
    } catch (err) { alert('Check-out failed.'); }
  };

  const handleAddNote = async (requestId) => {
    const note = careNoteText[requestId];
    if (!note) return;
    try {
      await companionAPI.addCareNote({ request_id: requestId, note });
      setCareNoteText({ ...careNoteText, [requestId]: '' });
      alert('Care note added!');
      fetchCompanionData();
    } catch (err) { alert('Failed to add care note.'); }
  };

  const activeDuties = myDuties.filter(d => d.status === 'assigned' || d.status === 'in_progress');
  const completedDuties = myDuties.filter(d => d.status === 'completed');
  const totalEarnings = completedDuties.reduce((acc, d) => acc + parseFloat(d.allowance_amount || 0) + parseFloat(d.tip_amount || 0), 0);

  return (
    <div style={{ background: 'var(--bg-dark)', minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: '1100px', padding: '2rem 1.5rem' }}>

        {/* ── Page Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#34d399', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              🏥 Hospital Sultan Zainal Abidin (HoSZA)
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: '800', marginBottom: '0.25rem' }}>Companion Portal</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Logged in as <strong style={{ color: '#f1f5f9' }}>{user.name}</strong> ·{' '}
              <span style={{ color: user.gender === 'L' ? '#60a5fa' : '#f472b6', fontWeight: '700' }}>
                {user.gender === 'L' ? '♂ Male Companion' : '♀ Female Companion'}
              </span>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.35)', padding: '0.55rem 1.1rem', borderRadius: '10px', fontSize: '0.9rem', color: '#34d399', fontWeight: '800', textAlign: 'center' }}>
              💰 RM {totalEarnings.toFixed(2)}
              <div style={{ fontSize: '0.72rem', fontWeight: '500', color: '#94a3b8', marginTop: '0.05rem' }}>Earned from Shifts</div>
            </div>
            <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', padding: '0.55rem 1.1rem', borderRadius: '10px', fontSize: '0.9rem', color: '#f59e0b', fontWeight: '700', textAlign: 'center' }}>
              ⭐ {parseFloat(ratingsData.rating_avg || 5.0).toFixed(2)} / 5.0
              <div style={{ fontSize: '0.72rem', fontWeight: '400', color: '#94a3b8', marginTop: '0.05rem' }}>{ratingsData.total_reviews} reviews</div>
            </div>
            <div style={{ background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.35)', padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.82rem', color: '#34d399', fontWeight: '700', textAlign: 'center' }}>
              🛡️ Gender-Safe Filter
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.05rem' }}>
                {user.gender === 'L' ? 'Male Wards Only' : 'Female Wards Only'}
              </div>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.1rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Active Duties', value: activeDuties.length, icon: '🔄', color: '#a78bfa', tab: 'duties' },
            { label: 'Completed Shifts', value: completedDuties.length, icon: '✅', color: '#34d399', tab: 'duties' },
            { label: 'Open Opportunities', value: availableJobs.length, icon: '🔍', color: '#38bdf8', tab: 'jobs' },
            { label: 'Rating Score', value: `${parseFloat(ratingsData.rating_avg || 5.0).toFixed(1)}★`, icon: '⭐', color: '#f59e0b', tab: 'ratings' },
          ].map(s => (
            <div
              key={s.tab + s.label}
              onClick={() => setActiveTab(s.tab)}
              className="glass-panel"
              style={{ padding: '1.25rem', cursor: 'pointer', border: activeTab === s.tab ? `1.5px solid ${s.color}` : '1px solid var(--glass-border)', transition: 'all 0.2s ease' }}
            >
              <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{s.icon}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#e2e8f0', marginTop: '0.3rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Tab: My Duties ── */}
        {activeTab === 'duties' && (
          <div className="animate-fade-in">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
            ) : myDuties.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                No duties assigned yet. Browse and apply for ward opportunities below.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
                {myDuties.map(duty => (
                  <div key={duty.id} className="glass-panel" style={{ padding: '1.5rem', borderLeft: `3px solid ${STATUS_STYLE[duty.status]?.color || '#94a3b8'}` }}>
                    {/* Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <StatusBadge status={duty.status} />
                      <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#f59e0b', fontWeight: '800' }}>{duty.request_code}</span>
                    </div>

                    {/* Info */}
                    <h3 style={{ fontWeight: '800', fontSize: '1.05rem', marginBottom: '0.5rem' }}>
                      {duty.ward_name}
                    </h3>
                    <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: '1.7' }}>
                      <p>🛏️ Bed: <strong style={{ color: '#f1f5f9' }}>{duty.bed_number}</strong></p>
                      <p>👴 Patient: <strong style={{ color: '#f1f5f9' }}>{duty.patient_name}</strong> (Age {duty.patient_age})</p>
                      <p>🗓️ {duty.shift_date} · {duty.start_time} – {duty.end_time}</p>
                      <p style={{ marginTop: '0.25rem' }}>📌 {duty.task_details}</p>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                      <button
                        onClick={() => setActiveDutyForPass(duty)}
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.4)', background: 'rgba(56,189,248,0.08)', color: '#38bdf8', cursor: 'pointer', fontWeight: '700' }}
                      >
                        📱 Show E-Pass
                      </button>
                      {duty.status === 'assigned' && (
                        <button onClick={() => handleCheckIn(duty.id)} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                          ▶ Check In
                        </button>
                      )}
                      {duty.status === 'in_progress' && (
                        <button onClick={() => handleCheckOut(duty.id)} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer', fontWeight: '700' }}>
                          ⏹ End Shift
                        </button>
                      )}
                      {duty.status === 'completed' && (
                        <button
                          onClick={() => { setSelectedClaimDuty(duty); setShowClaimModal(true); }}
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(52,211,153,0.4)', background: 'rgba(52,211,153,0.12)', color: '#34d399', cursor: 'pointer', fontWeight: '700' }}
                        >
                          🧾 Resit E-Claim (RM {(parseFloat(duty.allowance_amount || 0) + parseFloat(duty.tip_amount || 0)).toFixed(2)})
                        </button>
                      )}
                    </div>

                    {/* Care Note */}
                    {duty.status === 'in_progress' && (
                      <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)' }}>
                        <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '0.35rem' }}>
                          + Add Patient Care Note
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Patient finished lunch"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                            value={careNoteText[duty.id] || ''}
                            onChange={e => setCareNoteText({ ...careNoteText, [duty.id]: e.target.value })}
                          />
                          <button onClick={() => handleAddNote(duty.id)} className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', whiteSpace: 'nowrap' }}>
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Open Opportunities ── */}
        {activeTab === 'jobs' && (
          <div className="animate-fade-in">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading opportunities...</div>
            ) : availableJobs.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                No open opportunities for {user.gender === 'L' ? 'Male' : 'Female'} patients at HoSZA right now. Please check back soon.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {availableJobs.map(job => {
                  const total = (parseFloat(job.allowance_amount || 0) + parseFloat(job.tip_amount || 0)).toFixed(2);
                  const hasTip = parseFloat(job.tip_amount) > 0;
                  return (
                    <div key={job.id} className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--glass-border)', transition: 'border-color 0.2s ease' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <span style={{ padding: '0.22rem 0.65rem', borderRadius: '9999px', fontSize: '0.73rem', fontWeight: '800', background: job.patient_gender === 'L' ? 'rgba(59,130,246,0.15)' : 'rgba(236,72,153,0.15)', color: job.patient_gender === 'L' ? '#60a5fa' : '#f472b6' }}>
                          {job.patient_gender === 'L' ? '🔵 Male Patient' : '🩷 Female Patient'}
                        </span>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#34d399' }}>RM {total}</div>
                          {hasTip && <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: '700' }}>🎁 incl. RM {parseFloat(job.tip_amount).toFixed(2)} tip</div>}
                        </div>
                      </div>

                      <h3 style={{ fontWeight: '800', fontSize: '1rem', marginBottom: '0.6rem' }}>{job.ward_name} (HoSZA)</h3>
                      <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '1rem' }}>
                        <p>🗓️ {job.shift_date} · {job.start_time} – {job.end_time}</p>
                        <p>👴 Patient Age: ~{job.patient_age} yrs</p>
                        <p>📌 {job.task_details}</p>
                      </div>

                      {job.has_applied ? (
                        <button disabled style={{ width: '100%', padding: '0.55rem', borderRadius: '10px', background: 'rgba(51,65,85,0.6)', border: '1px solid #475569', color: '#94a3b8', fontWeight: '700', fontSize: '0.85rem', cursor: 'not-allowed' }}>
                          ✓ Applied — Pending Approval
                        </button>
                      ) : (
                        <button onClick={() => handleApply(job.id)} className="btn btn-primary" style={{ width: '100%', fontSize: '0.875rem' }}>
                          Apply as Companion
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Ratings & Reviews ── */}
        {activeTab === 'ratings' && (
          <div className="animate-fade-in">
            {ratingsData.data.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                No feedback yet. Complete duties to receive ratings from patient families.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {ratingsData.data.map(rev => (
                  <div key={rev.id} className="glass-panel" style={{ padding: '1.4rem', borderLeft: '3px solid #f59e0b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <div style={{ color: '#fbbf24', fontSize: '1.1rem', letterSpacing: '0.05em' }}>
                        {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                      </div>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rev.request_code}</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', fontStyle: 'italic', color: '#e2e8f0', marginBottom: '0.75rem', lineHeight: '1.55' }}>
                      "{rev.review || 'Great companion service provided.'}"
                    </p>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      By: <strong style={{ color: '#f1f5f9' }}>{rev.rater_name}</strong> · {rev.ward_name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* E-Pass Modal */}
      {activeDutyForPass && (
        <EPassModal
          duty={activeDutyForPass}
          companion={user}
          onClose={() => setActiveDutyForPass(null)}
        />
      )}

      {/* Modal: Resit E-Claim Peneman */}
      {showClaimModal && selectedClaimDuty && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowClaimModal(false)}>
          <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '520px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🏥 HoSZA E-Claim Slip</div>
                <h3 style={{ fontWeight: '800', fontSize: '1.15rem', marginTop: '0.2rem' }}>Penyata Tuntutan Elaun Shift</h3>
              </div>
              <button onClick={() => setShowClaimModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1.1rem', marginBottom: '1.25rem', fontSize: '0.85rem', lineHeight: '1.65' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>No. Rujukan Shift:</span>
                <strong style={{ color: '#f59e0b', fontFamily: 'monospace' }}>{selectedClaimDuty.request_code}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Peneman:</span>
                <strong style={{ color: '#f1f5f9' }}>{user.name} ({user.ic_number})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Wad & Katil:</span>
                <span>{selectedClaimDuty.ward_name} ({selectedClaimDuty.bed_number})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tarikh Shift:</span>
                <span>{selectedClaimDuty.shift_date} ({selectedClaimDuty.start_time} – {selectedClaimDuty.end_time})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status Duty:</span>
                <span style={{ color: '#34d399', fontWeight: '800' }}>✓ SELESAI & DISAHKAN</span>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '12px', padding: '1.1rem', marginBottom: '1.25rem', fontSize: '0.86rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span>Elaun Shift Asas:</span>
                <span>RM {parseFloat(selectedClaimDuty.allowance_amount || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem', color: '#fbbf24' }}>
                <span>Tips / Bonus Waris:</span>
                <span>+ RM {parseFloat(selectedClaimDuty.tip_amount || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontWeight: '900', fontSize: '1.05rem', color: '#34d399' }}>
                <span>JUMLAH NET PAYOUT:</span>
                <span>RM {(parseFloat(selectedClaimDuty.allowance_amount || 0) + parseFloat(selectedClaimDuty.tip_amount || 0)).toFixed(2)}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
              ℹ️ Bayaran elaun dikreditkan terus mengikut tetapan akaun kewangan peneman yang didaftarkan.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
