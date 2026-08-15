import { CalleClient } from "@call-e/calle";

const apiKey = process.env.CALLE_API_KEY;

if (!apiKey) {
  throw new Error("CALLE_API_KEY is not configured.");
}

export const calleClient = new CalleClient({
  apiKey,
});