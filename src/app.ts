import { Hono } from "hono";

const app = new Hono();

//operation
//CRUD
app.get("/", (c) => c.text("Hello World"));

export default app;