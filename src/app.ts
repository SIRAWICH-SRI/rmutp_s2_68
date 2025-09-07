import { Hono } from "hono"; 
import { PrismaClient } from "@prisma/client"; 

const prisma = new PrismaClient();

const app = new Hono(); 

app.get("/profile/:id", async (c) => {
  const id = c.req.param("id"); // <-- string

  if (!id) {
    return c.json({ message: "invalid id" }, 400);
  }

  const profile = await prisma.profile.findUnique({ where: { id } });
  if (!profile) {
    return c.json({ message: "profile not found" }, 404);
  }
  return c.json({ message: "get one complete", data: profile }, 200);
});

app.post("/profile", async (c) => {
  try {
    const body = await c.req.json();
     console.log("POST /profile body:", body);
    };

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

    const created = await prisma.profile.create({
      data: {
        username: body.username,
        password: body.password,
        mobile: body.mobile,
        cardId: body.cardId,
      },
    });

    return c.json({ message: "create complete", data: created }, 201);
  } catch (e: any) {
    if (e?.code === "P2002") {
      return c.json({ message: `duplicate field(s): ${e.meta?.target?.join(", ")}` }, 409);
    }
    return c.json({ message: "invalid JSON or server error" }, 400);
  }
});



