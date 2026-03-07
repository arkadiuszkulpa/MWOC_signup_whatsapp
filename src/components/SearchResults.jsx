import React from "react";

export default function SearchResults({ participants, onSelect }) {
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
              {p.email && <div>{p.email}</div>}
              {p.phone && <div>{p.phone}</div>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
