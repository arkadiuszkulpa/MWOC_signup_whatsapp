import { defineBackend } from "@aws-amplify/backend";
import { participantsFunction } from "./functions/participants/resource";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

const backend = defineBackend({
  participantsFunction,
});

// ---------------------------------------------------------------------------
// DynamoDB Table
// ---------------------------------------------------------------------------
const participantsStack = backend.createStack("ParticipantsStorage");

const participantsTable = new dynamodb.Table(participantsStack, "ParticipantsTable", {
  tableName: `mwoc-participants-${backend.stack.node.id}`,
  partitionKey: { name: "participantId", type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
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
// Grant DynamoDB access + set PARTICIPANTS_TABLE env var
// ---------------------------------------------------------------------------
participantsTable.grantReadWriteData(backend.participantsFunction.resources.lambda);
backend.participantsFunction.addEnvironment("PARTICIPANTS_TABLE", participantsTable.tableName);
// Read ADMIN_API_KEY from environment; set via .env locally or Amplify console for prod
declare const process: { env: Record<string, string | undefined> };
backend.participantsFunction.addEnvironment("ADMIN_API_KEY", process.env.ADMIN_API_KEY || "change-me-in-amplify-env");

// ---------------------------------------------------------------------------
// REST API Gateway
// ---------------------------------------------------------------------------
const apiStack = backend.createStack("MWOCApi");

const corsOptions = {
  allowOrigins: apigateway.Cors.ALL_ORIGINS,
  allowMethods: apigateway.Cors.ALL_METHODS,
  allowHeaders: ["Content-Type", "Authorization"],
};

const api = new apigateway.RestApi(apiStack, "MWOCRestApi", {
  restApiName: "mwoc-api",
  deployOptions: { stageName: "prod" },
  defaultCorsPreflightOptions: corsOptions,
});

// /participants
const participantsResource = api.root.addResource("participants");
const participantsIntegration = new apigateway.LambdaIntegration(
  backend.participantsFunction.resources.lambda
);
participantsResource.addMethod("GET", participantsIntegration);
participantsResource.addMethod("POST", participantsIntegration);
participantsResource.addMethod("PUT", participantsIntegration);

// /participants/postcodes  (public — returns aggregated counts only, no PII)
const postcodesResource = participantsResource.addResource("postcodes");
postcodesResource.addMethod("GET", participantsIntegration);

// /participants/stats  (public — returns check-in counts only, no PII)
const statsResource = participantsResource.addResource("stats");
statsResource.addMethod("GET", participantsIntegration);

// /participants/search
const searchResource = participantsResource.addResource("search");
searchResource.addMethod("POST", participantsIntegration);

// /participants/checkin
const checkinResource = participantsResource.addResource("checkin");
checkinResource.addMethod("POST", participantsIntegration);

// /participants/import
const importResource = participantsResource.addResource("import");
importResource.addMethod("POST", participantsIntegration);

// ---------------------------------------------------------------------------
// Output the API URL
// ---------------------------------------------------------------------------
backend.addOutput({
  custom: {
    apiUrl: api.url,
    participantsTableName: participantsTable.tableName,
  },
});
