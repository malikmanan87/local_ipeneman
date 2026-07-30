import React, { useState } from 'react';
import { adminAPI } from '../services/api';

export default function NurseDashboard({ user }) {
  const [inputPassCode, setInputPassCode] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const handleVerifyPassSubmit = async (e) => {
    e.preventDefault();
    if (!inputPassCode.trim()) return;
    setVerifying(true);
    setVerificationResult(null);
    try {
      const res = await adminAPI.verifyPass(inputPassCode.trim(), user.id);
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

  const handleReset = () => {
    setInputPassCode('');
    setVerificationResult(null);
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '650px', margin: '0 auto' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.2), rgba(2, 132, 199, 0.2))' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🩺</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>
          HoSZA Ward Nurse & Security Verification Portal
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Digital Ward Entry Pass Verification for Hospital Sultan Zainal Abidin Wards
        </p>
        <div style={{ marginTop: '0.75rem' }}>
          <span className="badge" style={{ background: 'rgba(5, 150, 105, 0.3)', color: '#34d399', padding: '0.4rem 0.85rem' }}>
            Logged in as: {user.name} ({user.role === 'staff' ? 'HoSZA Ward Staff / Officer' : 'Staff'})
          </span>
        </div>
      </div>

      {/* Scanner Widget */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📷 Scan / Verify Digital Ward Pass
        </h3>
        
        <form onSubmit={handleVerifyPassSubmit} style={{ marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label style={{ fontSize: '0.9rem', color: '#38bdf8', fontWeight: '700' }}>
              Enter Pass Code / QR Token
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. IPENEMAN-20260730-8472"
                style={{ fontSize: '1rem', padding: '0.75rem 1rem', textTransform: 'uppercase' }}
                value={inputPassCode}
                onChange={(e) => setInputPassCode(e.target.value)}
                required
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '0.75rem 1.25rem', whiteSpace: 'nowrap', background: 'linear-gradient(135deg, #059669, #0284c7)', fontSize: '0.95rem' }}
                disabled={verifying}
              >
                {verifying ? 'Verifying...' : 'Verify Pass'}
              </button>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
              Present pass code shown on companion's phone screen upon ward entry
            </span>
          </div>
        </form>

        {/* Verification Result Card */}
        {verificationResult && (
          <div className="animate-fade-in">
            {verificationResult.is_valid ? (
              verificationResult.already_scanned ? (
                /* DUPLICATE SCAN ALERT (WARNING) */
                <div style={{ background: 'rgba(245, 158, 11, 0.25)', border: '2px solid #f59e0b', borderRadius: '14px', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ color: '#f59e0b', fontWeight: '800', fontSize: '1.15rem' }}>
                      ⚠️ ATTENTION: PASS HAS ALREADY BEEN SCANNED BY SYSTEM!
                    </div>
                    <span className="badge" style={{ background: '#f59e0b', color: '#0f172a', fontWeight: '800' }}>
                      DUPLICATE SCAN DETECTED
                    </span>
                  </div>

                  <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '4px solid #f59e0b', fontSize: '0.875rem' }}>
                    <p style={{ color: '#f59e0b', fontWeight: '700', marginBottom: '0.3rem' }}>
                      🕒 First Scanned At: {verificationResult.previous_scan_info?.scanned_at}
                    </p>
                    <p style={{ color: '#e2e8f0', marginBottom: '0.2rem' }}>
                      👤 Scanned By Staff: <strong>{verificationResult.previous_scan_info?.scanned_by_name}</strong>
                    </p>
                    <p style={{ color: '#cbd5e1', fontSize: '0.8rem', fontStyle: 'italic', marginTop: '0.35rem' }}>
                      Notice: This companion pass was previously verified upon ward entry. Please confirm companion identity before granting entry.
                    </p>
                  </div>

                  <div style={{ fontSize: '0.9rem', lineHeight: '1.7', color: '#f8fafc' }}>
                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
                      <p>👨‍🦱 <strong>Companion Name:</strong> <span style={{ color: '#38bdf8', fontWeight: '700' }}>{verificationResult.companion?.name}</span></p>
                      <p>🪪 <strong>IC / MyKad:</strong> {verificationResult.companion?.ic_number}</p>
                      <p>📱 <strong>Phone Number:</strong> {verificationResult.companion?.phone}</p>
                    </div>

                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                      <p>🏥 <strong>Authorized Ward:</strong> <strong style={{ color: '#f59e0b' }}>{verificationResult.request?.ward_name} ({verificationResult.request?.bed_number})</strong></p>
                      <p>👴 <strong>Patient Name (RN):</strong> {verificationResult.request?.patient_name} ({verificationResult.request?.patient_rn})</p>
                      <p>⏰ <strong>Shift Hours:</strong> {verificationResult.request?.shift_date} ({verificationResult.request?.start_time} - {verificationResult.request?.end_time})</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Re-checked At: {verificationResult.verified_at}
                    </span>
                    <button onClick={handleReset} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                      Scan Another Pass
                    </button>
                  </div>
                </div>
              ) : (
                /* FIRST-TIME SCAN SUCCESS (GREEN) */
                <div style={{ background: 'rgba(5, 150, 105, 0.25)', border: '2px solid #34d399', borderRadius: '14px', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ color: '#34d399', fontWeight: '800', fontSize: '1.15rem' }}>
                      ✅ PAS SAH & DILULUSKAN (Imbasan Pertama)
                    </div>
                    <span className="badge" style={{ background: '#059669', color: 'white', fontWeight: '800' }}>
                      AUTHORIZED ENTRY
                    </span>
                  </div>

                  <div style={{ fontSize: '0.9rem', lineHeight: '1.7', color: '#f8fafc' }}>
                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
                      <p>👨‍🦱 <strong>Companion Name:</strong> <span style={{ color: '#38bdf8', fontWeight: '700' }}>{verificationResult.companion?.name}</span></p>
                      <p>🪪 <strong>IC / MyKad:</strong> {verificationResult.companion?.ic_number}</p>
                      <p>📱 <strong>Phone Number:</strong> {verificationResult.companion?.phone}</p>
                      <p>🎓 <strong>UniSZA ID:</strong> {verificationResult.companion?.profile?.student_staff_id || 'N/A'}</p>
                    </div>

                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                      <p>🏥 <strong>Authorized Ward:</strong> <strong style={{ color: '#f59e0b' }}>{verificationResult.request?.ward_name} ({verificationResult.request?.bed_number})</strong></p>
                      <p>👴 <strong>Patient Name (RN):</strong> {verificationResult.request?.patient_name} ({verificationResult.request?.patient_rn})</p>
                      <p>⏰ <strong>Shift Hours:</strong> {verificationResult.request?.shift_date} ({verificationResult.request?.start_time} - {verificationResult.request?.end_time})</p>
                      <p style={{ color: '#34d399', fontWeight: '700', marginTop: '0.25rem' }}>
                        🔒 Safety Verification: {verificationResult.request?.patient_gender === 'L' ? 'Male Companion for Male Ward (Verified)' : 'Female Companion for Female Ward (Verified)'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Verified At: {verificationResult.verified_at}
                    </span>
                    <button onClick={handleReset} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                      Scan Another Pass
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div style={{ background: 'rgba(225, 29, 72, 0.25)', border: '2px solid #f43f5e', borderRadius: '14px', padding: '1.5rem', color: '#fda4af' }}>
                <div style={{ fontWeight: '800', fontSize: '1.15rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ⛔ INVALID OR UNAPPROVED PASS
                </div>
                <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>{verificationResult.error_message}</p>
                
                <button onClick={handleReset} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', border: '1px solid #f43f5e', color: '#fda4af' }}>
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
