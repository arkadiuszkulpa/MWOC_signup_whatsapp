import React, { useState, useRef, useEffect } from "react";

export default function UpdateDetailsForm({ participant, onUpdate, onSkip, onEditAll, loading, editAll }) {
  const [name, setName] = useState(editAll ? (participant.name || "") : "");
  const [email, setEmail] = useState(editAll ? (participant.email || "") : "");
  const [phone, setPhone] = useState(editAll ? (participant.phone || "") : "");
  const [postcode, setPostcode] = useState(editAll ? (participant.postcode || "") : "");
  const [emergencyName, setEmergencyName] = useState(editAll ? (participant.emergencyName || "") : "");
  const [emergencyPhone, setEmergencyPhone] = useState(editAll ? (participant.emergencyPhone || "") : "");
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

    if (editAll) {
      if (name.trim()) updates.name = name.trim();
      if (email.trim()) updates.email = email.trim();
      if (phone.trim()) updates.phone = phone.trim();
      if (postcode.trim()) updates.postcode = postcode.trim().toUpperCase();
      if (emergencyName.trim()) updates.emergencyName = emergencyName.trim();
      if (emergencyPhone.trim()) updates.emergencyPhone = emergencyPhone.trim();
    } else {
      if (missingEmail && email.trim()) updates.email = email.trim();
      if (missingPhone && phone.trim()) updates.phone = phone.trim();
      if (missingPostcode && postcode.trim()) updates.postcode = postcode.trim().toUpperCase();
      if (emergencyName.trim()) updates.emergencyName = emergencyName.trim();
      if (emergencyPhone.trim()) updates.emergencyPhone = emergencyPhone.trim();
    }

    onUpdate(updates);
  };

  const hasInput = editAll
    ? (name.trim() !== (participant.name || "") ||
       email.trim() !== (participant.email || "") ||
       phone.trim() !== (participant.phone || "") ||
       postcode.trim().toUpperCase() !== (participant.postcode || "") ||
       emergencyName.trim() !== (participant.emergencyName || "") ||
       emergencyPhone.trim() !== (participant.emergencyPhone || ""))
    : ((missingEmail && email.trim()) ||
       (missingPhone && phone.trim()) ||
       (missingPostcode && postcode.trim()) ||
       emergencyName.trim() ||
       emergencyPhone.trim());

  return (
    <div className="search-section">
      <h2>{editAll ? "Edit Details" : `Welcome back, ${participant.name}!`}</h2>
      <p style={{ color: "#a0a0b0", marginBottom: 16, fontSize: 15 }}>
        {editAll
          ? `Update any details for ${participant.name}`
          : "We're missing some of your details. Would you like to add them?"}
      </p>
      <form onSubmit={handleSubmit}>
        {editAll && (
          <div className="input-group">
            <label htmlFor="name">Name</label>
            <input
              ref={editAll ? inputRef : null}
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </div>
        )}

        {(editAll || missingEmail) && (
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              ref={!editAll && missingEmail ? inputRef : null}
              id="email"
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
          </div>
        )}
        {(editAll || missingPhone) && (
          <div className="input-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              ref={!editAll && !missingEmail ? inputRef : null}
              id="phone"
              type="tel"
              placeholder="+44 7700 900000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="off"
            />
          </div>
        )}
        {(editAll || missingPostcode) && (
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

        {(editAll || missingEmergency) && (
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
            editAll ? "Save Changes" : "Update My Details"
          )}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onSkip}>
          {editAll ? "Cancel" : "Skip for now"}
        </button>
        {!editAll && onEditAll && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}
            onClick={onEditAll}
          >
            Edit all my details
          </button>
        )}
      </form>
    </div>
  );
}
