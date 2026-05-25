(function (root) {
  function getBookIdentityKey(book) {
    return book && (book._id || book.externalId || book.fileUrl || book.title);
  }

  function mergeStashBooks(apiBooks, localBooks) {
    const seen = new Set();
    return [...(apiBooks || []), ...(localBooks || [])].filter((book) => {
      const key = getBookIdentityKey(book);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getInitialView(hasToken, isTokenValid) {
    if (!hasToken) return "login";
    return isTokenValid ? "search" : "login";
  }

  function getNavigationTarget(source) {
    const allowed = ["featured", "new-releases", "search-results", "summary-modal", "stash"];
    return allowed.includes(source) ? "book-details.html" : "book-details.html";
  }

  const api = { mergeStashBooks, getInitialView, getNavigationTarget };
  root.StateHelpers = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : global);
