import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const app = new Hono();

// ✅ GET profile by id
app.get("/profile/:id", async (c) => {
  const id = c.req.param("id");

  if (!id) {
    return c.json({ message: "invalid id" }, 400);
  }

  const profile = await prisma.profile.findUnique({ where: { id } });
  if (!profile) {
    return c.json({ message: "profile not found" }, 404);
  }
  return c.json({ message: "get one complete", data: profile }, 200);
});

// ✅ CREATE profile (hash password ก่อนเก็บ)
app.post("/profile", async (c) => {
  try {
    const body = await c.req.json();
    console.log("POST /profile body:", body);

    if (!body.username || typeof body.username !== "string") {
      return c.json({ message: "username is required (string)" }, 400);
    }
    if (!body.password || typeof body.password !== "string") {
      return c.json({ message: "password is required (string)" }, 400);
    }
    if (!body.mobile || !/^\d{10}$/.test(body.mobile)) {
      return c.json({ message: "mobile must be 10 digits" }, 400);
    }
    if (!body.cardId || !/^\d{13}$/.test(body.cardId)) {
      return c.json({ message: "cardId must be 13 digits" }, 400);
    }

    // 👉 hash password ก่อนเก็บ
    const hashedPassword = await bcrypt.hash(body.password, 10);

    const created = await prisma.profile.create({
      data: {
        username: body.username,
        password: hashedPassword,
        mobile: body.mobile,
        cardId: body.cardId,
      },
    });

    return c.json({ message: "create complete", data: created }, 201);
  } catch (e: any) {
    if (e?.code === "P2002") {
      return c.json(
        { message: `duplicate field(s): ${e.meta?.target?.join(", ")}` },
        409
      );
    }
    return c.json({ message: "invalid JSON or server error" }, 400);
  }
});

// ✅ LOGIN (compare password)
app.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;

    if (!username || !password) {
      return c.json({ message: "username and password are required" }, 400);
    }

    const user = await prisma.profile.findUnique({ where: { username } });
    if (!user) {
      return c.json({ message: "user not found" }, 404);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return c.json({ message: "invalid credentials" }, 401);
    }

    return c.json({ message: "login success", userId: user.id }, 200);
  } catch (e) {
    return c.json({ message: "invalid JSON or server error" }, 400);
  }
});

export default app;
