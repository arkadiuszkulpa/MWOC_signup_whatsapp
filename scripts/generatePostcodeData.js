#!/usr/bin/env node

/**
 * One-time script to generate postcode outward code → lat/lng lookup.
 * Fetches from github.com/Gibbs/uk-postcodes (open data, CC-BY-SA).
 *
 * Usage: node scripts/generatePostcodeData.js
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, "..", "src", "data", "postcodeCoordinates.json");
const CSV_URL = "https://raw.githubusercontent.com/Gibbs/uk-postcodes/refs/heads/master/postcodes.csv";

async function main() {
  console.log("Fetching UK outward codes from Gibbs/uk-postcodes...");

  const response = await fetch(CSV_URL);
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

  const csv = await response.text();
  const lines = csv.trim().split("\n");
  const header = lines[0].split(",");

  const postcodeIdx = header.indexOf("postcode");
  const latIdx = header.indexOf("latitude");
  const lngIdx = header.indexOf("longitude");

  const outcodes = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const code = cols[postcodeIdx]?.trim();
    const lat = parseFloat(cols[latIdx]);
    const lng = parseFloat(cols[lngIdx]);

    if (code && !isNaN(lat) && !isNaN(lng)) {
      outcodes[code] = {
        lat: Math.round(lat * 10000) / 10000,
        lng: Math.round(lng * 10000) / 10000,
      };
    }
  }

  const dir = dirname(OUTPUT_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(outcodes, null, 2));
  console.log(`Written ${Object.keys(outcodes).length} outward codes to ${OUTPUT_PATH}`);
}

main().catch(console.error);
