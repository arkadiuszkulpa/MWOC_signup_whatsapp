import { defineFunction } from "@aws-amplify/backend";

export const participantsFunction = defineFunction({
  name: "participants",
  runtime: 18,
  memoryMB: 256,
  timeoutSeconds: 30,
  entry: "./handler.js",
});
