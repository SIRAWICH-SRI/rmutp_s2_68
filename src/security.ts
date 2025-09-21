import crypto from "crypto";

// โหลดค่า key/iv จาก .env
// ENC_KEY = 32 bytes, ENC_IV = 16 bytes
const KEY = Buffer.from(process.env.ENC_KEY || "12345678901234567890123456789012", "utf-8");
const IV  = Buffer.from(process.env.ENC_IV  || "1234567890123456", "utf-8");

// ✅ เข้ารหัส AES-256-CBC
export const encode = (plain: string): string => {
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, IV);
  let out = cipher.update(plain, "utf8", "base64");
  out += cipher.final("base64");
  return out;
};

// ✅ ถอดรหัส AES-256-CBC
export const decode = (cipherText: string): string => {
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, IV);
  let out = decipher.update(cipherText, "base64", "utf8");
  out += decipher.final("utf8");
  return out;
};

export default { encode, decode };
