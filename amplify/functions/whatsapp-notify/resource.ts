import { defineFunction } from "@aws-amplify/backend";

export const whatsappNotifyFunction = defineFunction({
  name: "whatsapp-notify",
  runtime: 18,
  memoryMB: 256,
  timeoutSeconds: 30,
  entry: "./handler.js",
});
