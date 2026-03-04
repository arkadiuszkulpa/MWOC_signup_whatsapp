import React, { useState, useRef, useEffect } from "react";

export default function SignupForm({ initialQuery, onSignup, loading, onCancel }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const nameRef = useRef(null);

  useEffect(() => {
    // Pre-fill from the search query
    if (initialQuery) {
      if (initialQuery.includes("@")) {
        setEmail(initialQuery);
      } else if (/^\d/.test(initialQuery.replace(/\D/g, "")) && initialQuery.replace(/\D/g, "").length >= 7) {
        setPhone(initialQuery);
      } else {
        setName(initialQuery);
      }
    }
    if (nameRef.current) nameRef.current.focus();
  }, [initialQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!email.trim() && !phone.trim()) return;
    onSignup({ name: name.trim(), email: email.trim(), phone: phone.trim() });
  };

  const isValid = name.trim().length > 0 && (email.trim().length > 0 || phone.trim().length > 0);

  return (
    <div className="search-section">
      <h2>New Participant — Sign Up</h2>
      <p style={{ color: "#a0a0b0", marginBottom: 16, fontSize: 15 }}>
        Please fill in your details to join the Men's Way of the Cross.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="name">Full Name *</label>
          <input
            ref={nameRef}
            id="name"
            type="text"
            placeholder="John Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="input-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="input-group">
          <label htmlFor="phone">Phone Number</label>
          <input
            id="phone"
            type="tel"
            placeholder="+353 87 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="off"
          />
        </div>
        <p style={{ color: "#606080", fontSize: 13, marginBottom: 16 }}>
          * Name is required, plus at least one of email or phone.
        </p>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!isValid || loading}
        >
          {loading ? (
            <>
              <span className="spinner" /> Signing up...
            </>
          ) : (
            "Sign Up"
          )}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Back to Search
        </button>
      </form>
    </div>
  );
}
