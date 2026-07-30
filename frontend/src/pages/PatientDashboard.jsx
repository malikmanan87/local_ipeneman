import React, { useState, useEffect } from 'react';
import { requestAPI } from '../services/api';

export default function PatientDashboard({ user }) {
  const [myRequests, setMyRequests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    created_by_user_id: user.id,
    created_by_role: 'user',
    patient_name: '',
    patient_rn: '',
    patient_gender: user.gender || 'L',
    patient_age: 65,
    ward_name: 'Wad 3A (Lelaki)',
    bed_number: 'Katil 08',
    shift_date: new Date().toISOString().split('T')[0],
    start_time: '14:00',
    end_time: '20:00',
    task_details: 'Bantu teman pesakit berbual, pimpin ke tandas & ambil makanan.',
    allowance_amount: 60.00
  });

  const fetchMyRequests = async () => {
    setLoading(true);
    try {
      const res = await requestAPI.getMyRequests(user.id);
      setMyRequests(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await requestAPI.create(formData);
      alert('✓ Permohonan Peneman Pesakit di Wad HoSZA berjaya dicipta!');
      setShowModal(false);
      fetchMyRequests();
    } catch (err) {
      alert('Gagal mencipta permohonan.');
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Papan Pengurusan Waris Pesakit</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Permohonan khidmat peneman untuk pesakit di Wad Hospital Sultan Zainal Abidin (HoSZA)
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          + Mohon Peneman Pesakit Baru
        </button>
      </div>

      {/* List of Requests */}
      <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>
        Senarai Permohonan Saya
      </h3>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Memuatkan permohonan...</div>
      ) : myRequests.length === 0 ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Anda belum mempunyai sebarang permohonan peneman pesakit. Klik butang "+ Mohon Peneman Pesakit Baru" di atas.
        </div>
      ) : (
        <div className="grid grid-2">
          {myRequests.map((req) => (
            <div key={req.id} className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span className={`badge badge-${req.status}`}>{req.status}</span>
                <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: '700' }}>{req.request_code}</span>
              </div>

              <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.4rem' }}>
                {req.patient_name} ({req.patient_gender === 'L' ? 'Lelaki' : 'Perempuan'})
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                <strong>Wad:</strong> {req.ward_name} ({req.bed_number})
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                <strong>Tarikh/Masa:</strong> {req.shift_date} ({req.start_time} - {req.end_time})
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                <strong>Elaun:</strong> RM {parseFloat(req.allowance_amount).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Modal Cipta Permohonan */}
      {showModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Borang Permohonan Peneman Pesakit</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nama Pesakit</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.patient_name}
                  onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Jantina Pesakit (Diperlukan untuk tapisan keselamatan peneman jantina sama)</label>
                <select
                  className="form-select"
                  value={formData.patient_gender}
                  onChange={(e) => setFormData({ ...formData, patient_gender: e.target.value })}
                >
                  <option value="L">Lelaki (Hanya Peneman Lelaki Boleh Mohon)</option>
                  <option value="P">Perempuan (Hanya Peneman Perempuan Boleh Mohon)</option>
                </select>
              </div>

              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label>Wad HoSZA</label>
                  <select
                    className="form-select"
                    value={formData.ward_name}
                    onChange={(e) => setFormData({ ...formData, ward_name: e.target.value })}
                  >
                    <option value="Wad 3A (Lelaki)">Wad 3A (Wad Lelaki)</option>
                    <option value="Wad 4B (Perempuan)">Wad 4B (Wad Perempuan)</option>
                    <option value="Wad Daycare / HDW">Wad Daycare / HDW</option>
                    <option value="Wad Pediatrik">Wad Pediatrik</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>No. Katil Wad</label>
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
                  <label>Tarikh Syif</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.shift_date}
                    onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Masa Mula</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Masa Tamat</label>
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
                <label>Kadar Elaun Peneman (RM)</label>
                <input
                  type="number"
                  step="5"
                  className="form-input"
                  value={formData.allowance_amount}
                  onChange={(e) => setFormData({ ...formData, allowance_amount: parseFloat(e.target.value) })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Tugas & Keperluan Khas Pesakit</label>
                <textarea
                  rows="3"
                  className="form-textarea"
                  value={formData.task_details}
                  onChange={(e) => setFormData({ ...formData, task_details: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                Hantar Permohonan
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
