import { defineFunction, secret } from "@aws-amplify/backend";

export const mailchimpSyncFunction = defineFunction({
  name: "mailchimp-sync",
  runtime: 18,
  memoryMB: 256,
  timeoutSeconds: 120,
  entry: "./handler.js",
  schedule: "cron(0 2 * * ? *)",
  environment: {
    MAILCHIMP_SERVER_PREFIX: "us21",
    MAILCHIMP_API_KEY: secret("MAILCHIMP_API_KEY"),
    MAILCHIMP_LIST_ID: secret("MAILCHIMP_LIST_ID"),
  },
});
