import { defineBackend } from "@aws-amplify/backend";
import { participantsFunction } from "./functions/participants/resource";
import { whatsappNotifyFunction } from "./functions/whatsapp-notify/resource";
import { mailchimpSyncFunction } from "./functions/mailchimp-sync/resource";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sns from "aws-cdk-lib/aws-sns";

const backend = defineBackend({
  participantsFunction,
  whatsappNotifyFunction,
  mailchimpSyncFunction,
});

// ---------------------------------------------------------------------------
// DynamoDB Table
// ---------------------------------------------------------------------------
const participantsStack = backend.createStack("ParticipantsStorage");

const participantsTable = new dynamodb.Table(participantsStack, "ParticipantsTable", {
  tableName: `mwoc-participants-${backend.stack.node.id}`,
  partitionKey: { name: "participantId", type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  removalPolicy: backend.stack.node.tryGetContext("isProduction")
    ? undefined // RETAIN in production
    : undefined, // default CDK behavior
});

participantsTable.addGlobalSecondaryIndex({
  indexName: "email-index",
  partitionKey: { name: "email", type: dynamodb.AttributeType.STRING },
  projectionType: dynamodb.ProjectionType.ALL,
});

participantsTable.addGlobalSecondaryIndex({
  indexName: "phone-index",
  partitionKey: { name: "phone", type: dynamodb.AttributeType.STRING },
  projectionType: dynamodb.ProjectionType.ALL,
});

// ---------------------------------------------------------------------------
// Grant DynamoDB access to all 3 functions + set PARTICIPANTS_TABLE env var
// ---------------------------------------------------------------------------
const allFunctions = [
  backend.participantsFunction,
  backend.whatsappNotifyFunction,
  backend.mailchimpSyncFunction,
];

for (const fn of allFunctions) {
  participantsTable.grantReadWriteData(fn.resources.lambda);
  fn.addEnvironment("PARTICIPANTS_TABLE", participantsTable.tableName);
}

// ---------------------------------------------------------------------------
// WhatsApp Notify: grant SNS publish + set env vars
// ---------------------------------------------------------------------------
backend.whatsappNotifyFunction.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ["sns:Publish"],
    resources: ["*"],
  })
);

backend.whatsappNotifyFunction.addEnvironment(
  "WHATSAPP_GROUP_LINK",
  process.env.WHATSAPP_GROUP_LINK || "https://chat.whatsapp.com/YOUR_GROUP_LINK"
);
backend.whatsappNotifyFunction.addEnvironment(
  "WHATSAPP_MODE",
  process.env.WHATSAPP_MODE || "sns"
);

// Participants function also needs the group link
backend.participantsFunction.addEnvironment(
  "WHATSAPP_GROUP_LINK",
  process.env.WHATSAPP_GROUP_LINK || "https://chat.whatsapp.com/YOUR_GROUP_LINK"
);

// ---------------------------------------------------------------------------
// REST API Gateway
// ---------------------------------------------------------------------------
const apiStack = backend.createStack("MWOCApi");

const api = new apigateway.RestApi(apiStack, "MWOCRestApi", {
  restApiName: "mwoc-api",
  deployOptions: { stageName: "prod" },
  defaultCorsPreflightOptions: {
    allowOrigins: apigateway.Cors.ALL_ORIGINS,
    allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  },
});

// /participants
const participantsResource = api.root.addResource("participants");
const participantsIntegration = new apigateway.LambdaIntegration(
  backend.participantsFunction.resources.lambda
);
participantsResource.addMethod("GET", participantsIntegration);
participantsResource.addMethod("POST", participantsIntegration);

// /participants/search
const searchResource = participantsResource.addResource("search");
searchResource.addMethod("POST", participantsIntegration);

// /participants/import
const importResource = participantsResource.addResource("import");
importResource.addMethod("POST", participantsIntegration);

// /notify
const notifyResource = api.root.addResource("notify");
const notifyIntegration = new apigateway.LambdaIntegration(
  backend.whatsappNotifyFunction.resources.lambda
);
notifyResource.addMethod("POST", notifyIntegration);

// ---------------------------------------------------------------------------
// Output the API URL
// ---------------------------------------------------------------------------
backend.addOutput({
  custom: {
    apiUrl: api.url,
    participantsTableName: participantsTable.tableName,
  },
});
