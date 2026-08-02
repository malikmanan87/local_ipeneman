import React, { useState } from 'react';
import { adminAPI } from '../services/api';
import { formatShiftRange } from '../utils/formatTime';

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
    <div style={{ background: 'var(--bg-dark)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* ── Page Header ── */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#34d399', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            🏥 Hospital Sultan Zainal Abidin (HoSZA)
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '0.25rem' }}>Ward Verification Portal</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Logged in as <strong style={{ color: '#f1f5f9' }}>{user.name}</strong> ·{' '}
            <span style={{ color: '#34d399', fontWeight: '700' }}>
              {user.role === 'staff' ? 'Ward Nurse / Security Officer' : 'Staff'}
            </span>
          </p>
        </div>

        {/* ── Scanner Widget ── */}
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(5,150,105,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              📷
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Scan Digital Ward E-Pass</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                Enter the pass code displayed on the companion's phone to verify ward entry
              </p>
            </div>
          </div>

          <form onSubmit={handleVerifyPassSubmit}>
            <div style={{ marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '700', color: '#38bdf8' }}>
              Pass Code / QR Token
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. IPENEMAN-20260730-8472"
                style={{ fontFamily: 'monospace', fontSize: '0.95rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}
                value={inputPassCode}
                onChange={(e) => setInputPassCode(e.target.value.toUpperCase())}
                required
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ whiteSpace: 'nowrap', minWidth: '110px' }}
                disabled={verifying}
              >
                {verifying ? '⏳ Checking...' : 'Verify Pass'}
              </button>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Present the pass code shown on the companion's screen upon ward entry
            </p>
          </form>
        </div>

        {/* ── Verification Result ── */}
        {verificationResult && (
          <div className="animate-fade-in">

            {/* INVALID */}
            {!verificationResult.is_valid && (
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.45)', borderRadius: '14px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ color: '#f87171', fontWeight: '800', fontSize: '1.05rem' }}>⛔ Invalid or Unapproved Pass</span>
                  <span style={{ background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.5)', color: '#f87171', padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '800' }}>DENIED</span>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#fca5a5', marginBottom: '1rem' }}>{verificationResult.error_message}</p>
                <button onClick={handleReset} style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer', fontWeight: '700' }}>
                  Try Again
                </button>
              </div>
            )}

            {/* DUPLICATE SCAN */}
            {verificationResult.is_valid && verificationResult.already_scanned && (
              <div style={{ background: 'rgba(245,158,11,0.12)', border: '1.5px solid rgba(245,158,11,0.5)', borderRadius: '14px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ color: '#fbbf24', fontWeight: '800', fontSize: '1.05rem' }}>⚠️ ATTENTION: Pass Already Scanned by System!</span>
                  <span style={{ background: '#f59e0b', color: '#0f172a', padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '800' }}>DUPLICATE</span>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1rem', borderLeft: '3px solid #f59e0b', fontSize: '0.85rem' }}>
                  <div style={{ color: '#fbbf24', fontWeight: '700', marginBottom: '0.25rem' }}>🕒 First Scanned At: {verificationResult.previous_scan_info?.scanned_at}</div>
                  <div style={{ color: '#e2e8f0' }}>👤 Scanned By: <strong>{verificationResult.previous_scan_info?.scanned_by_name}</strong></div>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.35rem' }}>
                    Please confirm companion identity physically before allowing entry.
                  </p>
                </div>

                <div style={{ display: 'grid', gap: '0.65rem', marginBottom: '1rem' }}>
                  <InfoBox label="Companion" value={`${verificationResult.companion?.name} · IC: ${verificationResult.companion?.ic_number}`} />
                  <InfoBox label="Ward" value={`${verificationResult.request?.ward_name} (${verificationResult.request?.bed_number})`} />
                  <InfoBox label="Patient" value={`${verificationResult.request?.patient_name} (${verificationResult.request?.patient_rn})`} />
                  <InfoBox label="Shift" value={`${verificationResult.request?.shift_date} · ${formatShiftRange(verificationResult.request?.start_time, verificationResult.request?.end_time)}`} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Re-checked at {verificationResult.verified_at}</span>
                  <button onClick={handleReset} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}>Scan Another</button>
                </div>
              </div>
            )}

            {/* VALID — FIRST SCAN */}
            {verificationResult.is_valid && !verificationResult.already_scanned && (
              <div style={{ background: 'rgba(5,150,105,0.12)', border: '1.5px solid rgba(5,150,105,0.5)', borderRadius: '14px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ color: '#34d399', fontWeight: '800', fontSize: '1.05rem' }}>✅ Valid Digital Ward Entry Pass</span>
                  <span style={{ background: '#059669', color: 'white', padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '800' }}>AUTHORIZED ENTRY</span>
                </div>

                <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '1rem' }}>
                  <InfoBox label="Companion" value={`${verificationResult.companion?.name} · IC: ${verificationResult.companion?.ic_number}`} />
                  <InfoBox label="Phone" value={verificationResult.companion?.phone} />
                  <InfoBox label="UniSZA ID" value={verificationResult.companion?.profile?.student_staff_id || 'N/A'} />
                  <InfoBox label="Ward" value={`${verificationResult.request?.ward_name} (${verificationResult.request?.bed_number})`} accent="#f59e0b" />
                  <InfoBox label="Patient (RN)" value={`${verificationResult.request?.patient_name} · ${verificationResult.request?.patient_rn}`} />
                  <InfoBox label="Shift" value={`${verificationResult.request?.shift_date} · ${formatShiftRange(verificationResult.request?.start_time, verificationResult.request?.end_time)}`} />
                  <div style={{ background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.3)', borderRadius: '8px', padding: '0.6rem 0.85rem', fontSize: '0.82rem', color: '#34d399', fontWeight: '700' }}>
                    🔒 Safety Verified: {verificationResult.request?.patient_gender === 'L' ? 'Male Companion → Male Ward' : 'Female Companion → Female Ward'}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Verified at {verificationResult.verified_at}</span>
                  <button onClick={handleReset} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}>Scan Another</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Info Banner ── */}
        {!verificationResult && (
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', borderLeft: '3px solid #38bdf8' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.65' }}>
              <strong style={{ color: '#38bdf8' }}>📌 Instructions:</strong> Ask the companion to show their Digital Ward E-Pass on their phone.
              Type or scan the pass code into the field above. A <span style={{ color: '#34d399', fontWeight: '700' }}>Green result</span> = authorized entry.
              A <span style={{ color: '#f59e0b', fontWeight: '700' }}>Yellow result</span> = previously scanned (duplicate — verify identity manually).
              A <span style={{ color: '#f87171', fontWeight: '700' }}>Red result</span> = invalid / unauthorized pass.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoBox({ label, value, accent }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '0.6rem 0.85rem', fontSize: '0.84rem', display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
      <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>{label}</span>
      <span style={{ color: accent || '#f1f5f9', fontWeight: '700', textAlign: 'right' }}>{value}</span>
    </div>
  );
}
