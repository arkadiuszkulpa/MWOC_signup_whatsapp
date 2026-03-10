import React, { useState, useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/leaflet.markercluster.js";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { getPostcodeCounts } from "../services/api";
import postcodeCoords from "../data/postcodeCoordinates.json";

export default function ParticipantMap({ onBack }) {
  const [postcodeCounts, setPostcodeCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getPostcodeCounts();
        setPostcodeCounts(data.postcodes || {});
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const markerData = useMemo(() => {
    return Object.entries(postcodeCounts)
      .filter(([code]) => postcodeCoords[code])
      .map(([code, count]) => ({
        code,
        count,
        lat: postcodeCoords[code].lat,
        lng: postcodeCoords[code].lng,
      }));
  }, [postcodeCounts]);

  const totalMapped = markerData.reduce((sum, d) => sum + d.count, 0);

  // Initialize map after data is loaded and container is in DOM
  useEffect(() => {
    if (loading || error || !mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [54.5, -2.5],
      zoom: 6,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    const cluster = L.markerClusterGroup({
      iconCreateFunction: (clusterObj) => {
        const count = clusterObj.getChildCount();
        return L.divIcon({
          html: `<div>${count}</div>`,
          className: "mwoc-cluster-icon",
          iconSize: L.point(40, 40),
        });
      },
    });

    for (const { code, count, lat, lng } of markerData) {
      const marker = L.circleMarker([lat, lng], {
        radius: Math.min(8 + count * 2, 20),
        color: "#e0a526",
        fillColor: "#e0a526",
        fillOpacity: 0.7,
        weight: 1,
      });
      marker.bindTooltip(`<strong>${code}</strong>: ${count} participant${count !== 1 ? "s" : ""}`);
      cluster.addLayer(marker);
    }

    map.addLayer(cluster);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [loading, error, markerData]);

  if (loading) {
    return <div className="loading"><span className="spinner" /> Loading map data...</div>;
  }

  if (error) {
    return (
      <div>
        <div className="error-message">{error}</div>
        <button className="btn btn-secondary" onClick={onBack}>Back</button>
      </div>
    );
  }

  return (
    <div className="map-view">
      <div className="map-header">
        <button className="btn btn-secondary map-back-btn" onClick={onBack}>
          ← Back
        </button>
        <div className="map-stats">
          {totalMapped} participant{totalMapped !== 1 ? "s" : ""} mapped from {markerData.length} area{markerData.length !== 1 ? "s" : ""}
        </div>
      </div>
      <div className="map-container">
        <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
      </div>
    </div>
  );
}
