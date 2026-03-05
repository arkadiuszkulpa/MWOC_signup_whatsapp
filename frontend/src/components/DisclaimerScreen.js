import React from "react";

export default function DisclaimerScreen({ participant, onAccept, loading }) {
  return (
    <div className="search-section">
      <h2>Safety Disclaimer</h2>
      <div style={{
        background: "rgba(255, 200, 50, 0.1)",
        border: "1px solid rgba(255, 200, 50, 0.3)",
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        textAlign: "left",
        lineHeight: 1.6,
      }}>
        <p style={{ color: "#e0a526", fontWeight: "bold", marginBottom: 12, fontSize: 16 }}>
          Please read and accept before checking in:
        </p>
        <p style={{ color: "#c0c0d0", fontSize: 14 }}>
          The Men's Way of the Cross is an outdoor walk over uneven terrain including
          muddy paths, hills, and coastal cliffs. While this is a group activity,
          <strong style={{ color: "#fff" }}> each participant is responsible for their own
          safety and well-being</strong>.
        </p>
        <p style={{ color: "#c0c0d0", fontSize: 14, marginTop: 12 }}>
          By checking in, you confirm that you understand the physical nature of
          this walk, that you participate at your own risk, and that the organisers
          cannot be held liable for any injury or incident that may occur.
        </p>
      </div>
      <p style={{ fontSize: 15, color: "#a0a0b0", marginBottom: 16 }}>
        Checking in: <strong style={{ color: "#fff" }}>{participant.name}</strong>
      </p>
      <button
        className="btn btn-primary"
        onClick={onAccept}
        disabled={loading}
      >
        {loading ? (
          <>
            <span className="spinner" /> Checking in...
          </>
        ) : (
          "I Accept — Check Me In"
        )}
      </button>
    </div>
  );
}
