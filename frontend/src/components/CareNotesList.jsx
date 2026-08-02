import React, { useState } from 'react';
import { formatTimeAMPM } from '../utils/formatTime';

export default function CareNotesList({ notes = [], shiftDate = '', title = '📝 Patient Care Notes' }) {
  const [showModal, setShowModal] = useState(false);

  if (!notes || notes.length === 0) return null;

  const totalNotes = notes.length;
  const isTruncated = totalNotes > 2;
  // Show latest 2 notes (last 2 elements of array)
  const displayedNotes = isTruncated ? notes.slice(-2) : notes;

  const groupNotesByDate = (noteArray) => {
    const grouped = {};
    noteArray.forEach(item => {
      let dateKey = item.date;
      if (!dateKey) {
        const m = item.note && item.note.match(/(\d{2}\/\d{2}\/\d{4})/);
        dateKey = m ? m[1] : (shiftDate || 'Care Log');
      }
      if (dateKey.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = dateKey.split('-');
        dateKey = `${d}/${m}/${y}`;
      }
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(item);
    });
    return grouped;
  };

  const renderGroupedNotes = (noteArray) => {
    const grouped = groupNotesByDate(noteArray);
    return Object.entries(grouped).map(([dateStr, noteList]) => (
      <div key={dateStr} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '0.5rem 0.65rem', border: '1px solid rgba(139,92,246,0.15)', marginBottom: '0.4rem' }}>
        <div style={{ fontWeight: '700', color: '#fbbf24', fontSize: '0.75rem', marginBottom: '0.35rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.2rem' }}>
          📅 Date: {dateStr}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {noteList.map((note, idx) => {
            const displayTime = formatTimeAMPM(note.time || '');
            const formattedText = (note.note || '').replace(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g, (match) => formatTimeAMPM(match));

            return (
              <div key={idx} style={{ fontSize: '0.78rem', display: 'flex', gap: '0.45rem', alignItems: 'flex-start' }}>
                <span style={{ color: '#a78bfa', fontWeight: '700', whiteSpace: 'nowrap' }}>[{displayTime || '—'}]</span>
                <span style={{ color: '#f1f5f9' }}>{formattedText}</span>
              </div>
            );
          })}
        </div>
      </div>
    ));
  };

  return (
    <>
      <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '10px', padding: '0.75rem', marginTop: '0.85rem', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
        <div style={{ fontWeight: '800', color: '#a78bfa', marginBottom: '0.5rem', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{title}</span>
          <span style={{ fontSize: '0.7rem', opacity: 0.8, textTransform: 'none', color: '#c4b5fd' }}>
            {isTruncated ? `Showing latest 2 of ${totalNotes} notes` : `Total ${totalNotes} note${totalNotes > 1 ? 's' : ''}`}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {renderGroupedNotes(displayedNotes)}
        </div>

        {isTruncated && (
          <div style={{ textAlign: 'right', marginTop: '0.4rem' }}>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#38bdf8',
                fontWeight: '700',
                fontSize: '0.78rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '0.2rem 0'
              }}
            >
              Read More ({totalNotes} care notes) →
            </button>
          </div>
        )}
      </div>

      {/* Modal for full care notes history */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '560px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: '1px solid rgba(139,92,246,0.4)', padding: '1.5rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#a78bfa' }}>
                📖 All Patient Care Notes ({totalNotes})
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', fontWeight: '800' }}
              >
                ✕
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.3rem' }}>
              {renderGroupedNotes(notes)}
            </div>

            <div style={{ marginTop: '1.25rem', textAlign: 'right', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 1.1rem', fontSize: '0.82rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
