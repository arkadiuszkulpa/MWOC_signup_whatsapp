const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const snsClient = new SNSClient({});
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = process.env.PARTICIPANTS_TABLE || "mwoc-participants";
const WHATSAPP_GROUP_LINK =
  process.env.WHATSAPP_GROUP_LINK || "https://chat.whatsapp.com/YOUR_GROUP_LINK";

// ---------------------------------------------------------------------------
// Sends a WhatsApp group invite link to a new participant.
//
// Strategy (simplest → most capable):
//
// Option A (default): Amazon SNS SMS
//   - Sends a plain SMS with the group link
//   - No WhatsApp Business account needed
//   - Works immediately, pay-per-message (~$0.01/SMS)
//
// Option B: WhatsApp Business API (via Meta Cloud API)
//   - Requires approved WhatsApp Business account + message template
//   - Set WHATSAPP_MODE=business in environment variables
//   - Set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID
//
// Option C: Twilio WhatsApp
//   - Uses Twilio as intermediary for WhatsApp messaging
//   - Set WHATSAPP_MODE=twilio in environment variables
//   - Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
// ---------------------------------------------------------------------------

exports.handler = async (event) => {
  console.log("WhatsApp notify event:", JSON.stringify(event, null, 2));

  // Can be invoked directly or via API Gateway
  const body = event.body ? JSON.parse(event.body) : event;
  const { participantId, name, phone, email } = body;

  if (!phone && !email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Phone or email required" }),
    };
  }

  const message =
    `Hi ${name}! Welcome to the Men's Way of the Cross.\n\n` +
    `Join our WhatsApp group here:\n${WHATSAPP_GROUP_LINK}\n\n` +
    `God bless!`;

  const mode = process.env.WHATSAPP_MODE || "sns";
  let result;

  switch (mode) {
    case "business":
      result = await sendViaWhatsAppBusiness(phone, message);
      break;
    case "twilio":
      result = await sendViaTwilio(phone, message);
      break;
    default:
      result = await sendViaSNS(phone, message);
  }

  // Mark participant as notified
  if (participantId) {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { participantId },
        UpdateExpression:
          "SET whatsappInviteSent = :t, whatsappInviteSentAt = :now, updatedAt = :now",
        ExpressionAttributeValues: {
          ":t": true,
          ":now": new Date().toISOString(),
        },
      })
    );
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ success: true, mode, result }),
  };
};

// ---------------------------------------------------------------------------
// Option A: Amazon SNS — simple SMS
// ---------------------------------------------------------------------------
async function sendViaSNS(phone, message) {
  if (!phone) throw new Error("Phone number required for SMS");

  const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;

  const result = await snsClient.send(
    new PublishCommand({
      PhoneNumber: formattedPhone,
      Message: message,
      MessageAttributes: {
        "AWS.SNS.SMS.SenderID": {
          DataType: "String",
          StringValue: "MWOC",
        },
        "AWS.SNS.SMS.SMSType": {
          DataType: "String",
          StringValue: "Transactional",
        },
      },
    })
  );

  return { messageId: result.MessageId };
}

// ---------------------------------------------------------------------------
// Option B: WhatsApp Business API (Meta Cloud API)
// Requires a pre-approved message template
// ---------------------------------------------------------------------------
async function sendViaWhatsAppBusiness(phone, message) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    throw new Error("WHATSAPP_TOKEN and WHATSAPP_PHONE_ID must be set");
  }

  const formattedPhone = phone.replace(/\D/g, "");

  // Using the messages endpoint with a text message
  // In production, use a pre-approved template instead
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "text",
        text: { body: message },
      }),
    }
  );

  return await response.json();
}

// ---------------------------------------------------------------------------
// Option C: Twilio WhatsApp
// ---------------------------------------------------------------------------
async function sendViaTwilio(phone, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"

  if (!accountSid || !authToken || !from) {
    throw new Error("Twilio credentials must be set");
  }

  const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
  const params = new URLSearchParams({
    To: `whatsapp:${formattedPhone}`,
    From: from,
    Body: message,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  return await response.json();
}
