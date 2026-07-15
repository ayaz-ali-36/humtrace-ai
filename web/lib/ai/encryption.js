import crypto from "crypto";

function encryptionKey() {
  const value = process.env.HUMTRACE_EMBEDDING_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error("EMBEDDING_KEY_INVALID");
  return Buffer.from(value, "hex");
}

function vectorBuffer(vector) {
  const buffer = Buffer.alloc(vector.length * 4);
  vector.forEach((value, index) => buffer.writeFloatLE(Number(value), index * 4));
  return buffer;
}

export function encryptVector(vector) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(vectorBuffer(vector)), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag() };
}

export function decryptVector(record) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(record.iv));
  decipher.setAuthTag(Buffer.from(record.authTag));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(record.ciphertext)), decipher.final()]);
  if (plaintext.length !== record.dimensions * 4) throw new Error("EMBEDDING_DIMENSION_MISMATCH");
  const vector = [];
  for (let offset = 0; offset < plaintext.length; offset += 4) vector.push(plaintext.readFloatLE(offset));
  return vector;
}
