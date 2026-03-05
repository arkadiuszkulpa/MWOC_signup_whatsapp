#!/usr/bin/env node

// Imports the cleaned participants JSON into DynamoDB via the API.
//
// Usage:
//   node scripts/import-csv.js <API_URL>
//
// Example:
//   node scripts/import-csv.js https://abc123.execute-api.eu-west-2.amazonaws.com/prod

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const apiUrl = process.argv[2];
if (!apiUrl) {
  console.error("Usage: node scripts/import-csv.js <API_URL>");
  console.error("Example: node scripts/import-csv.js https://abc123.execute-api.eu-west-2.amazonaws.com/prod");
  process.exit(1);
}

const importFile = resolve(__dirname, "../participants/import.json");
const data = JSON.parse(readFileSync(importFile, "utf-8"));

console.log(`Importing ${data.participants.length} participants to ${apiUrl}...`);

const response = await fetch(`${apiUrl}/participants/import`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

const result = await response.json();
console.log("Result:", JSON.stringify(result, null, 2));
