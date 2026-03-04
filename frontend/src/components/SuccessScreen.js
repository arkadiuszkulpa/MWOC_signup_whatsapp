import React, { useEffect } from "react";

export default function SuccessScreen({
  participant,
  isNew,
  whatsappGroupLink,
  onReset,
}) {
  // Auto-reset after 15 seconds (tablet kiosk mode)
  useEffect(() => {
    const timer = setTimeout(onReset, 15000);
    return () => clearTimeout(timer);
  }, [onReset]);

  return (
    <div className="success-message">
      <div className="checkmark">{isNew ? "\u2728" : "\u2705"}</div>
      <h2>
        {isNew ? "Welcome!" : "Welcome Back!"}
      </h2>
      <p style={{ fontSize: 22, color: "#fff", marginBottom: 8 }}>
        {participant.name}
      </p>
      <p>
        {isNew
          ? "You've been registered for the Men's Way of the Cross."
          : "Great to see you again. You're already registered."}
      </p>

      {!participant.inWhatsAppGroup && whatsappGroupLink && (
        <div style={{ marginTop: 24 }}>
          <p style={{ color: "#e0a526", marginBottom: 12 }}>
            Join our WhatsApp group to stay connected:
          </p>
          <a
            href={whatsappGroupLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp"
            style={{ textDecoration: "none", display: "block" }}
          >
            Join WhatsApp Group
          </a>
          <p style={{ fontSize: 13, color: "#606080", marginTop: 8 }}>
            {participant.phone
              ? "An invite link has also been sent to your phone."
              : "Tap above to join, or we'll email you the link."}
          </p>
        </div>
      )}

      {participant.inWhatsAppGroup && (
        <p style={{ marginTop: 16 }}>
          <span className="status-badge active">WhatsApp Group: Joined</span>
        </p>
      )}

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
