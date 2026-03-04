import React, { useState, useCallback } from "react";
import SearchForm from "./components/SearchForm";
import SearchResults from "./components/SearchResults";
import SignupForm from "./components/SignupForm";
import SuccessScreen from "./components/SuccessScreen";
import { searchParticipant, createParticipant, sendWhatsAppInvite } from "./services/api";
import "./styles/App.css";

// App states: search → results → signup → success
const VIEWS = { SEARCH: "search", RESULTS: "results", SIGNUP: "signup", SUCCESS: "success" };

export default function App() {
  const [view, setView] = useState(VIEWS.SEARCH);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [whatsappGroupLink, setWhatsappGroupLink] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [isNewSignup, setIsNewSignup] = useState(false);

  const handleSearch = async (query) => {
    setError(null);
    setLoading(true);
    setSearchQuery(query);

    try {
      const { data } = await searchParticipant(query);
      setWhatsappGroupLink(data.whatsappGroupLink || "");

      if (data.found && data.participants.length > 0) {
        setSearchResults(data.participants);
        setView(VIEWS.RESULTS);
      } else {
        // No match — go straight to signup with query pre-filled
        setView(VIEWS.SIGNUP);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectParticipant = (participant) => {
    setSelectedParticipant(participant);
    setIsNewSignup(false);
    setView(VIEWS.SUCCESS);
  };

  const handleSignup = async ({ name, email, phone }) => {
    setError(null);
    setLoading(true);

    try {
      const { status, data } = await createParticipant({ name, email, phone });

      if (status === 409) {
        // Already exists — show them as returning
        setSelectedParticipant(data.participant);
        setIsNewSignup(false);
      } else {
        setSelectedParticipant(data.participant);
        setIsNewSignup(true);

        // Send WhatsApp invite in the background
        if (data.participant.phone || data.participant.email) {
          sendWhatsAppInvite(data.participant).catch((err) =>
            console.warn("Failed to send WhatsApp invite:", err)
          );
        }
      }
      setWhatsappGroupLink(data.whatsappGroupLink || whatsappGroupLink);
      setView(VIEWS.SUCCESS);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = useCallback(() => {
    setView(VIEWS.SEARCH);
    setError(null);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedParticipant(null);
    setIsNewSignup(false);
  }, []);

  return (
    <div className="app">
      <div className="header">
        <div className="cross-icon">{"\u271D"}</div>
        <h1>Men's Way of the Cross</h1>
        <p>Participant Check-In</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {view === VIEWS.SEARCH && (
        <SearchForm onSearch={handleSearch} loading={loading} />
      )}

      {view === VIEWS.RESULTS && (
        <>
          <SearchResults
            participants={searchResults}
            onSelect={handleSelectParticipant}
            whatsappGroupLink={whatsappGroupLink}
          />
          <button className="btn btn-secondary" onClick={() => setView(VIEWS.SIGNUP)}>
            I'm not in the list — Sign me up
          </button>
        </>
      )}

      {view === VIEWS.SIGNUP && (
        <SignupForm
          initialQuery={searchQuery}
          onSignup={handleSignup}
          loading={loading}
          onCancel={handleReset}
        />
      )}

      {view === VIEWS.SUCCESS && selectedParticipant && (
        <SuccessScreen
          participant={selectedParticipant}
          isNew={isNewSignup}
          whatsappGroupLink={whatsappGroupLink}
          onReset={handleReset}
        />
      )}

      {view !== VIEWS.SUCCESS && (
        <div className="reset-area">
          <button className="reset-link" onClick={handleReset}>
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}
