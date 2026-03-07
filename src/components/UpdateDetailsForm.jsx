import React, { useState, useRef, useEffect } from "react";

export default function UpdateDetailsForm({ participant, onUpdate, onSkip, loading }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [postcode, setPostcode] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const missingEmail = !participant.email;
  const missingPhone = !participant.phone;
  const missingPostcode = !participant.postcode;
  const missingEmergency = !participant.emergencyName;

  const handleSubmit = (e) => {
    e.preventDefault();
    const updates = { participantId: participant.participantId };
    if (missingEmail && email.trim()) updates.email = email.trim();
    if (missingPhone && phone.trim()) updates.phone = phone.trim();
    if (missingPostcode && postcode.trim()) updates.postcode = postcode.trim().toUpperCase();
    if (emergencyName.trim()) updates.emergencyName = emergencyName.trim();
    if (emergencyPhone.trim()) updates.emergencyPhone = emergencyPhone.trim();
    onUpdate(updates);
  };

  const hasInput =
    (missingEmail && email.trim()) ||
    (missingPhone && phone.trim()) ||
    (missingPostcode && postcode.trim()) ||
    emergencyName.trim() ||
    emergencyPhone.trim();

  return (
    <div className="search-section">
      <h2>Welcome back, {participant.name}!</h2>
      <p style={{ color: "#a0a0b0", marginBottom: 16, fontSize: 15 }}>
        We're missing some of your details. Would you like to add them?
      </p>
      <form onSubmit={handleSubmit}>
        {missingEmail && (
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              ref={missingEmail ? inputRef : null}
              id="email"
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
          </div>
        )}
        {missingPhone && (
          <div className="input-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              ref={!missingEmail ? inputRef : null}
              id="phone"
              type="tel"
              placeholder="+44 7700 900000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="off"
            />
          </div>
        )}
        {missingPostcode && (
          <div className="input-group">
            <label htmlFor="postcode">Postcode Area (first half)</label>
            <input
              id="postcode"
              type="text"
              placeholder="e.g. BN1, TN34, RH10"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              autoComplete="off"
              maxLength={5}
              style={{ textTransform: "uppercase" }}
            />
            <span style={{ color: "#606080", fontSize: 12 }}>
              Used for our event map — no full address needed
            </span>
          </div>
        )}

        {missingEmergency && (
          <>
            <p style={{ color: "#e0a526", fontSize: 14, marginTop: 20, marginBottom: 8, fontWeight: "bold" }}>
              Emergency Contact / Next of Kin
            </p>
            <div className="input-group">
              <label htmlFor="emergencyName">Contact Name</label>
              <input
                id="emergencyName"
                type="text"
                placeholder="Jane Smith"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="input-group">
              <label htmlFor="emergencyPhone">Contact Phone</label>
              <input
                id="emergencyPhone"
                type="tel"
                placeholder="+44 7700 900000"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                autoComplete="off"
              />
            </div>
          </>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={!hasInput || loading}
        >
          {loading ? (
            <>
              <span className="spinner" /> Updating...
            </>
          ) : (
            "Update My Details"
          )}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onSkip}>
          Skip for now
        </button>
      </form>
    </div>
  );
}
