import "dotenv/config"; // ให้โหลดค่า .env อัตโนมัติ
import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encode, decode } from "./security";

const prisma = new PrismaClient();
const app = new Hono();

// --------- helper base64 (ใช้กับ /user เดิม) ---------
const b64 = {
  enc: (s: string) => Buffer.from(s, "utf-8").toString("base64"),
  dec: (s: string) => Buffer.from(s, "base64").toString("utf-8"),
};

// smart decode: พยายามถอด AES → ถ้าไม่ใช่ค่อยลอง base64 → ถ้าไม่ใช่คืนค่าเดิม
const smartDec = (v?: string | null) => {
  if (!v) return null;
  try { return decode(v); } 
  catch {
    try { return b64.dec(v); }
    catch { return v; }
  }
};

// ================== ROUTE เดิม (/user) ==================
// ✅ GET /user (ดึงทั้งหมด + smart decode)
app.get("/user", async (c) => {
  const users = await prisma.user.findMany();
  const data = users.map((u) => ({
    ...u,
    mobile: smartDec(u.mobile),
    cardID: smartDec(u.cardID),
    password: undefined,
  }));
  return c.json({ message: "get all complete", data }, 200);
});

// ✅ GET /user/:id (ดึงรายคน + smart decode)
app.get("/user/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ message: "invalid id" }, 400);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return c.json({ message: "user not found" }, 404);

  const data = {
    ...user,
    mobile: smartDec(user.mobile),
    cardID: smartDec(user.cardID),
    password: undefined,
  };

  return c.json({ message: "get one complete", data }, 200);
});

// ✅ POST /user (encode base64 ก่อนเก็บ)
app.post("/user", async (c) => {
  try {
    const body = await c.req.json();

    if (!body.username || !body.password) {
      return c.json({ message: "username & password required" }, 400);
    }
    if (!/^\d{10}$/.test(body.mobile)) {
      return c.json({ message: "mobile must be 10 digits" }, 400);
    }
    if (!/^\d{13}$/.test(body.cardID)) {
      return c.json({ message: "cardID must be 13 digits" }, 400);
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    const created = await prisma.user.create({
      data: {
        username: body.username,
        password: hashedPassword,
        mobile: b64.enc(body.mobile), // base64
        cardID: b64.enc(body.cardID), // base64
      },
    });

    return c.json(
      { message: "create complete", data: { ...created, password: undefined } },
      201
    );
  } catch (e: any) {
    if (e.code === "P2002") {
      return c.json({ message: "duplicate field", meta: e.meta }, 409);
    }
    return c.json({ message: "server error", error: e.message }, 500);
  }
});

// ================== ROUTE ใหม่ตามโจทย์ ==================
// (1) ✅ POST /encode  -> เข้ารหัสด้วย AES ก่อนเก็บ
app.post("/encode", async (c) => {
  try {
    const body = await c.req.json();

    if (!body.username || !body.password) {
      return c.json({ message: "username & password required" }, 400);
    }
    if (!/^\d{10}$/.test(body.mobile)) {
      return c.json({ message: "mobile must be 10 digits" }, 400);
    }
    if (!/^\d{13}$/.test(body.cardID)) {
      return c.json({ message: "cardID must be 13 digits" }, 400);
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    const created = await prisma.user.create({
      data: {
        username: body.username,
        password: hashedPassword,
        mobile: encode(body.mobile), // 👉 AES-256-CBC
        cardID: encode(body.cardID), // 👉 AES-256-CBC
      },
    });

    const safe = { ...created, password: undefined };
    return c.json({ message: "encode (AES) create complete", data: safe }, 201);
  } catch (e: any) {
    if (e.code === "P2002") {
      return c.json({ message: "duplicate field", meta: e.meta }, 409);
    }
    return c.json({ message: "server error", error: e.message }, 500);
  }
});

// (2) ✅ GET /decode/:id -> ถอด AES ก่อนส่ง (fallback base64 ถ้าไม่ใช่ AES)
app.get("/decode/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ message: "invalid id" }, 400);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return c.json({ message: "user not found" }, 404);

  const data = {
    ...user,
    mobile: smartDec(user.mobile),
    cardID: smartDec(user.cardID),
    password: undefined,
  };

  return c.json({ message: "decode (AES) get one complete", data }, 200);
});

export default app;
