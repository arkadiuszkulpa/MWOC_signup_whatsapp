#!/usr/bin/env node

/**
 * Import Mailchimp contacts into MWOC DynamoDB table.
 *
 * Usage:
 *   1. Export your Mailchimp list as CSV (Audience → All contacts → Export)
 *   2. Run: node scripts/import-mailchimp.js ./mailchimp-export.csv
 *
 * The CSV should have headers: Email Address, First Name, Last Name, Phone
 * (standard Mailchimp export format)
 */

const fs = require("fs");
const path = require("path");

const API_URL = process.env.API_URL || "http://localhost:3001";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: node import-mailchimp.js <path-to-csv>");
    process.exit(1);
  }

  const raw = fs.readFileSync(path.resolve(csvPath), "utf-8");
  const lines = raw.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

  const emailIdx = headers.findIndex((h) => /email/i.test(h));
  const fnameIdx = headers.findIndex((h) => /first.*name/i.test(h));
  const lnameIdx = headers.findIndex((h) => /last.*name/i.test(h));
  const phoneIdx = headers.findIndex((h) => /phone/i.test(h));

  if (emailIdx === -1) {
    console.error("CSV must have an 'Email Address' column");
    process.exit(1);
  }

  const participants = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
    const email = cols[emailIdx];
    if (!email) continue;

    const firstName = fnameIdx >= 0 ? cols[fnameIdx] : "";
    const lastName = lnameIdx >= 0 ? cols[lnameIdx] : "";
    const phone = phoneIdx >= 0 ? cols[phoneIdx] : "";

    participants.push({
      name: `${firstName} ${lastName}`.trim() || email.split("@")[0],
      email,
      phone,
    });
  }

  console.log(`Parsed ${participants.length} contacts from CSV`);

  const response = await fetch(`${API_URL}/participants/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ADMIN_API_KEY },
    body: JSON.stringify({ participants, source: "mailchimp" }),
  });

  const result = await response.json();
  console.log("Import results:", JSON.stringify(result, null, 2));
}

main().catch(console.error);
