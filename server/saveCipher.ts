import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export class SaveCipher {
  constructor(private readonly key: Buffer) {
    if (key.length !== 32) throw new Error("Save encryption requires a 32-byte key.");
  }

  seal(value: unknown, context: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    cipher.setAAD(Buffer.from(`retro-idle:1:${context}`));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
    return JSON.stringify({
      format: "retro-idle-encrypted",
      version: 1,
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      data: ciphertext.toString("base64"),
    });
  }

  open(raw: string, context: string): unknown {
    if (Buffer.byteLength(raw) > 1_000_000) throw new Error("Save too large.");
    const input = JSON.parse(raw);
    if (!input || input.format !== "retro-idle-encrypted" || input.version !== 1)
      throw new Error("Unsupported encrypted save.");
    const decode = (field: unknown, length?: number) => {
      if (typeof field !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(field))
        throw new Error("Invalid encrypted save.");
      const bytes = Buffer.from(field, "base64");
      if (bytes.toString("base64") !== field || (length !== undefined && bytes.length !== length))
        throw new Error("Invalid encrypted save.");
      return bytes;
    };
    const decipher = createDecipheriv("aes-256-gcm", this.key, decode(input.iv, 12));
    decipher.setAAD(Buffer.from(`retro-idle:1:${context}`));
    decipher.setAuthTag(decode(input.tag, 16));
    return JSON.parse(Buffer.concat([decipher.update(decode(input.data)), decipher.final()]).toString("utf8"));
  }
}
