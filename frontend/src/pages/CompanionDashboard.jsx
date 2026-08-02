import React, { useState, useEffect } from 'react';
import { requestAPI, companionAPI } from '../services/api';
import EPassModal from '../components/EPassModal';
import CareNotesList from '../components/CareNotesList';
import { showSuccess, showError, showConfirm } from '../utils/swal';
import { formatTimeAMPM, formatShiftRange } from '../utils/formatTime';

const STATUS_STYLE = {
  assigned:    { color: '#fbbf24', bg: 'rgba(245,158,11,0.15)',  label: '⚡ Assigned (FCFS)' },
  in_progress: { color: '#a78bfa', bg: 'rgba(139,92,246,0.15)', label: 'In Progress' },
  completed:   { color: '#94a3b8', bg: 'rgba(100,116,139,0.15)',label: 'Completed' },
  open:        { color: '#34d399', bg: 'rgba(5,150,105,0.15)',   label: 'Open' },
  cancelled:   { color: '#f87171', bg: 'rgba(239,68,68,0.15)',  label: '🚫 Cancelled by Admin' },
  expired:     { color: '#64748b', bg: 'rgba(100,116,139,0.15)', label: '⌛ Shift Expired' },
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
  const [dutyFilter, setDutyFilter] = useState('active'); // 'all' | 'active' | 'completed'
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedClaimDuty, setSelectedClaimDuty] = useState(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [selectedJobForConsent, setSelectedJobForConsent] = useState(null);
  const [healthAgreed, setHealthAgreed] = useState(false);
  // FCFS: Track 60-second withdraw countdown per job (keyed by request_id)
  const [withdrawCountdowns, setWithdrawCountdowns] = useState({});

  const fetchCompanionData = async () => {
    setLoading(true);
    try {
      // Auto-expire stale requests before loading
      try { await requestAPI.autoExpire(); } catch (_) {}

      const [jobsRes, dutiesRes, ratingsRes] = await Promise.all([
        requestAPI.getAvailable(user.gender, user.id),
        companionAPI.getMyDuties(user.id),
        companionAPI.getRatings(user.id),
      ]);

      const jobsList   = jobsRes.data.data || [];
      const dutiesList = dutiesRes.data || [];

      // Build initial withdraw countdowns for jobs the companion just applied for
      const newCountdowns = {};
      jobsList.forEach(job => {
        if (job.has_applied && job.applied_at) {
          const appliedTs = new Date(job.applied_at.replace(' ', 'T')).getTime();
          const secsElapsed = Math.floor((Date.now() - appliedTs) / 1000);
          const secsLeft = 60 - secsElapsed;
          if (secsLeft > 0) {
            newCountdowns[job.id] = secsLeft;
          }
        }
      });
      setWithdrawCountdowns(newCountdowns);

      setAvailableJobs(jobsList);
      setMyDuties(dutiesList);
      if (ratingsRes.data) setRatingsData(ratingsRes.data);

      // Smart Priority Auto-Selection:
      // 1st Priority: Active Duties (assigned / in_progress)
      // 2nd Priority: Open Opportunities (available ward jobs matching gender)
      // 3rd Priority: Completed Shifts
      const activeCount    = dutiesList.filter(d => d.status === 'assigned' || d.status === 'in_progress').length;
      const completedCount = dutiesList.filter(d => d.status === 'completed').length;

      if (activeCount > 0) {
        setActiveTab('duties');
        setDutyFilter('active');
      } else if (jobsList.length > 0) {
        setActiveTab('jobs');
      } else if (completedCount > 0) {
        setActiveTab('duties');
        setDutyFilter('completed');
      } else {
        setActiveTab('duties');
        setDutyFilter('all');
      }
    } catch (err) {
      console.error('Error fetching companion data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanionData(); }, [user]);

  // FCFS: Countdown timer tick every second
  useEffect(() => {
    const interval = setInterval(() => {
      setWithdrawCountdowns(prev => {
        const updated = {};
        Object.entries(prev).forEach(([jobId, secs]) => {
          if (secs > 1) updated[jobId] = secs - 1;
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleApply = async (requestId) => {
    try {
      const res = await companionAPI.applyJob({ request_id: requestId, companion_id: user.id });
      // Start 60-second withdraw countdown
      setWithdrawCountdowns(prev => ({ ...prev, [requestId]: 60 }));
      await showSuccess('⚡ Auto-Assigned!', res.data.message || 'You have been auto-assigned to this duty shift! You have 60 seconds to withdraw.');
      fetchCompanionData();
    } catch (err) {
      showError('Application Failed', err.response?.data?.messages?.error || err.response?.data?.message || 'Failed to apply.');
    }
  };

  const handleWithdraw = async (requestId) => {
    const confirmed = await showConfirm(
      'Withdraw Application?',
      'Are you sure? This will release the shift back to open for other companions.',
      'Yes, Withdraw',
      'warning'
    );
    if (!confirmed) return;
    try {
      await companionAPI.withdrawApplication({ request_id: requestId, companion_id: user.id });
      setWithdrawCountdowns(prev => { const n = {...prev}; delete n[requestId]; return n; });
      await showSuccess('Withdrawn', 'Application withdrawn. Shift is now open again.');
      fetchCompanionData();
    } catch (err) {
      showError('Withdraw Failed', err.response?.data?.messages?.error || err.response?.data?.message || 'Withdraw window may have expired (60s limit).');
    }
  };

  const handleCheckIn = async (requestId) => {
    const confirmed = await showConfirm(
      'Check In at Ward?',
      'Are you present at HoSZA Ward and ready to start your duty shift?',
      'Yes, Check In Now',
      'question'
    );
    if (!confirmed) return;
    try {
      await companionAPI.checkIn({ request_id: requestId, companion_id: user.id });
      await showSuccess('Checked In!', 'Checked in successfully at HoSZA Ward. Shift session started.');
      fetchCompanionData();
    } catch (err) {
      showError('Check-in Failed', err.response?.data?.messages?.error || err.response?.data?.message || 'Could not complete check-in.');
    }
  };

  const handleCheckOut = async (requestId) => {
    const confirmed = await showConfirm('Complete Shift?', 'Are you sure you want to complete and end this duty shift?', 'Yes, End Shift', 'warning');
    if (!confirmed) return;
    try {
      await companionAPI.checkOut({ request_id: requestId, companion_id: user.id });
      await showSuccess('Shift Completed', 'Shift completed successfully.');
      fetchCompanionData();
    } catch (err) { showError('Check-out Failed', 'Could not end shift.'); }
  };

  const handleAddNote = async (requestId) => {
    const note = careNoteText[requestId];
    if (!note) return;
    try {
      await companionAPI.addCareNote({ request_id: requestId, note });
      setCareNoteText({ ...careNoteText, [requestId]: '' });
      await showSuccess('Care Note Saved', 'Care note has been added.');
      fetchCompanionData();
    } catch (err) { showError('Note Failed', 'Failed to add care note.'); }
  };

  const activeDuties = myDuties.filter(d => d.status === 'assigned' || d.status === 'in_progress');
  const completedDuties = myDuties.filter(d => d.status === 'completed');
  const cancelledDuties = myDuties.filter(d => d.status === 'cancelled');
  const expiredDuties = myDuties.filter(d => d.status === 'expired');
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

        {/* ── Stat Cards (Priority: Active Duties 1st, Open Opportunities 2nd, Completed Shifts 3rd) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.1rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Active Duties', value: activeDuties.length, icon: '🔄', color: '#a78bfa', tab: 'duties', filter: 'active' },
            { label: 'Open Opportunities', value: availableJobs.length, icon: '🔍', color: '#38bdf8', tab: 'jobs' },
            { label: 'Completed Shifts', value: completedDuties.length, icon: '✅', color: '#34d399', tab: 'duties', filter: 'completed' },
            { label: 'Rating Score', value: `${parseFloat(ratingsData.rating_avg || 5.0).toFixed(1)}★`, icon: '⭐', color: '#f59e0b', tab: 'ratings' },
          ].map(s => (
            <div
              key={s.tab + s.label}
              onClick={() => {
                setActiveTab(s.tab);
                if (s.filter) setDutyFilter(s.filter);
                else setDutyFilter('all');
              }}
              className="glass-panel"
              style={{
                padding: '1.25rem', cursor: 'pointer',
                border: (activeTab === s.tab && (!s.filter || dutyFilter === s.filter)) ? `1.5px solid ${s.color}` : '1px solid var(--glass-border)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{s.icon}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#e2e8f0', marginTop: '0.3rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Tab: My Duties ── */}
        {activeTab === 'duties' && (() => {
          const filteredDuties = myDuties.filter(d => {
            if (dutyFilter === 'active') return d.status === 'assigned' || d.status === 'in_progress';
            if (dutyFilter === 'completed') return d.status === 'completed';
            if (dutyFilter === 'cancelled') return d.status === 'cancelled';
            return true;
          });

          return (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: '800' }}>📋 My Companion Duties</h2>
                {/* Status Filter Pills (Priority: Active 1st) */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {[
                    { key: 'active',    label: 'Active Duties',  count: activeDuties.length },
                    { key: 'completed', label: 'Completed',      count: completedDuties.length },
                    { key: 'cancelled', label: 'Cancelled',      count: cancelledDuties.length },
                    { key: 'expired',   label: 'Expired',        count: expiredDuties.length },
                    { key: 'all',       label: 'All Duties',     count: myDuties.length },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setDutyFilter(f.key)}
                      style={{
                        padding: '0.35rem 0.85rem', borderRadius: '9999px', fontSize: '0.8rem',
                        fontWeight: '700', cursor: 'pointer',
                        background: dutyFilter === f.key ? '#38bdf8' : 'rgba(255,255,255,0.07)',
                        color: dutyFilter === f.key ? '#0f172a' : 'var(--text-muted)',
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
              ) : filteredDuties.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                  No duties found for this filter.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
                  {filteredDuties.map(duty => (
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
                      <p>🗓️ Scheduled Shift: {duty.shift_date} ({formatShiftRange(duty.start_time, duty.end_time)})</p>
                      {duty.duty_log && (duty.duty_log.check_in || duty.duty_log.check_out) && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: '8px', marginTop: '0.4rem', marginBottom: '0.4rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <p style={{ color: '#38bdf8', fontWeight: '700', fontSize: '0.78rem' }}>🕒 Actual Time Record:</p>
                          <p style={{ fontSize: '0.76rem' }}>Check-In: <strong style={{ color: '#34d399' }}>{duty.duty_log.check_in || '—'}</strong></p>
                          <p style={{ fontSize: '0.76rem' }}>Check-Out: <strong style={{ color: '#f87171' }}>{duty.duty_log.check_out || '—'}</strong></p>
                          <p style={{ fontSize: '0.76rem', color: '#fbbf24', fontWeight: '700', marginTop: '0.15rem' }}>⏱️ Actual Worked Hours: {duty.actual_worked_hours} hrs</p>
                        </div>
                      )}
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
                      {(duty.status === 'completed' || duty.status === 'cancelled') && (
                        <button
                          onClick={() => { setSelectedClaimDuty(duty); setShowClaimModal(true); }}
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.4rem 0.85rem',
                            borderRadius: '8px',
                            border: duty.status === 'cancelled' ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(52,211,153,0.4)',
                            background: duty.status === 'cancelled' ? 'rgba(239,68,68,0.12)' : 'rgba(52,211,153,0.12)',
                            color: duty.status === 'cancelled' ? '#f87171' : '#34d399',
                            cursor: 'pointer',
                            fontWeight: '700'
                          }}
                        >
                          🧾 {duty.status === 'cancelled' ? 'Cancellation Receipt' : 'E-Claim Receipt'} (RM {duty.actual_total_payout !== undefined && duty.actual_total_payout !== null ? duty.actual_total_payout : (duty.status === 'cancelled' ? '0.00' : (parseFloat(duty.allowance_amount || 0) + parseFloat(duty.tip_amount || 0)).toFixed(2))})
                        </button>
                      )}
                    </div>

                    {/* Patient Care Notes Component (Shows latest 2 notes + Read More modal) */}
                    {duty.duty_log && (
                      <CareNotesList
                        notes={duty.duty_log.care_notes_list}
                        shiftDate={duty.shift_date}
                        title="📝 Patient Care Notes"
                      />
                    )}

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
          );
        })()}

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
                        <p>🗓️ {job.shift_date} · {formatShiftRange(job.start_time, job.end_time)}</p>
                        <p>👴 Patient Age: ~{job.patient_age} yrs</p>
                        <p>📌 {job.task_details}</p>
                      </div>

                      {job.has_applied && withdrawCountdowns[job.id] > 0 ? (
                        <div>
                          <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.35)', borderRadius: '10px', padding: '0.65rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                            <div style={{ color: '#34d399', fontWeight: '800', fontSize: '0.85rem' }}>⚡ Auto-Assigned! You are confirmed for this duty.</div>
                            <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                              Withdraw window closes in: <strong style={{ color: '#fbbf24', fontSize: '1rem' }}>{withdrawCountdowns[job.id]}s</strong>
                            </div>
                          </div>
                          <button
                            onClick={() => handleWithdraw(job.id)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer' }}
                          >
                            ⬅️ Withdraw Application ({withdrawCountdowns[job.id]}s left)
                          </button>
                        </div>
                      ) : job.status === 'cancelled' ? (
                        <div style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontWeight: '700', fontSize: '0.82rem', textAlign: 'center' }}>
                          🚫 Duty Cancelled by Admin
                          <div style={{ fontSize: '0.74rem', fontWeight: '600', opacity: 0.9, marginTop: '0.2rem' }}>
                            Reason: {job.cancellation_reason || 'Cancelled by Admin'}
                          </div>
                        </div>
                      ) : job.has_applied ? (
                        <div>
                          <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '10px', padding: '0.55rem', marginBottom: '0.5rem', textAlign: 'center', fontSize: '0.78rem', color: '#34d399', fontWeight: '700' }}>
                            ⚡ You are assigned to this duty
                          </div>
                          <button
                            onClick={() => { setActiveTab('duties'); setDutyFilter('active'); }}
                            className="btn btn-primary"
                            style={{ width: '100%', fontSize: '0.82rem', padding: '0.55rem' }}
                          >
                            ▶ Go to My Duties → Check In
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedJobForConsent(job);
                            setHealthAgreed(false);
                            setShowConsentModal(true);
                          }}
                          className="btn btn-primary"
                          style={{ width: '100%', fontSize: '0.875rem' }}
                        >
                          🛡️ Health Declaration &amp; Apply
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
          <div id="printable-eclaim-slip" className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '520px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: selectedClaimDuty.status === 'cancelled' ? '#f87171' : '#34d399', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🏥 HoSZA Hospital Companion Services</div>
                <h3 style={{ fontWeight: '800', fontSize: '1.15rem', marginTop: '0.2rem' }}>
                  {selectedClaimDuty.status === 'cancelled' ? 'Shift Cancellation Payout Statement' : 'Shift Allowance Statement (E-Claim Slip)'}
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} className="no-print">
                <button
                  onClick={() => window.print()}
                  style={{
                    padding: '0.42rem 0.85rem', borderRadius: '8px', border: '1px solid #34d399',
                    background: 'linear-gradient(135deg, #059669, #10b981)', color: '#ffffff',
                    fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer'
                  }}
                >
                  🖨️ Print / Save PDF
                </button>
                <button onClick={() => setShowClaimModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
              </div>
            </div>

            {selectedClaimDuty.status === 'cancelled' && (
              <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#f87171', fontSize: '0.83rem', lineHeight: '1.5' }}>
                <strong style={{ display: 'block', fontSize: '0.88rem', marginBottom: '0.2rem' }}>🚫 Shift Cancelled by Admin</strong>
                <div><strong>Cancellation Reason:</strong> {selectedClaimDuty.cancellation_reason || 'Cancelled by Admin'}</div>
                <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '0.35rem' }}>
                  {parseFloat(selectedClaimDuty.actual_total_payout || 0) > 0 
                    ? `💵 Pay Per Worked Hours Policy: Compensated RM ${selectedClaimDuty.actual_total_payout} for ${selectedClaimDuty.actual_worked_hours || '0.0'} hours worked prior to cancellation.`
                    : 'ℹ️ Shift cancelled before check-in (RM 0.00 payout).'}
                </div>
              </div>
            )}

            <div className="print-border-box" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1.1rem', marginBottom: '1.25rem', fontSize: '0.85rem', lineHeight: '1.65' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Shift Reference No.:</span>
                <strong style={{ color: '#f59e0b', fontFamily: 'monospace' }}>{selectedClaimDuty.request_code}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Companion:</span>
                <strong style={{ color: '#f1f5f9' }}>{user.name} ({user.ic_number})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ward & Bed:</span>
                <span>{selectedClaimDuty.ward_name} ({selectedClaimDuty.bed_number})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Scheduled Shift:</span>
                <span>{selectedClaimDuty.shift_date} ({formatShiftRange(selectedClaimDuty.start_time, selectedClaimDuty.end_time)})</span>
              </div>
              
              {/* Actual Check-In & Check-Out Timestamps */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Actual Check-In Time:</span>
                  <strong style={{ color: '#34d399' }}>{selectedClaimDuty.duty_log?.check_in ? selectedClaimDuty.duty_log.check_in : '—'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Actual Check-Out Time:</span>
                  <strong style={{ color: '#f87171' }}>{selectedClaimDuty.duty_log?.check_out ? selectedClaimDuty.duty_log.check_out : '—'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Actual Logged Duration:</span>
                  <strong style={{ color: '#38bdf8' }}>{selectedClaimDuty.actual_worked_hours || selectedClaimDuty.scheduled_hours} Hours</strong>
                </div>
                {selectedClaimDuty.billable_hours && selectedClaimDuty.billable_hours < selectedClaimDuty.actual_worked_hours && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', color: '#f59e0b', fontSize: '0.78rem' }}>
                    <span>Billable Hours (Auto-Capped):</span>
                    <strong>{selectedClaimDuty.billable_hours} Hours</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Breakdown (Based on Billable Hours) */}
            <div className="print-border-box" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '12px', padding: '1.1rem', marginBottom: '1.25rem', fontSize: '0.86rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.6rem' }}>
                💰 Claim Payout ({selectedClaimDuty.billable_hours || selectedClaimDuty.actual_worked_hours || selectedClaimDuty.scheduled_hours} Paid Hrs @ RM {selectedClaimDuty.hourly_rate || '10.00'}/hr)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span>Base Shift Payout:</span>
                <span>RM {selectedClaimDuty.actual_allowance_amount || selectedClaimDuty.allowance_amount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem', color: '#fbbf24' }}>
                <span>Family Tip / Bonus:</span>
                <span>+ RM {parseFloat(selectedClaimDuty.tip_amount || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontWeight: '900', fontSize: '1.05rem', color: '#34d399' }}>
                <span>TOTAL ACTUAL CLAIM:</span>
                <span>RM {selectedClaimDuty.actual_total_payout || selectedClaimDuty.allowance_amount}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
              ℹ️ Claim receipt generated based on actual ward check-in and check-out timestamps verified at HoSZA Ward.
            </div>
          </div>
        </div>
      )}

      {/* Modal: Health & Safety Self-Declaration Consent Form */}
      {showConsentModal && selectedJobForConsent && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowConsentModal(false)}>
          <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '540px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🏥 HoSZA Companion Health &amp; Safety Consent</div>
                <h3 style={{ fontWeight: '800', fontSize: '1.15rem', marginTop: '0.2rem' }}>Health Self-Declaration Form</h3>
              </div>
              <button onClick={() => setShowConsentModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '12px', padding: '1.1rem', marginBottom: '1.25rem', fontSize: '0.85rem', lineHeight: '1.65' }}>
              <div style={{ fontWeight: '700', color: '#38bdf8', marginBottom: '0.5rem', fontSize: '0.82rem', textTransform: 'uppercase' }}>
                📋 Shift Details: {selectedJobForConsent.ward_name} ({selectedJobForConsent.shift_date})
              </div>
              
              <div style={{ color: '#e2e8f0', fontSize: '0.82rem', marginTop: '0.5rem' }}>
                <p style={{ fontWeight: '700', color: '#fbbf24', marginBottom: '0.35rem' }}>1. Health &amp; Wellness Self-Declaration:</p>
                <ul style={{ paddingLeft: '1.2rem', margin: '0 0 0.75rem 0', color: '#cbd5e1', lineHeight: '1.5' }}>
                  <li>I am currently in good health and free from fever (&gt;37.5°C), cough, flu, shortness of breath, skin rash, or contagious illnesses.</li>
                  <li>I am not under any official quarantine or isolation order for infectious diseases.</li>
                  <li>I am physically &amp; mentally fit to perform patient assistance duties safely.</li>
                </ul>

                <p style={{ fontWeight: '700', color: '#34d399', marginBottom: '0.35rem' }}>2. Hospital Ward Hygiene &amp; Safety Undertaking:</p>
                <ul style={{ paddingLeft: '1.2rem', margin: '0 0 0.75rem 0', color: '#cbd5e1', lineHeight: '1.5' }}>
                  <li>I agree to practice frequent hand sanitization and wear protective face masks inside HoSZA ward premises as required.</li>
                  <li>I undertake to follow all safety guidelines and directives issued by HoSZA Ward Nurses and Medical Officers.</li>
                </ul>

                <p style={{ fontWeight: '700', color: '#f87171', marginBottom: '0.35rem' }}>3. Truthfulness &amp; Legal Compliance:</p>
                <p style={{ color: '#cbd5e1', fontSize: '0.78rem', fontStyle: 'italic', margin: 0 }}>
                  I confirm that all statements provided are true and accurate. False health declaration will result in immediate shift cancellation and revocation of ward entry authorization.
                </p>
              </div>
            </div>

            {/* Checkbox agreement */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.85rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', fontSize: '0.83rem', color: '#f1f5f9', fontWeight: '600', lineHeight: '1.45' }}>
                <input
                  type="checkbox"
                  checked={healthAgreed}
                  onChange={e => setHealthAgreed(e.target.checked)}
                  style={{ width: '18px', height: '18px', marginTop: '0.1rem', cursor: 'pointer', accentColor: '#38bdf8' }}
                />
                <span>I hereby declare that I am in good health, free from infectious symptoms, and agree to abide by all HoSZA Ward Health &amp; Safety Protocols.</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowConsentModal(false)}
                className="btn btn-secondary"
                style={{ fontSize: '0.83rem', padding: '0.55rem 1.1rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!healthAgreed}
                onClick={() => {
                  setShowConsentModal(false);
                  handleApply(selectedJobForConsent.id);
                }}
                className="btn btn-primary"
                style={{
                  fontSize: '0.83rem', padding: '0.55rem 1.1rem',
                  opacity: healthAgreed ? 1 : 0.5,
                  cursor: healthAgreed ? 'pointer' : 'not-allowed',
                  background: healthAgreed ? 'linear-gradient(135deg, #0284c7, #38bdf8)' : 'rgba(51,65,85,0.6)'
                }}
              >
                ✓ Agree &amp; Submit Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
