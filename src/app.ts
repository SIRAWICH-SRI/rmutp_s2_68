import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.text("Hello World 🚀"));
app.get("/profile", (c) => c.text("Profile"));
export default app;
