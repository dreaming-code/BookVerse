const express = require("express");
const request = require("supertest");

jest.mock("../middleware/authMiddleware", () => {
  return (req, _res, next) => {
    req.user = {
      _id: "u1",
      stash: [{ toString: () => "existing" }],
      progress: [],
      save: jest.fn().mockResolvedValue(undefined)
    };
    next();
  };
});

jest.mock("../models/User", () => ({
  findById: jest.fn().mockReturnValue({
    populate: jest.fn().mockResolvedValue({ stash: [{ _id: "existing", title: "Old Book" }] })
  })
}));

describe("users routes", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/api/users", require("../routes/users"));
  });

  test("GET /api/users/progress/:bookId returns 0 when missing", async () => {
    const res = await request(app).get("/api/users/progress/book-1");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ bookId: "book-1", progress: 0 });
  });

  test("POST /api/users/progress validates payload", async () => {
    const res = await request(app).post("/api/users/progress").send({ bookId: "b1" });
    expect(res.status).toBe(400);
  });
});
