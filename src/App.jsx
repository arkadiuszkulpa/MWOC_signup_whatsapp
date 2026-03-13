import React, { useState, useCallback, lazy, Suspense } from "react";
const ParticipantMap = lazy(() => import("./components/ParticipantMap"));
import SearchForm from "./components/SearchForm";
import SearchResults from "./components/SearchResults";
import SignupForm from "./components/SignupForm";
import UpdateDetailsForm from "./components/UpdateDetailsForm";
import DisclaimerScreen from "./components/DisclaimerScreen";
import SuccessScreen from "./components/SuccessScreen";
import EventStats from "./components/EventStats";
import { searchParticipant, createParticipant, updateParticipant, checkinParticipant } from "./services/api";
import "./styles/App.css";

// App states: search → results → signup/update → disclaimer → success
const VIEWS = {
  SEARCH: "search",
  RESULTS: "results",
  SIGNUP: "signup",
  UPDATE: "update",
  EDIT_ALL: "editAll",
  DISCLAIMER: "disclaimer",
  SUCCESS: "success",
  MAP: "map",
};

export default function App() {
  const [view, setView] = useState(VIEWS.SEARCH);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [isNewSignup, setIsNewSignup] = useState(false);
  const [statsKey, setStatsKey] = useState(0);

  const handleSearch = async (query) => {
    setError(null);
    setLoading(true);
    setSearchQuery(query);

    try {
      const { data } = await searchParticipant(query);

      if (data.found && data.participants.length > 0) {
        setSearchResults(data.participants);
        setView(VIEWS.RESULTS);
      } else {
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
    // If missing email, phone, postcode, or emergency contact, prompt them to fill in details
    if (!participant.email || !participant.phone || !participant.postcode || !participant.emergencyName) {
      setView(VIEWS.UPDATE);
    } else {
      setView(VIEWS.DISCLAIMER);
    }
  };

  const handleUpdate = async ({ participantId, email, phone, postcode, emergencyName, emergencyPhone }) => {
    setError(null);
    setLoading(true);

    try {
      const { data } = await updateParticipant({ participantId, email, phone, postcode, emergencyName, emergencyPhone });
      setSelectedParticipant(data.participant);
      setIsNewSignup(false);
      setView(VIEWS.DISCLAIMER);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipUpdate = () => {
    setIsNewSignup(false);
    setView(VIEWS.DISCLAIMER);
  };

  const handleSignup = async ({ name, email, phone }) => {
    setError(null);
    setLoading(true);

    try {
      const { status, data } = await createParticipant({ name, email, phone });

      if (status === 409) {
        setSelectedParticipant(data.participant);
        setIsNewSignup(false);
      } else {
        setSelectedParticipant(data.participant);
        setIsNewSignup(true);
      }
      setView(VIEWS.DISCLAIMER);
      setStatsKey(k => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDisclaimer = async () => {
    setError(null);
    setLoading(true);

    try {
      const { data } = await checkinParticipant(selectedParticipant.participantId);
      setSelectedParticipant(data.participant);
      setView(VIEWS.SUCCESS);
      setStatsKey(k => k + 1);
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
        <EventStats refreshKey={statsKey} />
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

      {view === VIEWS.UPDATE && selectedParticipant && (
        <UpdateDetailsForm
          participant={selectedParticipant}
          onUpdate={handleUpdate}
          onSkip={handleSkipUpdate}
          onEditAll={() => setView(VIEWS.EDIT_ALL)}
          loading={loading}
        />
      )}

      {view === VIEWS.EDIT_ALL && selectedParticipant && (
        <UpdateDetailsForm
          participant={selectedParticipant}
          onUpdate={handleUpdate}
          onSkip={() => setView(VIEWS.DISCLAIMER)}
          loading={loading}
          editAll
        />
      )}

      {view === VIEWS.DISCLAIMER && selectedParticipant && (
        <DisclaimerScreen
          participant={selectedParticipant}
          onAccept={handleAcceptDisclaimer}
          onEditAll={() => setView(VIEWS.EDIT_ALL)}
          loading={loading}
        />
      )}

      {view === VIEWS.SUCCESS && selectedParticipant && (
        <SuccessScreen
          participant={selectedParticipant}
          isNew={isNewSignup}
          onReset={handleReset}
        />
      )}

      {view === VIEWS.MAP && (
        <Suspense fallback={<div className="loading"><span className="spinner" /> Loading map...</div>}>
          <ParticipantMap onBack={handleReset} />
        </Suspense>
      )}

      {view !== VIEWS.SUCCESS && view !== VIEWS.MAP && (
        <div className="reset-area">
          <button className="reset-link" onClick={handleReset}>
            Start Over
          </button>
        </div>
      )}
      <div className="footer-badges">
        <button className="footer-badge" onClick={() => setView(VIEWS.MAP)}>
          <span className="footer-badge-icon">{"\uD83D\uDDFA"}</span>
          <span className="footer-badge-label">See event reach</span>
        </button>
        <div className="footer-badge">
          <img src="/qr-code.png" alt="Scan to sign up on your phone" className="qr-img" />
          <span className="footer-badge-label">Scan to use<br />your phone</span>
        </div>
      </div>
    </div>
  );
}
