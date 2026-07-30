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
      alert(res.data.message || 'Permohonan berjaya dihantar!');
      fetchCompanionData();
    } catch (err) {
      alert(err.response?.data?.messages?.error || err.response?.data?.message || 'Gagal memohon tugasan.');
    }
  };

  const handleCheckIn = async (requestId) => {
    try {
      const res = await companionAPI.checkIn({
        request_id: requestId,
        companion_id: user.id
      });
      alert('✓ Check-in berjaya di Wad HoSZA!');
      fetchCompanionData();
    } catch (err) {
      alert('Gagal check-in.');
    }
  };

  const handleCheckOut = async (requestId) => {
    if (!window.confirm('Adakah anda pasti mahu Check-out dan menamatkan syif tugas ini?')) return;
    try {
      await companionAPI.checkOut({
        request_id: requestId,
        companion_id: user.id
      });
      alert('✓ Check-out berjaya. Syif peneman selesai.');
      fetchCompanionData();
    } catch (err) {
      alert('Gagal check-out.');
    }
  };

  const handleAddNote = async (requestId) => {
    const note = careNoteText[requestId];
    if (!note) return;
    try {
      await companionAPI.addCareNote({ request_id: requestId, note });
      setCareNoteText({ ...careNoteText, [requestId]: '' });
      alert('Catatan pesakit ditambah!');
      fetchCompanionData();
    } catch (err) {
      alert('Gagal menambah catatan.');
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      {/* Banner / Header */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.2), rgba(2, 132, 199, 0.2))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>
              Papan Peneman Pesakit HoSZA
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Penapis Keselamatan Aktif: Paparan tugasan khas untuk <strong style={{ color: user.gender === 'L' ? '#60a5fa' : '#f472b6' }}>PESAKIT {user.gender === 'L' ? 'LELAKI' : 'PEREMPUAN'} SAHAJA</strong>.
            </p>
          </div>
          <span className={`badge ${user.gender === 'L' ? 'badge-male' : 'badge-female'}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            {user.gender === 'L' ? '♂ PENEMAN LELAKI' : '♀ PENEMAN PEREMPUAN'}
          </span>
        </div>
      </div>

      {/* Section 1: My Active / Assigned Duties */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📋 Tugasan Saya di HoSZA
        </h3>

        {myDuties.length === 0 ? (
          <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Tiada tugasan aktif atau dilantik pada masa ini. Sila mohon tugasan di bawah.
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
                  {duty.ward_name} (Katil {duty.bed_number})
                </h4>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  <strong>Pesakit:</strong> {duty.patient_name} ({duty.patient_age} tahun)
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  <strong>Masa Syif:</strong> {duty.shift_date} ({duty.start_time} - {duty.end_time})
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  <strong>Tugas:</strong> {duty.task_details}
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                  <button onClick={() => setActiveDutyForPass(duty)} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                    📱 Tunjuk E-Pas Wad
                  </button>

                  {duty.status === 'assigned' && (
                    <button onClick={() => handleCheckIn(duty.id)} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                      ▶ Check-in Masuk Wad
                    </button>
                  )}

                  {duty.status === 'in_progress' && (
                    <button onClick={() => handleCheckOut(duty.id)} className="btn btn-danger" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                      ⏹ Check-out Selesai Syif
                    </button>
                  )}
                </div>

                {/* Care note widget for in_progress duties */}
                {duty.status === 'in_progress' && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>+ Tambah Catatan Aktiviti Pesakit:</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="contoh: Pesakit dah selesai makan tengahari"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                        value={careNoteText[duty.id] || ''}
                        onChange={(e) => setCareNoteText({ ...careNoteText, [duty.id]: e.target.value })}
                      />
                      <button onClick={() => handleAddNote(duty.id)} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                        Simpan
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
          🔍 Tawaran Tugasan Peneman Tersedia (Hospital HoSZA)
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Memuatkan tugasan...</div>
        ) : availableJobs.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Tiada permohonan peneman baru untuk pesakit {user.gender === 'L' ? 'Lelaki' : 'Perempuan'} di HoSZA buat masa ini. Sila semak semula sebentar lagi.
          </div>
        ) : (
          <div className="grid grid-2">
            {availableJobs.map((job) => (
              <div key={job.id} className="glass-panel" style={{ padding: '1.5rem', transition: 'transform 0.2s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span className={`badge ${job.patient_gender === 'L' ? 'badge-male' : 'badge-female'}`}>
                    Pesakit {job.patient_gender === 'L' ? 'Lelaki' : 'Perempuan'}
                  </span>
                  <span style={{ fontSize: '1rem', fontWeight: '800', color: '#34d399' }}>
                    RM {parseFloat(job.allowance_amount).toFixed(2)}
                  </span>
                </div>

                <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  {job.ward_name} (HoSZA)
                </h4>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  <p>🗓️ <strong>Tarikh:</strong> {job.shift_date}</p>
                  <p>⏰ <strong>Masa:</strong> {job.start_time} - {job.end_time}</p>
                  <p>👴 <strong>Pesakit:</strong> Umur ~{job.patient_age} tahun</p>
                  <p>📌 <strong>Tugas:</strong> {job.task_details}</p>
                </div>

                <button onClick={() => handleApply(job.id)} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                  Mohon Jadi Peneman
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
