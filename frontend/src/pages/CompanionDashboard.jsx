import React, { useState, useEffect } from 'react';
import { requestAPI, companionAPI } from '../services/api';
import EPassModal from '../components/EPassModal';

export default function CompanionDashboard({ user }) {
  const [availableJobs, setAvailableJobs] = useState([]);
  const [myDuties, setMyDuties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDutyForPass, setActiveDutyForPass] = useState(null);
  const [careNoteText, setCareNoteText] = useState({});

  const fetchCompanionData = async () => {
    setLoading(true);
    try {
      // 1. Fetch available jobs strictly matching companion's gender
      const jobsRes = await requestAPI.getAvailable(user.gender);
      setAvailableJobs(jobsRes.data.data || []);

      // 2. Fetch assigned duties
      const dutiesRes = await companionAPI.getMyDuties(user.id);
      setMyDuties(dutiesRes.data || []);
    } catch (err) {
      console.error('Error fetching companion data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanionData();
  }, [user]);

  const handleApply = async (requestId) => {
    try {
      const res = await companionAPI.applyJob({
        request_id: requestId,
        companion_id: user.id
      });
      alert(res.data.message || 'Application submitted successfully!');
      fetchCompanionData();
    } catch (err) {
      alert(err.response?.data?.messages?.error || err.response?.data?.message || 'Failed to apply for duty.');
    }
  };

  const handleCheckIn = async (requestId) => {
    try {
      await companionAPI.checkIn({
        request_id: requestId,
        companion_id: user.id
      });
      alert('✓ Checked in successfully at HoSZA Ward!');
      fetchCompanionData();
    } catch (err) {
      alert('Check-in failed.');
    }
  };

  const handleCheckOut = async (requestId) => {
    if (!window.confirm('Are you sure you want to Check-out and complete this duty shift?')) return;
    try {
      await companionAPI.checkOut({
        request_id: requestId,
        companion_id: user.id
      });
      alert('✓ Checked out successfully. Duty shift completed.');
      fetchCompanionData();
    } catch (err) {
      alert('Check-out failed.');
    }
  };

  const handleAddNote = async (requestId) => {
    const note = careNoteText[requestId];
    if (!note) return;
    try {
      await companionAPI.addCareNote({ request_id: requestId, note });
      setCareNoteText({ ...careNoteText, [requestId]: '' });
      alert('Care note added!');
      fetchCompanionData();
    } catch (err) {
      alert('Failed to add care note.');
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      {/* Banner / Header */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.2), rgba(2, 132, 199, 0.2))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>
              Companion Portal (HoSZA)
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Safety Filter Active: Displaying duties for <strong style={{ color: user.gender === 'L' ? '#60a5fa' : '#f472b6' }}>{user.gender === 'L' ? 'MALE' : 'FEMALE'} PATIENTS ONLY</strong>.
            </p>
          </div>
          <span className={`badge ${user.gender === 'L' ? 'badge-male' : 'badge-female'}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            {user.gender === 'L' ? '♂ MALE COMPANION' : '♀ FEMALE COMPANION'}
          </span>
        </div>
      </div>

      {/* Section 1: My Active / Assigned Duties */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📋 My Assigned Duties at HoSZA
        </h3>

        {myDuties.length === 0 ? (
          <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No active or assigned duties currently. Please apply for duties below.
          </div>
        ) : (
          <div className="grid grid-2">
            {myDuties.map((duty) => (
              <div key={duty.id} className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #059669' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span className={`badge badge-${duty.status}`}>{duty.status}</span>
                  <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: '700' }}>{duty.request_code}</span>
                </div>

                <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  {duty.ward_name} (Bed {duty.bed_number})
                </h4>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  <strong>Patient:</strong> {duty.patient_name} ({duty.patient_age} yrs)
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  <strong>Shift Time:</strong> {duty.shift_date} ({duty.start_time} - {duty.end_time})
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  <strong>Task Details:</strong> {duty.task_details}
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                  <button onClick={() => setActiveDutyForPass(duty)} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                    📱 Show Ward E-Pass
                  </button>

                  {duty.status === 'assigned' && (
                    <button onClick={() => handleCheckIn(duty.id)} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                      ▶ Ward Check-in
                    </button>
                  )}

                  {duty.status === 'in_progress' && (
                    <button onClick={() => handleCheckOut(duty.id)} className="btn btn-danger" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                      ⏹ Check-out & End Shift
                    </button>
                  )}
                </div>

                {/* Care note widget for in_progress duties */}
                {duty.status === 'in_progress' && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>+ Add Patient Care Activity Note:</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Patient finished lunch"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                        value={careNoteText[duty.id] || ''}
                        onChange={(e) => setCareNoteText({ ...careNoteText, [duty.id]: e.target.value })}
                      />
                      <button onClick={() => handleAddNote(duty.id)} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
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

      {/* Section 2: Open Job Feed (Filtered by Gender) */}
      <div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🔍 Available Companion Opportunities (HoSZA Wards)
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading opportunities...</div>
        ) : availableJobs.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No new companion requests for {user.gender === 'L' ? 'Male' : 'Female'} patients at HoSZA currently. Please check back soon.
          </div>
        ) : (
          <div className="grid grid-2">
            {availableJobs.map((job) => (
              <div key={job.id} className="glass-panel" style={{ padding: '1.5rem', transition: 'transform 0.2s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span className={`badge ${job.patient_gender === 'L' ? 'badge-male' : 'badge-female'}`}>
                    Patient: {job.patient_gender === 'L' ? 'Male' : 'Female'}
                  </span>
                  <span style={{ fontSize: '1rem', fontWeight: '800', color: '#34d399' }}>
                    RM {parseFloat(job.allowance_amount).toFixed(2)}
                  </span>
                </div>

                <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  {job.ward_name} (HoSZA)
                </h4>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  <p>🗓️ <strong>Date:</strong> {job.shift_date}</p>
                  <p>⏰ <strong>Time:</strong> {job.start_time} - {job.end_time}</p>
                  <p>👴 <strong>Patient:</strong> Age ~{job.patient_age} yrs</p>
                  <p>📌 <strong>Tasks:</strong> {job.task_details}</p>
                </div>

                <button onClick={() => handleApply(job.id)} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                  Apply as Companion
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* E-Pass Modal */}
      {activeDutyForPass && (
        <EPassModal duty={activeDutyForPass} onClose={() => setActiveDutyForPass(null)} />
      )}
    </div>
  );
}
