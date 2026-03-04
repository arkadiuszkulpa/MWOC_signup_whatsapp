const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const mailchimp = require("@mailchimp/mailchimp_marketing");
const crypto = require("crypto");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.PARTICIPANTS_TABLE || "mwoc-participants";

// Configure Mailchimp — set these in Lambda environment variables
mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY,
  server: process.env.MAILCHIMP_SERVER_PREFIX, // e.g. "us21"
});

const MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID;

// ---------------------------------------------------------------------------
// Handler: runs on a schedule (EventBridge) or manually via API
// Two-way sync:
//   1. Pull existing Mailchimp members → mark inMailchimp=true in DynamoDB
//   2. Push new DynamoDB participants (with email) → add to Mailchimp list
// ---------------------------------------------------------------------------
exports.handler = async (event) => {
  console.log("Mailchimp sync started", JSON.stringify(event, null, 2));

  const results = {
    pulledFromMailchimp: 0,
    pushedToMailchimp: 0,
    errors: [],
  };

  try {
    // ------ STEP 1: Pull from Mailchimp into DynamoDB ------
    const members = await getAllMailchimpMembers();
    console.log(`Found ${members.length} members in Mailchimp`);

    // Scan all DynamoDB participants
    const dbScan = await docClient.send(
      new ScanCommand({ TableName: TABLE_NAME })
    );
    const dbParticipants = dbScan.Items || [];
    const emailMap = new Map(
      dbParticipants
        .filter((p) => p.email)
        .map((p) => [p.email.toLowerCase(), p])
    );

    // Mark existing DB records as inMailchimp
    for (const member of members) {
      const email = member.email_address.toLowerCase();
      const existing = emailMap.get(email);
      if (existing && !existing.inMailchimp) {
        await docClient.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { participantId: existing.participantId },
            UpdateExpression:
              "SET inMailchimp = :t, updatedAt = :now",
            ExpressionAttributeValues: {
              ":t": true,
              ":now": new Date().toISOString(),
            },
          })
        );
        results.pulledFromMailchimp++;
      }
    }

    // ------ STEP 2: Push new participants to Mailchimp ------
    const mailchimpEmails = new Set(
      members.map((m) => m.email_address.toLowerCase())
    );

    for (const participant of dbParticipants) {
      if (!participant.email) continue;
      if (mailchimpEmails.has(participant.email.toLowerCase())) continue;

      try {
        const nameParts = participant.name.split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        await mailchimp.lists.addListMember(MAILCHIMP_LIST_ID, {
          email_address: participant.email,
          status: "subscribed",
          merge_fields: {
            FNAME: firstName,
            LNAME: lastName,
            PHONE: participant.phone || "",
          },
        });

        // Mark as synced in DynamoDB
        await docClient.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { participantId: participant.participantId },
            UpdateExpression:
              "SET inMailchimp = :t, updatedAt = :now",
            ExpressionAttributeValues: {
              ":t": true,
              ":now": new Date().toISOString(),
            },
          })
        );

        results.pushedToMailchimp++;
      } catch (err) {
        results.errors.push({
          email: participant.email,
          error: err.message,
        });
      }
    }
  } catch (err) {
    console.error("Sync error:", err);
    results.errors.push({ error: err.message });
  }

  console.log("Sync results:", JSON.stringify(results, null, 2));
  return results;
};

// ---------------------------------------------------------------------------
// Paginate through all Mailchimp list members
// ---------------------------------------------------------------------------
async function getAllMailchimpMembers() {
  const allMembers = [];
  let offset = 0;
  const count = 100;

  while (true) {
    const response = await mailchimp.lists.getListMembersInfo(
      MAILCHIMP_LIST_ID,
      { count, offset, status: "subscribed" }
    );
    allMembers.push(...response.members);
    if (allMembers.length >= response.total_items) break;
    offset += count;
  }

  return allMembers;
}
