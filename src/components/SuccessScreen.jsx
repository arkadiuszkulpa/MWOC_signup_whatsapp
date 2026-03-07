import React, { useEffect } from "react";

export default function SuccessScreen({ participant, isNew, onReset }) {
  // Auto-reset after 15 seconds (tablet kiosk mode)
  useEffect(() => {
    const timer = setTimeout(onReset, 15000);
    return () => clearTimeout(timer);
  }, [onReset]);

  return (
    <div className="success-message">
      <div className="checkmark">{isNew ? "\u2728" : "\u2705"}</div>
      <h2>{isNew ? "Welcome!" : "Welcome Back!"}</h2>
      <p style={{ fontSize: 22, color: "#fff", marginBottom: 8 }}>
        {participant.name}
      </p>
      <p>
        {isNew
          ? "You've been registered for the Men's Way of the Cross."
          : "Great to see you again. You're checked in."}
      </p>

      <button
        className="btn btn-secondary"
        onClick={onReset}
        style={{ marginTop: 32 }}
      >
        Next Person
      </button>

      <p style={{ fontSize: 12, color: "#404060", marginTop: 16 }}>
        This screen will reset automatically in 15 seconds.
      </p>
    </div>
  );
}
