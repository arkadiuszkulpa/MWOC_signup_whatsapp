import React, { useState, useCallback } from "react";
import SearchForm from "./components/SearchForm";
import SearchResults from "./components/SearchResults";
import SignupForm from "./components/SignupForm";
import UpdateDetailsForm from "./components/UpdateDetailsForm";
import DisclaimerScreen from "./components/DisclaimerScreen";
import SuccessScreen from "./components/SuccessScreen";
import { searchParticipant, createParticipant, updateParticipant, checkinParticipant } from "./services/api";
import "./styles/App.css";

// App states: search → results → signup/update → disclaimer → success
const VIEWS = {
  SEARCH: "search",
  RESULTS: "results",
  SIGNUP: "signup",
  UPDATE: "update",
  DISCLAIMER: "disclaimer",
  SUCCESS: "success",
};

export default function App() {
  const [view, setView] = useState(VIEWS.SEARCH);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [isNewSignup, setIsNewSignup] = useState(false);

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
          loading={loading}
        />
      )}

      {view === VIEWS.DISCLAIMER && selectedParticipant && (
        <DisclaimerScreen
          participant={selectedParticipant}
          onAccept={handleAcceptDisclaimer}
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
