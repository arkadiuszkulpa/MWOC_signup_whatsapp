const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.PARTICIPANTS_TABLE || "mwoc-participants";
const WHATSAPP_GROUP_LINK =
  process.env.WHATSAPP_GROUP_LINK || "https://chat.whatsapp.com/YOUR_GROUP_LINK";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const path = event.path || event.resource;
    const method = event.httpMethod;

    if (path === "/participants/search" && method === "POST") {
      return await searchParticipant(JSON.parse(event.body));
    }
    if (path === "/participants" && method === "POST") {
      return await createParticipant(JSON.parse(event.body));
    }
    if (path === "/participants" && method === "GET") {
      return await listParticipants();
    }
    if (path === "/participants/import" && method === "POST") {
      return await bulkImport(JSON.parse(event.body));
    }

    return response(404, { error: "Not found" });
  } catch (err) {
    console.error("Handler error:", err);
    return response(500, { error: "Internal server error" });
  }
};

// ---------------------------------------------------------------------------
// Search by email, phone, or name — used by the tablet form on arrival
// ---------------------------------------------------------------------------
async function searchParticipant({ query }) {
  if (!query || query.trim().length < 2) {
    return response(400, { error: "Search query must be at least 2 characters" });
  }

  const normalized = query.trim().toLowerCase();
  const results = [];

  // Try email exact match via GSI
  if (normalized.includes("@")) {
    const emailResults = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "email-index",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: { ":email": normalized },
      })
    );
    if (emailResults.Items) results.push(...emailResults.Items);
  }

  // Try phone exact match via GSI (strip non-digits for matching)
  const digitsOnly = normalized.replace(/\D/g, "");
  if (digitsOnly.length >= 7) {
    const phoneResults = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "phone-index",
        KeyConditionExpression: "phone = :phone",
        ExpressionAttributeValues: { ":phone": digitsOnly },
      })
    );
    if (phoneResults.Items) results.push(...phoneResults.Items);
  }

  // Fallback: scan for name match (fine for <500 records)
  if (results.length === 0) {
    const scanResults = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "contains(lowerName, :q)",
        ExpressionAttributeValues: { ":q": normalized },
      })
    );
    if (scanResults.Items) results.push(...scanResults.Items);
  }

  // Deduplicate by participantId
  const unique = [...new Map(results.map((r) => [r.participantId, r])).values()];

  return response(200, {
    found: unique.length > 0,
    participants: unique,
    whatsappGroupLink: WHATSAPP_GROUP_LINK,
  });
}

// ---------------------------------------------------------------------------
// Create a new participant — called when someone signs up on the tablet
// ---------------------------------------------------------------------------
async function createParticipant({ name, email, phone }) {
  if (!name || (!email && !phone)) {
    return response(400, {
      error: "Name is required, plus at least one of email or phone",
    });
  }

  const normalizedEmail = email ? email.trim().toLowerCase() : undefined;
  const normalizedPhone = phone ? phone.replace(/\D/g, "") : undefined;

  // Check for duplicates before creating
  if (normalizedEmail) {
    const existing = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "email-index",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: { ":email": normalizedEmail },
      })
    );
    if (existing.Items && existing.Items.length > 0) {
      return response(409, {
        error: "A participant with this email already exists",
        participant: existing.Items[0],
      });
    }
  }

  if (normalizedPhone) {
    const existing = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "phone-index",
        KeyConditionExpression: "phone = :phone",
        ExpressionAttributeValues: { ":phone": normalizedPhone },
      })
    );
    if (existing.Items && existing.Items.length > 0) {
      return response(409, {
        error: "A participant with this phone already exists",
        participant: existing.Items[0],
      });
    }
  }

  const now = new Date().toISOString();
  const participant = {
    participantId: uuidv4(),
    name: name.trim(),
    lowerName: name.trim().toLowerCase(),
    email: normalizedEmail,
    phone: normalizedPhone,
    inWhatsAppGroup: false,
    inMailchimp: false,
    source: "tablet-signup",
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({ TableName: TABLE_NAME, Item: participant })
  );

  return response(201, {
    participant,
    whatsappGroupLink: WHATSAPP_GROUP_LINK,
    message: "Participant registered successfully",
  });
}

// ---------------------------------------------------------------------------
// List all participants — admin view
// ---------------------------------------------------------------------------
async function listParticipants() {
  const result = await docClient.send(
    new ScanCommand({ TableName: TABLE_NAME })
  );
  return response(200, {
    participants: result.Items || [],
    count: result.Count || 0,
  });
}

// ---------------------------------------------------------------------------
// Bulk import — for seeding from Mailchimp export or WhatsApp contacts
// ---------------------------------------------------------------------------
async function bulkImport({ participants, source }) {
  if (!Array.isArray(participants)) {
    return response(400, { error: "participants must be an array" });
  }

  const results = { created: 0, skipped: 0, errors: [] };
  const now = new Date().toISOString();

  for (const p of participants) {
    try {
      const normalizedEmail = p.email ? p.email.trim().toLowerCase() : undefined;
      const normalizedPhone = p.phone ? p.phone.replace(/\D/g, "") : undefined;

      // Skip if duplicate email
      if (normalizedEmail) {
        const existing = await docClient.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: "email-index",
            KeyConditionExpression: "email = :email",
            ExpressionAttributeValues: { ":email": normalizedEmail },
          })
        );
        if (existing.Items && existing.Items.length > 0) {
          // Update source flags on existing record
          await docClient.send(
            new UpdateCommand({
              TableName: TABLE_NAME,
              Key: { participantId: existing.Items[0].participantId },
              UpdateExpression: `SET ${source === "mailchimp" ? "inMailchimp" : "inWhatsAppGroup"} = :t, updatedAt = :now`,
              ExpressionAttributeValues: { ":t": true, ":now": now },
            })
          );
          results.skipped++;
          continue;
        }
      }

      const item = {
        participantId: uuidv4(),
        name: (p.name || "Unknown").trim(),
        lowerName: (p.name || "unknown").trim().toLowerCase(),
        email: normalizedEmail,
        phone: normalizedPhone,
        inWhatsAppGroup: source === "whatsapp",
        inMailchimp: source === "mailchimp",
        source: source || "import",
        createdAt: now,
        updatedAt: now,
      };

      await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
      results.created++;
    } catch (err) {
      results.errors.push({ name: p.name, error: err.message });
    }
  }

  return response(200, results);
}

function response(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}
