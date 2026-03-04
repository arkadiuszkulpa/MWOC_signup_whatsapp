import React from "react";

export default function SearchResults({ participants, onSelect, whatsappGroupLink }) {
  if (!participants || participants.length === 0) return null;

  return (
    <div className="result-card found">
      <h3>We found you!</h3>
      <p style={{ color: "#a0a0b0", marginBottom: 16 }}>
        Tap your name below to check in:
      </p>
      <ul className="search-results">
        {participants.map((p) => (
          <li key={p.participantId} onClick={() => onSelect(p)}>
            <div className="name">{p.name}</div>
            <div className="details">
              {p.email && <span>{p.email}</span>}
              {p.phone && <span>{p.phone}</span>}
            </div>
            <div>
              <span className={`status-badge ${p.inWhatsAppGroup ? "active" : "pending"}`}>
                WhatsApp: {p.inWhatsAppGroup ? "Joined" : "Not yet"}
              </span>
              <span className={`status-badge ${p.inMailchimp ? "active" : "pending"}`}>
                Mailing list: {p.inMailchimp ? "Yes" : "No"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
