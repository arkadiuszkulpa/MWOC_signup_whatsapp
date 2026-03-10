#!/usr/bin/env node

/**
 * Import WhatsApp group members into MWOC DynamoDB table.
 *
 * WhatsApp doesn't have a direct export API, so this accepts a simple
 * text file with one contact per line in the format:
 *   Name, +PhoneNumber
 *
 * How to get your WhatsApp group member list:
 *   1. Open group → Group Info → scroll to see members
 *   2. Manually list them, or use WhatsApp Web + browser console:
 *      - Open group info in WhatsApp Web
 *      - In browser console, run:
 *        document.querySelectorAll('[data-testid="group-info-participant-item"]')
 *        to extract names/numbers
 *   3. Save as a text file, one per line: "Name, +353871234567"
 *
 * Usage:
 *   node scripts/import-whatsapp.js ./whatsapp-members.txt
 */

const fs = require("fs");
const path = require("path");

const API_URL = process.env.API_URL || "http://localhost:3001";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node import-whatsapp.js <path-to-txt>");
    process.exit(1);
  }

  const raw = fs.readFileSync(path.resolve(filePath), "utf-8");
  const lines = raw.trim().split("\n").filter((l) => l.trim());

  const participants = lines.map((line) => {
    const parts = line.split(",").map((p) => p.trim());
    const name = parts[0] || "Unknown";
    const phone = (parts[1] || "").replace(/\D/g, "");
    return { name, phone, email: "" };
  });

  console.log(`Parsed ${participants.length} WhatsApp contacts`);

  const response = await fetch(`${API_URL}/participants/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ADMIN_API_KEY },
    body: JSON.stringify({ participants, source: "whatsapp" }),
  });

  const result = await response.json();
  console.log("Import results:", JSON.stringify(result, null, 2));
}

main().catch(console.error);
