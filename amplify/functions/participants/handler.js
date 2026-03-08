import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.PARTICIPANTS_TABLE || "mwoc-participants";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Content-Type": "application/json",
};

export const handler = async (event) => {
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
    if (path === "/participants/checkin" && method === "POST") {
      return await checkinParticipant(JSON.parse(event.body));
    }
    if (path === "/participants" && method === "PUT") {
      return await updateParticipant(JSON.parse(event.body));
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
  });
}

// ---------------------------------------------------------------------------
// Create a new participant — called when someone signs up on the tablet
// ---------------------------------------------------------------------------
async function createParticipant({ name, email, phone, postcode, emergencyName, emergencyPhone }) {
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
    postcode: postcode ? postcode.trim().toUpperCase() : undefined,
    emergencyName: emergencyName ? emergencyName.trim() : undefined,
    emergencyPhone: emergencyPhone ? emergencyPhone.replace(/\D/g, "") : undefined,
    source: "tablet-signup",
    lastCheckedIn: now,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({ TableName: TABLE_NAME, Item: participant })
  );

  return response(201, {
    participant,
    message: "Participant registered successfully",
  });
}

// ---------------------------------------------------------------------------
// Check in a participant — records lastCheckedIn timestamp
// ---------------------------------------------------------------------------
async function checkinParticipant({ participantId }) {
  if (!participantId) {
    return response(400, { error: "participantId is required" });
  }

  const now = new Date().toISOString();
  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { participantId },
      UpdateExpression: "SET lastCheckedIn = :now, updatedAt = :now",
      ExpressionAttributeValues: { ":now": now },
      ReturnValues: "ALL_NEW",
    })
  );

  return response(200, {
    participant: result.Attributes,
    message: "Checked in successfully",
  });
}

// ---------------------------------------------------------------------------
// Update an existing participant — fill in missing details (email/phone)
// ---------------------------------------------------------------------------
async function updateParticipant({ participantId, name, email, phone, postcode, emergencyName, emergencyPhone }) {
  if (!participantId) {
    return response(400, { error: "participantId is required" });
  }

  const updates = [];
  const values = {};
  const now = new Date().toISOString();

  if (name) {
    updates.push("#n = :name, lowerName = :lowerName");
    values[":name"] = name.trim();
    values[":lowerName"] = name.trim().toLowerCase();
  }

  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "email-index",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: { ":email": normalizedEmail },
      })
    );
    if (existing.Items && existing.Items.length > 0 && existing.Items[0].participantId !== participantId) {
      return response(409, { error: "This email is already used by another participant" });
    }
    updates.push("email = :email");
    values[":email"] = normalizedEmail;
  }

  if (phone) {
    const normalizedPhone = phone.replace(/\D/g, "");
    const existing = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "phone-index",
        KeyConditionExpression: "phone = :phone",
        ExpressionAttributeValues: { ":phone": normalizedPhone },
      })
    );
    if (existing.Items && existing.Items.length > 0 && existing.Items[0].participantId !== participantId) {
      return response(409, { error: "This phone is already used by another participant" });
    }
    updates.push("phone = :phone");
    values[":phone"] = normalizedPhone;
  }

  if (postcode) {
    updates.push("postcode = :postcode");
    values[":postcode"] = postcode.trim().toUpperCase();
  }

  if (emergencyName) {
    updates.push("emergencyName = :eName");
    values[":eName"] = emergencyName.trim();
  }

  if (emergencyPhone) {
    updates.push("emergencyPhone = :ePhone");
    values[":ePhone"] = emergencyPhone.replace(/\D/g, "");
  }

  if (updates.length === 0) {
    return response(400, { error: "Nothing to update" });
  }

  updates.push("updatedAt = :now");
  values[":now"] = now;

  const updateParams = {
    TableName: TABLE_NAME,
    Key: { participantId },
    UpdateExpression: `SET ${updates.join(", ")}`,
    ExpressionAttributeValues: values,
    ReturnValues: "ALL_NEW",
  };

  if (name) {
    updateParams.ExpressionAttributeNames = { "#n": "name" };
  }

  const result = await docClient.send(new UpdateCommand(updateParams));

  return response(200, {
    participant: result.Attributes,
    message: "Participant updated successfully",
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
// Bulk import — for seeding from CSV/contacts
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
