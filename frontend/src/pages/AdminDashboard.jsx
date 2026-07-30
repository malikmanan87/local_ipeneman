import React, { useState, useEffect } from 'react';
import { adminAPI, requestAPI } from '../services/api';

export default function AdminDashboard({ user }) {
  const [stats, setStats] = useState({ total_companions: 0, total_requests: 0, active_duties: 0, on_behalf_count: 0 });
  const [requests, setRequests] = useState([]);
  const [showOnBehalfModal, setShowOnBehalfModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state for On-Behalf Request (Admin creating for patient without waris)
  const [formData, setFormData] = useState({
    created_by_user_id: user.id,
    created_by_role: 'admin',
    patient_name: '',
    patient_rn: '',
    patient_gender: 'L',
    patient_age: 70,
    ward_name: 'Wad 3A (Lelaki)',
    bed_number: 'Katil 14',
    shift_date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '16:00',
    task_details: 'PESAKIT SEBATANG KARA (TIADA WARIS): Bantu makan tengahari, pimpin ke tandas & sokongan emosi di wad.',
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
      alert('✓ Permohonan Bagi Pihak Pesakit (Tanpa Waris) berjaya disiarkan!');
      setShowOnBehalfModal(false);
      fetchData();
    } catch (err) {
      alert('Gagal mencipta permohonan admin.');
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      {/* Admin Header */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.2), rgba(15, 23, 42, 0.4))' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Portal Pentadbir Hospital Sultan Zainal Abidin (HoSZA)</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Pemantauan Peneman Pesakit Wad & Modul Permohonan Bagi Pihak Pesakit Tanpa Waris
          </p>
        </div>
        <button onClick={() => setShowOnBehalfModal(true)} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
          🏥 + Mohon Bagi Pihak Pesakit (Tiada Waris)
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-4" style={{ marginBottom: '2.5rem' }}>
        <div className="glass-panel stat-card">
          <div className="stat-icon">👥</div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{stats.total_companions}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Peneman Berdaftar</div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon">📋</div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{stats.total_requests}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Jumlah Permohonan</div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>🔄</div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{stats.active_duties}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Syif Bertugas Aktif</div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>🏥</div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{stats.on_behalf_count}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Kes Tanpa Waris</div>
          </div>
        </div>
      </div>

      {/* Overview Table */}
      <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>
        Senarai Keseluruhan Permohonan Wad HoSZA
      </h3>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Memuatkan senarai...</div>
      ) : (
        <div className="glass-panel" style={{ overflowX: 'auto', padding: '1rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Kod Permohonan</th>
                <th style={{ padding: '0.75rem' }}>Pencipta</th>
                <th style={{ padding: '0.75rem' }}>Pesakit (RN)</th>
                <th style={{ padding: '0.75rem' }}>Jantina</th>
                <th style={{ padding: '0.75rem' }}>Lokasi Wad</th>
                <th style={{ padding: '0.75rem' }}>Tarikh & Masa</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: '700', color: '#f59e0b' }}>{req.request_code}</td>
                  <td style={{ padding: '0.75rem' }}>
                    {req.created_by_role === 'admin' ? (
                      <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>STAFF HOSZA (BAGI PIHAK)</span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>WARIS PESAKIT</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{req.patient_name} ({req.patient_rn})</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`badge ${req.patient_gender === 'L' ? 'badge-male' : 'badge-female'}`}>
                      {req.patient_gender === 'L' ? 'Lelaki' : 'Perempuan'}
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

      {/* Modal Permohonan Bagi Pihak (Admin) */}
      {showOnBehalfModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Cipta Permohonan (Bagi Pihak Pesakit)</h3>
                <p style={{ fontSize: '0.8rem', color: '#f59e0b' }}>Khusus untuk pesakit tiada waris / sebatang kara di HoSZA</p>
              </div>
              <button onClick={() => setShowOnBehalfModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleOnBehalfSubmit}>
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

              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label>No. Registration Pesakit (RN HoSZA)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.patient_rn}
                    onChange={(e) => setFormData({ ...formData, patient_rn: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Jantina Pesakit (Diperlukan untuk tapisan keselamatan)</label>
                  <select
                    className="form-select"
                    value={formData.patient_gender}
                    onChange={(e) => setFormData({ ...formData, patient_gender: e.target.value })}
                  >
                    <option value="L">Lelaki (Peneman Lelaki Sahaja)</option>
                    <option value="P">Perempuan (Peneman Perempuan Sahaja)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label>Lokasi Wad HoSZA</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.ward_name}
                    onChange={(e) => setFormData({ ...formData, ward_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>No. Katil</label>
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
                <label>Tugas & Catatan Khas Staff Wad</label>
                <textarea
                  rows="3"
                  className="form-textarea"
                  value={formData.task_details}
                  onChange={(e) => setFormData({ ...formData, task_details: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                Siarkan Permohonan Wad
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
