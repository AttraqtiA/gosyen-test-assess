import { randomBytes } from "crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateSessionCode() {
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}
