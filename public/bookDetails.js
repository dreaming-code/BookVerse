const ACTIVE_BOOK_KEY = "activeBook";
  const ACTIVE_BOOK_SOURCE_KEY = "activeBookSource";
  const API_BASE = window.location.origin;

  let cachedUserBooks = {
    favourites: [],
    continueReading: []
  };

  // =========================
  // GET CURRENT USER
  // =========================
  function getCurrentUserEmail() {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const libraryUser = JSON.parse(localStorage.getItem("user"));

    return currentUser?.email || libraryUser?.email || null;
  }

  // =========================
  // FETCH USER BOOKS
  // =========================
  async function fetchUserBooks() {
    const email = getCurrentUserEmail();

    if (!email) {
      cachedUserBooks = {
        favourites: [],
        continueReading: []
      };

      return cachedUserBooks;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/user-books?email=${encodeURIComponent(email)}`
      );

      if (res.ok) {
        cachedUserBooks = await res.json();
      }

      return cachedUserBooks;
    } catch (err) {
      console.error("Error fetching user books:", err);
      return cachedUserBooks;
    }
  }

  // =========================
  // HELPERS
  // =========================
  function getFavorites() {
      return (cachedUserBooks.favourites || []).filter(b => b.isVisible !== false);
    }

    function getRecentBooks() {
      return (cachedUserBooks.continueReading || []).filter(b => b.isVisible !== false);
    }

  function triggerUserBooksUpdate() {
    localStorage.setItem(
      "userBooksUpdated",
      Date.now().toString()
    );

    localStorage.removeItem("userBooksUpdated");
  }

  function getBookUniqueKey(book) {
    return ( book.fileUrl || book.title || book._id || JSON.stringify(book)
    );
  }

  // =========================
  // FAVORITES API
  // =========================
  async function toggleIsVisible(book, section) {
  const email = getCurrentUserEmail();
  if (!email) return;

  try {
    const res = await fetch(`${API_BASE}/api/user-books/toggle-visible`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, book, section })
    });

    if (res.ok) {
      cachedUserBooks = await res.json();
      console.log("Updated cachedUserBooks:", cachedUserBooks);
      triggerUserBooksUpdate();
    }
  } catch (err) {
    console.error("Error toggling isVisible:", err);
  }
}
  async function saveFavorites(book, action) {
  const email = getCurrentUserEmail();
  if (!email) return;

  try {
    const res = await fetch(`${API_BASE}/api/user-books/favourites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, book, action })
    });

    if (res.ok) {
      cachedUserBooks = await res.json();
      triggerUserBooksUpdate();
    }
  } catch (err) {
    console.error("Error saving favorites:", err);
  }
}

  async function toggleFavorite(book) {
    const key = getBookUniqueKey(book);
console.log("Toggling favorite for book with key:", book);
    const current = getFavorites();

    const exists = current.some(
      b => getBookUniqueKey(b) === key);
let likeBtn = document.getElementById("likeBtn");
    const action = exists ? "remove" : "add";
console.log("book action : ", action, likeBtn);
if(action==="remove" && likeBtn.textContent === "♥ Liked")
{
  console.log("removing from favorites");
  likeBtn.textContent = "♡ Like";
  await toggleIsVisible(book, "favourites");
}
else{
  likeBtn.textContent="♥ Liked";
  await saveFavorites(book, "add");
}
    return !exists;
  }

  function isFavorite(book) {
    const key = getBookUniqueKey(book);

    return getFavorites().some(
      b => getBookUniqueKey(b) === key
    );
  }

  // =========================
  // CONTINUE READING API
  // =========================
  async function saveBookForContinueReading(
    book,
    source = "catalog",
    action = "add"
  ) {
    const email = getCurrentUserEmail();

    if (!email) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/user-books/continue-reading`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            book,
            source,
            action
          })
        }
      );
console.log("Saving book for continue reading with action:", action, "and source:", source);
      if (res.ok) {
        cachedUserBooks = await res.json();
        triggerUserBooksUpdate();
      }
    } catch (err) {
      console.error(
        "Error saving continue reading:",
        err
      );
    }

    localStorage.setItem(
      ACTIVE_BOOK_KEY,
      JSON.stringify({
        ...book,
        lastOpenedAt: Date.now()
      })
    );

    localStorage.setItem(
      ACTIVE_BOOK_SOURCE_KEY,
      source
    );
  }

  async function toggleContinueReading(book,source = "catalog") {
    const key = getBookUniqueKey(book);

    const current = getRecentBooks();

    const exists = current.some(
      b => getBookUniqueKey(b) === key
    );
const stashBtn = document.getElementById("stashBtn");
    const action = exists ? "remove" : "add";
    console.log("book action : ", action, stashBtn);
if(action==="remove" && stashBtn.textContent === "Remove from Continue Reading")
{    
  console.log("removing from continue reading");
  stashBtn.textContent = "Add to Continue Reading";
  await toggleIsVisible(book, "continueReading");
}
else{
  stashBtn.textContent="Remove from Continue Reading";
  await saveBookForContinueReading(book,source,"add");
}
    return !exists;
  }

  function isInContinueReading(book) {
    const key = getBookUniqueKey(book);

    return getRecentBooks().some(
      b => getBookUniqueKey(b) === key
    );
  }

  // =========================
  // UI HELPERS
  // =========================
  function setText(id, value) {
    const el = document.getElementById(id);

    if (el) {
      el.textContent = value;
    }
  }

  function render(book, source) {
    const title = book.title || "Untitled";

    const author =
      book.author || "Unknown Author";

    const genre = book.genre || "General";

    const coverUrl =
      book.coverUrl ||
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop";

    const description =
      book.description ||
      "No description available.";

    const sourceText = source
      ? `Opened from: ${source}`
      : "";

    setText("title", title);

    setText("author", `Author: ${author}`);

    setText("genre", `Genre: ${genre}`);

    setText("description", description);

    setText("sourceText", sourceText);

    document.getElementById("cover").src =
      coverUrl;

    const lastOpened = book.lastOpenedAt
      ? new Date(book.lastOpenedAt).toLocaleString()
      : null;

    if (lastOpened) {
      setText(
        "resumeText",
        `Last opened: ${lastOpened}`
      );
    }
  }

  // =========================
  // PAGE LOAD
  // =========================
  document.addEventListener(
    "DOMContentLoaded",
    async () => {

      // Fetch latest user books
      await fetchUserBooks();

      // Listen for updates
      window.addEventListener(
        "storage",
        async (e) => {

          if (
            [
              "token",
              "user",
              "currentUser",
              "userBooksUpdated"
            ].includes(e.key)
          ) {

            await fetchUserBooks();

            updateStashButton();
            updateLikeButton();
          }
        }
      );

      const active =
        localStorage.getItem(ACTIVE_BOOK_KEY);

      const selectedBook =
        localStorage.getItem("selectedBook");

      const source =
        localStorage.getItem(
          ACTIVE_BOOK_SOURCE_KEY
        ) || "dashboard";

      let book;

      if (selectedBook) {

        book = JSON.parse(selectedBook);

        localStorage.removeItem(
          "selectedBook"
        );

      } else if (active) {

        book = JSON.parse(active);

      } else {

        setText(
          "title",
          "No active book"
        );

        setText(
          "description",
          "Go back to library and open a book."
        );

        return;
      }

      render(book, source);

      // =========================
      // BUTTONS
      // =========================
      const stashBtn =
        document.getElementById("stashBtn");

      const likeBtn =
        document.getElementById("likeBtn");

      function updateStashButton() {

        stashBtn.textContent =
          isInContinueReading(book)
            ? "Remove from Continue Reading"
            : "Add to Continue Reading";
      }

      function updateLikeButton() {

        likeBtn.textContent =
          isFavorite(book)
            ? "♥ Liked"
            : "♡ Like";
      }

      // Initial button state
      updateStashButton();
      updateLikeButton();

      // =========================
      // CONTINUE READING CLICK
      // =========================
      stashBtn.addEventListener(
        "click",
        async () => {

          const added =
            await toggleContinueReading(
              book,
              source || "details-page"
            );

         

          setText(
            "resumeText",
            added
              ? "Saved to Continue Reading."
              : "Removed from Continue Reading."
          );
        }
      );

      // =========================
      // START READING CLICK
      // =========================
      document
        .getElementById("startBtn")
        .addEventListener(
          "click",
          async () => {

            await saveBookForContinueReading(
              book,
              source || "reader",
              "add"
            );

            updateStashButton();

            if (
              book.fileUrl &&
              book.fileUrl !== "#"
            ) {

              window.open(
                book.fileUrl,
                "_blank"
              );

            } else {

              window.location.href =
                "reader.html";
            }
          }
        );
console.log("likeBtn:", likeBtn);
      // =========================
      // LIKE CLICK
      // =========================
      likeBtn.addEventListener(
        "click",
        async () => {
console.log("Like button clicked for book:", book);
          await toggleFavorite(book,"favourites");
        }
      );
    }
  );