import React, { useState, useEffect, useRef, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getPostcodeCounts } from "../services/api";
import postcodeCoords from "../data/postcodeCoordinates.json";

export default function ParticipantMap({ onBack }) {
  const [postcodeCounts, setPostcodeCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

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

  useEffect(() => {
    if (loading || error || !mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          "carto-dark": {
            type: "raster",
            tiles: ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
          },
        },
        layers: [{ id: "carto-dark-layer", type: "raster", source: "carto-dark" }],
      },
      center: [-2.5, 54.5],
      zoom: 5,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-left");

    map.on("load", () => {
      const geojson = {
        type: "FeatureCollection",
        features: markerData.map(({ code, count, lat, lng }) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [lng, lat] },
          properties: { code, count },
        })),
      };

      map.addSource("postcodes", { type: "geojson", data: geojson });

      map.addLayer({
        id: "postcode-circles",
        type: "circle",
        source: "postcodes",
        paint: {
          "circle-radius": ["min", ["+", 6, ["*", ["get", "count"], 2]], 20],
          "circle-color": "#e0a526",
          "circle-opacity": 0.7,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#e0a526",
        },
      });

      map.addLayer({
        id: "postcode-labels",
        type: "symbol",
        source: "postcodes",
        layout: {
          "text-field": ["to-string", ["get", "count"]],
          "text-size": 11,
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#1a1a2e",
          "text-halo-color": "#e0a526",
          "text-halo-width": 0.5,
        },
      });

      map.on("click", "postcode-circles", (e) => {
        const props = e.features[0].properties;
        new maplibregl.Popup({ closeButton: false, offset: 10 })
          .setLngLat(e.lngLat)
          .setHTML(`<strong>${props.code}</strong>: ${props.count} participant${props.count !== 1 ? "s" : ""}`)
          .addTo(map);
      });

      map.on("mouseenter", "postcode-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "postcode-circles", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
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
      <div ref={mapContainerRef} className="map-container" />
    </div>
  );
}
