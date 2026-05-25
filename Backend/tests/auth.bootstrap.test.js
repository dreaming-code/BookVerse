const express = require("express");
const request = require("supertest");

describe("auth bootstrap endpoint", () => {
  test("GET /api/auth/me returns 401 without token", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/auth", require("../routes/auth"));
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
