const { mergeStashBooks, getInitialView, getNavigationTarget } = require("../public/state-helpers");

describe("state helper behavior", () => {
  test("auth bootstrap behavior resolves correctly", () => {
    expect(getInitialView(false, false)).toBe("login");
    expect(getInitialView(true, true)).toBe("search");
    expect(getInitialView(true, false)).toBe("login");
  });

  test("stash merge logic deduplicates api + local books", () => {
    const api = [{ _id: "1", title: "A" }, { _id: "2", title: "B" }];
    const local = [{ _id: "2", title: "B duplicate" }, { externalId: "x-9", title: "X" }];
    const merged = mergeStashBooks(api, local);
    expect(merged).toHaveLength(3);
    expect(merged.map((b) => b.title)).toEqual(["A", "B", "X"]);
  });

  test("navigation consistency from all sections uses same target", () => {
    const sources = ["featured", "new-releases", "search-results", "summary-modal", "stash"];
    for (const source of sources) {
      expect(getNavigationTarget(source)).toBe("book-details.html");
    }
  });
});
