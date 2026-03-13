import React, { useState, useEffect } from "react";
import { getEventStats } from "../services/api";

// Change this to today's date (YYYY-MM-DD) to test event-day mode
const EVENT_DATE = "2026-03-20";

export default function EventStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getEventStats();
        setStats(data);
      } catch {
        // Silently fail — stats are non-critical
      }
    })();
  }, []);

  if (!stats || stats.totalCheckedIn2026 === 0) return null;

  const today = new Date().toISOString().slice(0, 10);
  const isEventDay = today === EVENT_DATE;

  return (
    <div className="event-stats">
      <div className="event-stat">
        <span className="event-stat-number">{stats.totalCheckedIn2026}</span> signed up for 2026
      </div>
      {isEventDay && (
        <div className="event-stat">
          <span className="event-stat-number">{stats.checkedInToday}</span> / {stats.totalCheckedIn2026} checked in today
        </div>
      )}
    </div>
  );
}
