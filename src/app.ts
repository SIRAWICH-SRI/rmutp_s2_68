import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const app = new Hono();

// helper base64 encode/decode
const b64 = {
  enc: (s: string) => Buffer.from(s, "utf-8").toString("base64"),
  dec: (s: string) => Buffer.from(s, "base64").toString("utf-8"),
};

// ✅ GET /profile (ดึงทั้งหมด + decode ก่อนส่ง)
app.get("/profile", async (c) => {
  const profiles = await prisma.profile.findMany();
  const data = profiles.map((p) => ({
    ...p,
    mobile: p.mobile ? b64.dec(p.mobile) : null,
    cardId: p.cardId ? b64.dec(p.cardId) : null,
    password: undefined,
  }));
  return c.json({ message: "get all complete", data }, 200);
});

// ✅ GET /profile/:id (ดึงรายคน + decode ก่อนส่ง)
app.get("/profile/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ message: "invalid id" }, 400);

  const profile = await prisma.profile.findUnique({ where: { id } });
  if (!profile) return c.json({ message: "profile not found" }, 404);

  const data = {
    ...profile,
    mobile: profile.mobile ? b64.dec(profile.mobile) : null,
    cardId: profile.cardId ? b64.dec(profile.cardId) : null,
    password: undefined,
  };

  return c.json({ message: "get one complete", data }, 200);
});

// ✅ POST /profile (encode ก่อนเก็บ)
app.post("/profile", async (c) => {
  try {
    const body = await c.req.json();

    if (!body.username || !body.password) {
      return c.json({ message: "username & password required" }, 400);
    }
    if (!/^\d{10}$/.test(body.mobile)) {
      return c.json({ message: "mobile must be 10 digits" }, 400);
    }
    if (!/^\d{13}$/.test(body.cardId)) {
      return c.json({ message: "cardId must be 13 digits" }, 400);
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    const created = await prisma.profile.create({
      data: {
        username: body.username,
        password: hashedPassword,
        mobile: b64.enc(body.mobile),   // 👉 encode ก่อนเก็บ
        cardId: b64.enc(body.cardId),   // 👉 encode ก่อนเก็บ
      },
    });

    return c.json({ message: "create complete", data: { ...created, password: undefined } }, 201);
  } catch (e: any) {
    return c.json({ message: "server error", error: e.message }, 500);
  }
});

export default app;
