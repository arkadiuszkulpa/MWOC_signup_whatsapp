import React, { useState, useRef, useEffect } from "react";

export default function SearchForm({ onSearch, loading }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    // Auto-focus on mount for tablet convenience
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      onSearch(query.trim());
    }
  };

  return (
    <div className="search-section">
      <h2>Check In or Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="search">Your name, email, or phone number</label>
          <input
            ref={inputRef}
            id="search"
            type="text"
            placeholder="e.g. John Smith or john@email.com"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || query.trim().length < 2}
        >
          {loading ? (
            <>
              <span className="spinner" /> Searching...
            </>
          ) : (
            "Search"
          )}
        </button>
      </form>
    </div>
  );
}
