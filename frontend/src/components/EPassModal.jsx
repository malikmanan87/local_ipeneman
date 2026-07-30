import React from 'react';

export default function EPassModal({ duty, onClose }) {
  if (!duty) return null;

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content animate-fade-in" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>PAS DIGITAL MASUK WAD HOSZA</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.2), rgba(2, 132, 199, 0.2))',
          border: '2px dashed var(--primary)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: '800', letterSpacing: '0.1em' }}>
            PAS KEBENARAN BERTUGAS SAH
          </div>

          <div style={{ margin: '1.25rem 0', display: 'inline-block', background: 'white', padding: '1rem', borderRadius: '12px' }}>
            {/* SVG QR Code Simulation */}
            <svg width="150" height="150" viewBox="0 0 100 100">
              <path d="M0,0 h30 v30 h-30 z M40,0 h20 v10 h-20 z M70,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z M80,10 h10 v10 h-10 z M0,40 h10 v20 h-10 z M20,40 h30 v10 h-30 z M60,40 h40 v30 h-40 z M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z M40,70 h20 v20 h-20 z M70,80 h30 v20 h-30 z" fill="#0f172a"/>
            </svg>
          </div>

          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'white' }}>
            KOD PAS: <span style={{ color: '#f59e0b' }}>{duty.request_code}</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Tunjukkan pas ini kepada Pengawal Keselamatan / Jururawat Wad
          </div>
        </div>

        <div style={{ textAlign: 'left', background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '10px', fontSize: '0.875rem' }}>
          <p style={{ marginBottom: '0.4rem' }}><strong>Hospital:</strong> Hospital Sultan Zainal Abidin (HoSZA)</p>
          <p style={{ marginBottom: '0.4rem' }}><strong>Lokasi Wad:</strong> {duty.ward_name} (Katil {duty.bed_number})</p>
          <p style={{ marginBottom: '0.4rem' }}><strong>Nama Pesakit:</strong> {duty.patient_name}</p>
          <p style={{ marginBottom: '0.4rem' }}><strong>Jantina Pesakit:</strong> {duty.patient_gender === 'L' ? 'Lelaki' : 'Perempuan'}</p>
          <p><strong>Waktu Syif:</strong> {duty.shift_date} ({duty.start_time} - {duty.end_time})</p>
        </div>

        <button onClick={onClose} className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>
          Tutup Pas
        </button>
      </div>
    </div>
  );
}
