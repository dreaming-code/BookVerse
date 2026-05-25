ACTIVE_BOOK_KEY = "activeBook"; 
const ACTIVE_BOOK_SOURCE_KEY = "activeBookSource"; 
const API_BASE = window.location.origin;

// ===== Genre Filter for Popular Books =====
const genreSelect = document.getElementById("genreSelect");
const bookGrid = document.getElementById("bookGrid");
const allBooks = bookGrid.querySelectorAll(".book");

genreSelect.addEventListener("change", () => {
  const selected = genreSelect.value;
  allBooks.forEach(book => {
    const genre = book.dataset.genre;
    book.style.display = (selected === "all" || genre === selected) ? "block" : "none";
  });
});

// --- Backend API base URL ---
 // same server
let token = localStorage.getItem("token") || null;
const booksCache = new Map();
const searchResultCache = new Map();
const BOOKS_CACHE_TTL_MS = 60 * 1000;
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;

// =========================
// USER-SPECIFIC HELPERS
// =========================
function getCurrentUserEmail() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const libraryUser = JSON.parse(localStorage.getItem("user"));
  return currentUser?.email || libraryUser?.email || null;
}

function getCurrentUserId() {
  const email = getCurrentUserEmail();
  return email ? `user_${email.replace(/[^a-zA-Z0-9]/g, "_")}` : "anonymous";
}


let cachedUserBooks = {
  favourites: [],
  continueReading: []
};

async function fetchUserBooks() {
  const email = getCurrentUserEmail();
  if (!email) {
    return { favourites: [], continueReading: [] };
  }

  try {
    const res = await fetch(`${API_BASE}/api/user-books?email=${encodeURIComponent(email)}`);
    if (res.ok) {
      cachedUserBooks = await res.json();
    }
    return cachedUserBooks;
  } catch (err) {
    console.error("Error fetching user books:", err);
    return cachedUserBooks;
  }
}

function getFavorites() {
  return (cachedUserBooks.favourites || []).filter(b => b.isVisible !== false);
}

function getRecentBooks() {
  return (cachedUserBooks.continueReading || []).filter(b => b.isVisible !== false);
}

function openAllSections(){
  window.location.href = "library.html#map";
  document.querySelectorAll(".hide").forEach(el => el.classList.remove("hide"));
  document.getElementById("admin").classList.add("hide");
  document.getElementById("signUp").classList.add("hide");
  document.getElementById("login").classList.add("hide");
   document.getElementById("list_books_stash").style.display = "flex";
  document.getElementById("list_books_rel").style.display = "flex";
  document.getElementById("list_books_fav").style.display = "flex";
  document.getElementById("list_books").style.display = "flex";
}

function triggerUserBooksUpdate() {
  localStorage.setItem("userBooksUpdated", Date.now().toString());
  localStorage.removeItem("userBooksUpdated");
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
      refreshAllSections();
      triggerUserBooksUpdate();
    }
  } catch (err) {
    console.error("Error saving favorites:", err);
  }
}

async function toggleIsVisible(book, section = "favourites") {
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
      refreshAllSections();
      triggerUserBooksUpdate();
    }
  } catch (err) {
    console.error("Error toggling isVisible:", err);
  }
}

async function saveBookForContinueReading(book, source = "catalog") {
  const email = getCurrentUserEmail();
  
  const normalized = normalizeBookForState(book);
  const uniqueKey = normalized._id || normalized.externalId || normalized.fileUrl || normalized.title;
  
  if (email) {
    try {
      const res = await fetch(`${API_BASE}/api/user-books/continue-reading`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, book: normalized, source })
      });
      
      if (res.ok) {
        cachedUserBooks = await res.json();
        refreshAllSections();
        triggerUserBooksUpdate();
      }
    } catch (err) {
      console.error("Error saving continue reading:", err);
    }
  }

  localStorage.setItem(ACTIVE_BOOK_KEY, JSON.stringify({ ...normalized, lastOpenedAt: Date.now() }));
  localStorage.setItem(ACTIVE_BOOK_SOURCE_KEY, source);
}

async function timedFetch(url, options = {}, label = "request") {
  const start = performance.now();
  const response = await fetch(url, options);
  const elapsed = Math.round(performance.now() - start);
  console.log(`[perf] ${label} ${elapsed}ms`);
  return response;
}

async function fetchJsonWithCache(url, ttlMs, options = {}, label = "request") {
  const cacheKey = `${url}::${JSON.stringify(options)}`;
  const cached = booksCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const res = await timedFetch(url, options, label);
  if (!res.ok) throw new Error(`Failed request: ${res.status}`);
  const data = await res.json();
  booksCache.set(cacheKey, { data, expiresAt: Date.now() + ttlMs });
  return data;
}

function getSection(id) {
  return document.getElementById(id);
}

function showSection(id, shouldShow) {
  const section = getSection(id);
  if (!section) return;
  section.style.display = shouldShow ? "flex" : "none";
}

function showSearchView() {
  showSection("login", true);
  showSection("signUp", true);
  const mapSection = getSection("map");
  if (mapSection) {
    mapSection.style.display = "";
    mapSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function showLoginView() {
  showSection("login", true);
  showSection("signUp", false);
  showSection("map", false);
}

function open_signup() {
  showSection("login", false);
  showSection("signUp", true);
}

function open_signin() {
  showSection("signUp", false);
  showSection("login", true);
}

window.open_signup = open_signup;
window.open_signin = open_signin;

function getActiveBook() {
  try {
    const raw = localStorage.getItem(ACTIVE_BOOK_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function normalizeBookForState(book) {
  const coverUrl = book.coverUrl || "";
  return {
    _id: book._id || null,
    externalId: book.externalId || null,
    title: book.title || "Untitled",
    author: book.author || "Unknown Author",
    genre: book.genre || "General",
    coverUrl: coverUrl && coverUrl !== "" ? coverUrl : "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop",
    fileUrl: book.fileUrl || "#",
    description: book.description || ""
  };
}

async function openBookDetails(book, source = "catalog") {
  // Check authentication via router if available
  if (window.BookVerseRouter && !window.BookVerseRouter.isAuthenticated()) {
    window.BookVerseRouter.handleBookClick(book, source);
    return;
  }
  
  // Just set active book in localStorage for details page
  const normalized = normalizeBookForState(book);
  localStorage.setItem(ACTIVE_BOOK_KEY, JSON.stringify({ ...normalized, lastOpenedAt: Date.now() }));
  localStorage.setItem(ACTIVE_BOOK_SOURCE_KEY, source);
  
  const target = window.StateHelpers
    ? window.StateHelpers.getNavigationTarget(source)
    : "book-details.html";
  window.location.href = target;
}

async function openReader(book) {
  await saveBookForContinueReading(book, "reader");
  window.location.href = "reader.html";
}

function mapApiBookToViewModel(b) {
  const coverUrl = b.coverUrl || b.formats?.["image/jpeg"] || "";
  return {
    _id: b._id || null,
    externalId: b.id ? `gutendex-${b.id}` : null,
    title: b.title || "Untitled",
    author: Array.isArray(b.author)
      ? b.author.join(", ")
      : b.author || (Array.isArray(b.authors) ? b.authors.map((a) => a.name).join(", ") : "Unknown Author"),
    genre: Array.isArray(b.genre) ? b.genre[0] : b.genre || "General",
    coverUrl: coverUrl && coverUrl !== "" ? coverUrl : "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop",
    fileUrl: b.fileUrl || b.formats?.["text/html"] || `https://www.gutenberg.org/ebooks/${b.id || ""}`,
    description: Array.isArray(b.description) ? b.description.join(" ") : (b.description || "")
  };
}

function renderFavoritesSection() {
  const favoritesHeader = document.getElementById("fav");
  const favoritesSection = document.getElementById("list_books_fav");

  if (!favoritesHeader || !favoritesSection) return;

  const favorites = getFavorites();

  if (favorites.length === 0) {
    favoritesHeader.classList.add("hide");
    favoritesSection.classList.add("hide");
    return;
  }

  favoritesHeader.classList.remove("hide");
  favoritesSection.classList.remove("hide");

  renderBooks("#list_books_fav", favorites, "book-fav");
}

function renderContinueReadingSection() {
  const continueHeader = document.getElementById("stash");
  const continueSection = document.getElementById("list_books_stash");

  if (!continueHeader || !continueSection) return;

  const continueBooks = getRecentBooks();

  if (continueBooks.length === 0) {
    continueHeader.classList.add("hide");
    continueSection.classList.add("hide");
    return;
  }

  continueHeader.classList.remove("hide");
  continueSection.classList.remove("hide");

  renderBooks("#list_books_stash", continueBooks, "book-stash");
}

// ============================ AUTH ============================

// --- Handle Google OAuth Callback ---
async function handleGoogleCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const auth = urlParams.get("auth");
  const tokenParam = urlParams.get("token");
  const userParam = urlParams.get("user");
  
  if (auth === "google" && tokenParam && userParam) {
    try {
      const user = JSON.parse(decodeURIComponent(userParam));
      localStorage.setItem("token", decodeURIComponent(tokenParam));
      localStorage.setItem("user", JSON.stringify(user));
      window.dispatchEvent(new Event("storage"));
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          name: user.name,
          email: user.email,
          role: user.admin === "Y" ? "admin" : "user",
          admin: user.admin
        })
      );
      token = decodeURIComponent(tokenParam);
      
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
      
     alert("Signed in with Google successfully!");

// update UI exactly like normal login
openAllSections();

await fetchUserBooks();
refreshAllSections();
loadBooks();

// Redirect after state is ready
setTimeout(() => {
  if (user.admin === "Y") {
    window.location.href = "admin-dashboard.html";
  } else {
    window.location.href = "user-dashboard.html";
  }
}, 500);
    } catch (err) {
      console.error("Error handling Google callback:", err);
    }
  }
}

// --- Handle Sign Up ---
document.querySelectorAll("#signUp form").forEach(form => {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.querySelector("input[placeholder='Username']").value;
    const email = form.querySelector("input[placeholder='Email']").value;
    const password = form.querySelectorAll("input[placeholder='Password']")[0].value;
    const confirm = form.querySelectorAll("input[placeholder='Password']")[1].value;
    if (password !== confirm) return alert("Passwords do not match");

    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          name: data.user.name,
          email: data.user.email,
          role: data.user.admin === "Y" ? "admin" : "user",
          admin: data.user.admin
        })
      );
      token = data.token;
      alert("Sign Up successful!");
      openAllSections();
      // Sign up always logs in as user
      window.location.href = "user-dashboard.html";
    } else {
      alert(data.msg || "Error signing up");
    }
  });
});

// --- Handle Sign In ---
document.querySelectorAll("#login form").forEach(form => {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const usernameOrEmail = form.querySelector("input[placeholder='Username']").value;
    const password = form.querySelector("input[placeholder='Password']").value;
    const adminInput = form.querySelector("input[placeholder='Y for yes or N for no']").value;

    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: usernameOrEmail, password, admin: adminInput.toUpperCase() })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          name: data.user.name,
          email: data.user.email,
          role: data.user.admin === "Y" ? "admin" : "user",
          admin: data.user.admin
        })
      );
      token = data.token;
      alert("Sign In successful!");
      openAllSections();
      // Redirect to appropriate dashboard
      if (data.user.admin === "Y") {
        window.location.href = "admin-dashboard.html";
      } else {
        window.location.href = "user-dashboard.html";
      }
    } else {
      alert(data.msg || "Error signing in");
    }
  });
});

document.getElementById("linky1")?.addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("login").classList.add("hide");
document.getElementById("login").style.display = "none";

document.getElementById("signUp").classList.remove("hide");
document.getElementById("signUp").style.display = "flex";
  document.getElementById("signUp").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.getElementById("linky2")?.addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("signUp").classList.add("hide");
  document.getElementById("signUp").style.display = "none";

  document.getElementById("login").classList.remove("hide");
  document.getElementById("login").style.display = "flex";
  document.getElementById("login").scrollIntoView({ behavior: "smooth", block: "start" });
});

// ============================ BOOKS ============================

async function loadBooks() {
  const start = performance.now();
  try {
    showSkeletonLoaders();
    // Run independent API requests in parallel to reduce total time-to-render.
    const featuredPromise = fetchJsonWithCache(
      `${API_BASE}/api/books?featured=true`,
      BOOKS_CACHE_TTL_MS,
      {},
      "featured-books"
    );
    const releasesPromise = fetchJsonWithCache(
      `${API_BASE}/api/books`,
      BOOKS_CACHE_TTL_MS,
      {},
      "new-releases"
    );
    const stashPromise = token
      ? fetchJsonWithCache(
          `${API_BASE}/api/users/stash`,
          BOOKS_CACHE_TTL_MS,
          { headers: { Authorization: `Bearer ${token}` } },
          "user-stash"
        )
      : Promise.resolve([]);

    const [featuredResult, releasesResult, stashResult] = await Promise.allSettled([
      featuredPromise,
      releasesPromise,
      stashPromise
    ]);

    const featuredBooks = featuredResult.status === "fulfilled" ? featuredResult.value : [];
    const releases = releasesResult.status === "fulfilled" ? releasesResult.value : [];
    const stashBooksFromApi = stashResult.status === "fulfilled" ? stashResult.value : [];
    const localRecentBooks = getRecentBooks();
    const localMapped = localRecentBooks.map(mapApiBookToViewModel);
    const apiMapped = Array.isArray(stashBooksFromApi) ? stashBooksFromApi.map(mapApiBookToViewModel) : [];
    const stashBooks = window.StateHelpers
      ? window.StateHelpers.mergeStashBooks(apiMapped, localMapped)
      : [...apiMapped, ...localMapped];

    // Filter and validate new releases - only show 7 valid books
    const validReleases = filterValidBooks(releases, 7);
    
    // Keep sections populated even if no featured flag is set in DB.
    let featuredToRender = featuredBooks.length > 0 ? featuredBooks : validReleases.slice(0, 7);
    
    // Validate featured books too
    featuredToRender = filterValidBooks(featuredToRender, 7);
    
    // Ensure at least 7 books in featured section (if available)
    if (featuredToRender.length < 7 && validReleases.length > 0) {
      const needed = 7 - featuredToRender.length;
      const additional = validReleases
        .filter(r => !featuredToRender.some(f => f._id === r._id))
        .slice(0, needed);
      featuredToRender = [...featuredToRender, ...additional];
    }

    renderBooks("#list_books", featuredToRender);
    renderBooks("#list_books_rel", validReleases); // Only show 7 valid new releases
    
    // Render stash/continue reading - use router data if available
    let stashBooksToRender = stashBooks;
    if (window.BookVerseRouter) {
      const routerContinueReading = window.BookVerseRouter.getContinueReading();
      if (routerContinueReading && routerContinueReading.length > 0) {
        stashBooksToRender = routerContinueReading.map(mapApiBookToViewModel);
      }
    }
    
    if (Array.isArray(stashBooksToRender) && stashBooksToRender.length > 0) {
      document.getElementById("stash")?.classList.remove("hide");
      document.getElementById("list_books_stash")?.classList.remove("hide");
      renderBooks("#list_books_stash", stashBooksToRender);
    } else {
      document.getElementById("stash")?.classList.add("hide");
      document.getElementById("list_books_stash")?.classList.add("hide");
    }

    if (releases.length > 0) {
      document.getElementById("rel")?.classList.remove("hide");
      document.getElementById("list_books_rel")?.classList.remove("hide");
    }

    if (stashResult.status === "rejected") {
      const msg = String(stashResult.reason?.message || stashResult.reason || "");
      if (msg.includes("401")) {
        localStorage.removeItem("token");
        token = null;
      }
      console.warn("Stash could not be loaded:", stashResult.reason);
    }
  } catch (error) {
    console.error("Error loading books:", error);
  } finally {
    hideSkeletonLoaders();
    console.log(`[perf] loadBooks total ${Math.round(performance.now() - start)}ms`);
  }
}

// --- Add New Book (Admin) ---
document.getElementById("addBookForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const bookData = Object.fromEntries(formData.entries());

  if (bookData.authors) {
    bookData.authors = bookData.authors
      .split(",")
      .map(a => a.trim())
      .filter(a => a);
  }

  const res = await fetch(`${API_BASE}/api/books/add`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  if (res.ok) {
    alert("Book added!");
    e.target.reset();
    booksCache.clear();
    loadBooks();
  } else {
    alert(data.message || "Error adding book");
  }
});

// ============================ STASH ============================

async function add_stashes(b) {
  const token = localStorage.getItem("token");
  if (token) {
    try {
      const res = await fetch(`${API_BASE}/api/users/stash/${b._id}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        console.log("Book added to Continue Reading");
        loadBooks();
      }
    } catch (err) {
      console.error("Error adding to stash", err);
    }
  }
}

function renderSkeletonCards(selector, count = 6) {
  const container = document.querySelector(selector);
  if (!container) return;
  const placeholders = Array.from({ length: count }).map(
    () => `<div class="book skeleton-card"><div class="skeleton-block"></div></div>`
  );
  container.innerHTML = placeholders.join("");
}

function showSkeletonLoaders() {
  renderSkeletonCards("#list_books", 7);
  renderSkeletonCards("#list_books_rel", 7);
  renderSkeletonCards("#list_books_stash", 7);
}

function hideSkeletonLoaders() {
  // Render functions will overwrite skeleton cards when data arrives.
}

// ============================ BOOK DISPLAY ============================

/**
 * Generate a unique book ID from book data
 * Ensures each book has a unique identifier to prevent data mixing
 */
function generateBookId(book) {
  // Use multiple fields to create a unique identifier
  const id = book._id || 
             book.id || 
             book.externalId || 
             (book.fileUrl ? btoa(book.fileUrl).slice(0, 20) : null) ||
             (book.title && book.author ? 
               btoa(book.title + '|' + book.author).slice(0, 20) : null) ||
             `book-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return id;
}

// Get unique key for favorite checking
function getBookUniqueKey(book) {
    return ( book.fileUrl || book.title || book._id || JSON.stringify(book)
    );
  }

/**
 * Validate book data - ensure it has all required fields
 */
function isValidBook(book) {
  const hasTitle = book.title && book.title.trim() !== '';
  const hasAuthor = book.author && book.author.trim() !== '';
  const hasCover = book.coverUrl && book.coverUrl !== '';
  return hasTitle && hasAuthor;
}

/**
 * Filter and validate books - only include complete books, limit to specified count
 */
function filterValidBooks(books, maxCount = 7) {
  if (!Array.isArray(books)) return [];
  
  const validBooks = [];
  const seenIds = new Set();
  
  for (const book of books) {
    const viewBook = mapApiBookToViewModel(book);
    
    // Skip invalid books
    if (!isValidBook(viewBook)) continue;
    
    // Generate unique ID
    const bookId = generateBookId(viewBook);
    
    // Skip duplicates
    if (seenIds.has(bookId)) continue;
    seenIds.add(bookId);
    
    // Store the generated ID
    viewBook._id = viewBook._id || bookId;
    validBooks.push(viewBook);
    
    // Stop when we have enough
    if (validBooks.length >= maxCount) break;
  }
  
  return validBooks;
}

function renderBooks(selector, books, className = "book") {
  const container = document.querySelector(selector);
  if (!container) {
    console.warn(`Missing container for selector: ${selector}`);
    return;
  }
  
  if (!Array.isArray(books) || books.length === 0) {
    container.innerHTML = `<p style="color:#b6c2d9;">No books available right now.</p>`;
    return;
  }

  // Use DocumentFragment for efficient DOM updates
  const fragment = document.createDocumentFragment();
  const favorites = getFavorites(); // Get favorites once outside loop
  const carouselItems = [];

  books.forEach((b) => {
    // Map book to view model
    const viewBook = mapApiBookToViewModel(b);
    
    // Ensure book has a unique ID - CRITICAL to prevent data mixing
    const uniqueId = generateBookId(viewBook);
    viewBook._id = viewBook._id || uniqueId;
    
    // Create book element with unique dataset attributes
    const bookDiv = document.createElement("div");
    bookDiv.classList.add("book", className);
    
    // Set dataset attributes - each book gets its own unique values
    bookDiv.dataset.name = viewBook.title;
    bookDiv.dataset.author = viewBook.author;
    bookDiv.dataset.genre = viewBook.genre;
    bookDiv.dataset.id = viewBook._id || "";
    bookDiv.dataset.externalId = viewBook.externalId || "";
    bookDiv.dataset.url = viewBook.fileUrl || "#";
    bookDiv.dataset.cover = viewBook.coverUrl || "";
    bookDiv.dataset.description = viewBook.description || "";
    bookDiv.dataset.bookUid = uniqueId; // Additional unique identifier
    
    const img = document.createElement("img");
    img.src = viewBook.coverUrl;
    img.alt = viewBook.title || "Book Cover";
    img.loading = "lazy";
    
    // Add favorite button
    const favBtn = document.createElement("button");
    favBtn.className = "book-fav-btn";
    favBtn.dataset.bookId = uniqueId;
    favBtn.dataset.bookTitle = viewBook.title;
    
    const bookKey = getBookUniqueKey(viewBook);
    const allFavs = cachedUserBooks.favourites || [];
    console.log("All fav" , allFavs);
    const targetBook = allFavs.find(b => getBookUniqueKey(b) === bookKey);
    const isVisible = targetBook ? (targetBook.isVisible !== false) : false;
console.log("isvisible" , isVisible,bookKey,targetBook);
    favBtn.classList.toggle("active", isVisible);
    favBtn.innerHTML = isVisible
      ? '<i class="fas fa-heart"></i>'
      : '<i class="far fa-heart"></i>';
  
    // Favorite button click handler
    favBtn.addEventListener("click", async (e) => {
  e.stopPropagation();
  e.preventDefault();

  // current clicked book ka unique key
  const clickedBookKey =getBookUniqueKey(viewBook);

  // cache me exact same book find karo
   let matchedBook = null;
    const titleconst=viewBook.title;
  // loop lagake exact book find karo
  console.log("match start, title : ", titleconst);
  for (let i = 0; i < cachedUserBooks.favourites.length; i++) {
    const favBook = cachedUserBooks.favourites[i];
    if (getBookUniqueKey(favBook) === clickedBookKey) {
      console.log("match found in cache : ", favBook);
      matchedBook = favBook;
      break;
    }
  }

  // agar cache me mila toh ussi ko toggle karo
  // warna current viewBook ko use karo
  const bookToToggle = matchedBook || viewBook;

  console.log("Clicked Book:", viewBook);
  console.log("Matched Book:", matchedBook);
  if(matchedBook===null){
       await saveFavorites(bookToToggle, "add");
  }
  else
  await toggleIsVisible(bookToToggle, "favourites");
});
    
    // Book click handler - pass the specific book object
    img.addEventListener("click", () => {
      // Create a fresh copy of the book object to avoid reference issues
      const bookCopy = {
        _id: viewBook._id,
        externalId: viewBook.externalId,
        title: viewBook.title,
        author: viewBook.author,
        genre: viewBook.genre,
        coverUrl: viewBook.coverUrl,
        fileUrl: viewBook.fileUrl,
        description: viewBook.description
      };
      
      if (window.BookVerseRouter) {
        window.BookVerseRouter.handleBookClick(bookCopy, selector);
      } else {
        openBookDetails(bookCopy, selector);
      }
    });

    bookDiv.appendChild(img);
    bookDiv.appendChild(favBtn);
    fragment.appendChild(bookDiv);
    carouselItems.push(bookDiv);
  });

  // Clear and append in one go
  container.innerHTML = "";
  container.appendChild(fragment);

  setupCarouselAndHover(container);
}

// ============================ INFO BOX + MODAL ============================

const infoBox = document.querySelector(".info-box");
const summaryModal = document.getElementById("summaryModal");
const modalBookCover = document.getElementById("modalBookCover");
const summaryText = document.getElementById("summaryText");
const closeModal = document.querySelector(".close");
const closeInfo = document.querySelector(".close-info");
const readMoreBtn = document.getElementById("readMoreBtn");

let hoverTimeout = null;
let currentBook = null;
let speech = null;

function showinfobox(book) {
  if (book.dataset.hoverBound === "1") return;
  book.dataset.hoverBound = "1";
  book.addEventListener("mouseenter", () => {
    hoverTimeout = setTimeout(() => {
      const rect = book.getBoundingClientRect();
      const bookName = book.dataset.name;
      const author = book.dataset.author;

      const boxWidth = 250;
      let left = rect.left + rect.width / 2 - boxWidth / 2;
      if (left + boxWidth > window.innerWidth - 10) left = window.innerWidth - boxWidth - 10;
      if (left < 10) left = 10;
      let top = rect.bottom + 10;
      if (top + 200 > window.innerHeight) top = rect.top - 220;

      infoBox.style.left = `${left}px`;
      infoBox.style.top = `${top}px`;
      infoBox.querySelector("h4").textContent = bookName;
      infoBox.querySelector(".author").textContent = author;
      infoBox.querySelector("img").src = book.querySelector("img").src;

      infoBox.style.display = "block";
      speech = new SpeechSynthesisUtterance(`${bookName} by ${author}`);
      window.speechSynthesis.speak(speech);
      currentBook = book;
    }, 1000000000);
  });

  book.addEventListener("mouseleave", () => clearTimeout(hoverTimeout));
}

infoBox.addEventListener("mouseleave", () => {
  infoBox.style.display = "none";
});

closeInfo.addEventListener("click", () => {
  infoBox.style.display = "none";
  if (speech) window.speechSynthesis.cancel();
});

infoBox.querySelector("button").addEventListener("click", () => {
  infoBox.style.display = "none";
  const title = infoBox.querySelector("h4").textContent;

  modalBookCover.src = infoBox.querySelector("img").src;
  summaryText.innerHTML = `
    <p>${title} - Summary is fetched from backend please click on "Read More".</p>
    <div class="page-video">
      <video autoplay loop muted playsinline>
        <source src="https://static.vecteezy.com/system/resources/previews/036/294/489/mp4/open-book-rotating-close-up-of-pages-texts-and-words-video.mp4" type="video/mp4">
      </video>
    </div>
  `;
  summaryModal.style.display = "flex";
  if (speech) window.speechSynthesis.cancel();
});

closeModal.addEventListener("click", () => {
  summaryModal.style.display = "none";
});

readMoreBtn.addEventListener("click", () => {
  if (!currentBook) return;
  const detailBook = {
    _id: currentBook.dataset.id || null,
    externalId: currentBook.dataset.externalId || null,
    title: currentBook.dataset.name || "Untitled",
    author: currentBook.dataset.author || "Unknown Author",
    genre: currentBook.dataset.genre || "General",
    fileUrl: currentBook.dataset.url || "#",
    coverUrl: currentBook.dataset.cover || "https://via.placeholder.com/150?text=No+Cover",
    description: currentBook.dataset.description || ""
  };
  openBookDetails(detailBook, "summary-modal");
});

// ============================ CAROUSEL SETUP ============================

function setupCarouselAndHover(section) {
  const books = section.querySelectorAll(".book");
  if (books.length === 0) return;

  books.forEach(book => showinfobox(book));

  let existingLeft = section.querySelector(".arrow.left");
  let existingRight = section.querySelector(".arrow.right");
  if (existingLeft && existingRight) return;

  const leftArrow = document.createElement("button");
  const rightArrow = document.createElement("button");
  leftArrow.className = "arrow left";
  rightArrow.className = "arrow right";
  leftArrow.textContent = "⟵";
  rightArrow.textContent = "⟶";
  section.appendChild(leftArrow);
  section.appendChild(rightArrow);

  let current = Math.floor(books.length / 2);

  function updateBooks() {
    books.forEach(book => {
      book.classList.remove("far-left3", "far-left2", "left", "active", "right", "far-right2", "far-right3");
      book.style.opacity = 0.2;
    });

    for (let offset = -3; offset <= 3; offset++) {
      let pos = (current + offset + books.length) % books.length;
      let book = books[pos];
      book.style.opacity = 1;
      if (offset === -3) book.classList.add("far-left3");
      else if (offset === -2) book.classList.add("far-left2");
      else if (offset === -1) book.classList.add("left");
      else if (offset === 0) book.classList.add("active");
      else if (offset === 1) book.classList.add("right");
      else if (offset === 2) book.classList.add("far-right2");
      else if (offset === 3) book.classList.add("far-right3");
    }
  }

  updateBooks();

  leftArrow.addEventListener("click", () => {
    current = (current - 1 + books.length) % books.length;
    updateBooks();
  });

  rightArrow.addEventListener("click", () => {
    current = (current + 1) % books.length;
    updateBooks();
  });
}

// ============================ HEADER SEARCH ============================

const headerSearchInput = document.getElementById("headerSearchInput");
const headerSearchResults = document.getElementById("headerSearchResults");
let headerSearchDebounceTimer = null;

headerSearchInput?.addEventListener("input", () => {
  clearTimeout(headerSearchDebounceTimer);
  const query = headerSearchInput.value.trim();
  console.log("Header search input:", query);
  if (query.length < 2) {
    headerSearchResults.innerHTML = "";
    headerSearchResults.classList.add("hide");
    return;
  }

  headerSearchDebounceTimer = setTimeout(async () => {
    try {
      const cacheKey = `header::${query.toLowerCase()}`;
      const cached = searchResultCache.get(cacheKey);
      let books;
      if (cached && cached.expiresAt > Date.now()) {
        books = cached.data;
      } else {
        console.log("Header search fetching from API for query:", query);
        console.log("Header Search API : ", `${encodeURIComponent(query)}`);
        const response = await timedFetch(
  `/api/books?search=${encodeURIComponent(query)}`,
  {},
  "header-search"
);

books = await response.json();
        searchResultCache.set(cacheKey, { data: books, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
      }
      
      if (Array.isArray(books)) {
        displayHeaderSearchResults(books);
      }
    } catch (error) {
      console.error("Header search error:", error);
    }
  }, 300);
});

function displayHeaderSearchResults(books) {
  console.log("header search found books:", books.length);
  if (!headerSearchResults) return;
  headerSearchResults.innerHTML = "";
  
  if (books.length === 0) {
    headerSearchResults.innerHTML = "<div class='header-search-item'>No books found</div>";
  } else {
    const myset=new Set();
    books.slice(0, 8).forEach(book => {
      const viewBook = mapApiBookToViewModel(book);
        const uniqueKey = getBookUniqueKey(viewBook);
        console.log("Header Search - uniqueKey:", uniqueKey);
        if(myset.has(uniqueKey)){
          return;
        }
        myset.add(uniqueKey);
        console.log("myset:", myset);
      const item = document.createElement("div");
      item.className = "header-search-item";
      item.innerHTML = `
        <img src="${viewBook.coverUrl}" alt="${viewBook.title}">
        <div class="info">
          <h4>${viewBook.title}</h4>
          <p>${viewBook.author}</p>
        </div>
      `;
      item.addEventListener("click", () => {
        openBookDetails(viewBook, "header-search");
        headerSearchResults.classList.add("hide");
        headerSearchInput.value = "";
      });
      headerSearchResults.appendChild(item);
    });
  }
  headerSearchResults.classList.remove("hide");
}

// Close search results when clicking outside
document.addEventListener("click", (e) => {
  if (headerSearchResults && !headerSearchResults.contains(e.target) && e.target !== headerSearchInput) {
    headerSearchResults.classList.add("hide");
  }
});

// ============================ SEARCH ============================

const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const resultsDiv = document.getElementById('results');
const loader = document.getElementById('loader');

document.getElementById("searchBtn").addEventListener("click", searchBooks);

async function searchBooks() {
  const query = searchInput.value.trim();
  if (!query) return;
  loader.style.display = 'block';
  resultsDiv.innerHTML = '';
console.log("Searching for:", query);
  try {
    const cacheKey = query.toLowerCase();
    const cached = searchResultCache.get(cacheKey);
    let books;
    if (cached && cached.expiresAt > Date.now()) {
      console.log("Search results loaded from cache for query:", query);
      books = cached.data;
    } else {
      console.log("Search fetching from API for query:", query);
      const response = await timedFetch(`${API_BASE}/api/books/?search=${encodeURIComponent(query)}`, {}, "search-books");
      books = await response.json();
      console.log("Search results from API:", books.length);
      searchResultCache.set(cacheKey, { data: books, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
    }
    if (!Array.isArray(books)) throw new Error("Invalid data format");
    displayResults(books);
  } catch (error) {
    console.error("Error fetching books:", error);
    resultsDiv.innerHTML = `<p style="color:red;">Something went wrong. Please try again.</p>`;
  } finally {
    loader.style.display = 'none';
  }
}

let searchDebounceTimer = null;
searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    if (searchInput.value.trim().length >= 3) {
      searchBooks();
    }
  }, 350);
});

// Refresh all sections and buttons
function refreshAllSections() {
  renderFavoritesSection();
  renderContinueReadingSection();
  refreshAllLikeButtons();
}

// Refresh all like buttons across all sections
function refreshAllLikeButtons() {
  const allFavs = cachedUserBooks.favourites || [];
  
  // Select ALL like buttons in the document
  const allFavButtons = document.querySelectorAll(".fav-btn, .book-fav-btn, .bookshelf-fav-btn");
  
  allFavButtons.forEach(btn => {
    // Find the parent book element
    const bookEl = btn.closest(".book, .book-card, .bookshelf-book");
    if (!bookEl) return;
    
    // Extract book info
    let title, author;
    if (bookEl.dataset.name && bookEl.dataset.author) {
      title = bookEl.dataset.name;
      author = bookEl.dataset.author;
    } else if (bookEl.classList.contains("bookshelf-book")) {
      const titleEl = bookEl.querySelector(".bookshelf-book-title");
      const authorEl = bookEl.querySelector(".bookshelf-book-author");
      title = titleEl?.textContent;
      author = authorEl?.textContent?.replace("by ", "");
    } else {
      const titleEl = bookEl.querySelector("h3, h4");
      const authorEl = bookEl.querySelector("p");
      title = titleEl?.textContent;
      author = authorEl?.textContent;
    }
    
    if (!title || !author) return;
    const bookKey = getBookUniqueKey({ title, author });
    const targetBook = allFavs.find(b => getBookUniqueKey(b) === bookKey);
    const isVisible = targetBook ? (targetBook.isVisible !== false) : false;
    
    // Update button
    btn.classList.toggle("active", isVisible);
    btn.innerHTML = isVisible ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
  });
}

function displayResults(bookks) {
  console.log("Search results:", bookks);
  const uniqueset = new Set();
  const books = [];
  for (const book of bookks) {
    const key = getBookUniqueKey(book);
    if (uniqueset.has(key)) {
      console.log("Duplicate found and skipped:", book);
      continue;
    }
    books.push(book);
    uniqueset.add(key);
  }
  resultsDiv.innerHTML = "";
  if (!Array.isArray(books) || books.length === 0) {
    resultsDiv.innerHTML = `
      <div style="text-align:center; padding:60px 20px;">
        <div style="font-size:4rem; margin-bottom:20px;">📚</div>
        <h2 style="color:#00C8FF; margin-bottom:10px;">No books found</h2>
        <p style="color:#aaa;">Try a different search term!</p>
      </div>
    `;
    return;
  }

  console.log("Unique search results:", books.length);

  // Create grid container (exactly 6 columns per row)
  const gridContainer = document.createElement("div");
  gridContainer.style.display = "grid";
  gridContainer.style.gridTemplateColumns = "repeat(5, 4fr)";
  gridContainer.style.gap = "24px";
  gridContainer.style.padding = "20px";
  gridContainer.style.justifyItems = "center";
  gridContainer.style.justifySelf="normal";
  
  // For responsive design
  const style = document.createElement("style");
  style.textContent = `
    @media (max-width: 1400px) {
      .search-grid { grid-template-columns: repeat(4, 1fr) !important; }
    }
    @media (max-width: 1200px) {
      .search-grid { grid-template-columns: repeat(3, 1fr) !important; }
    }
    @media (max-width: 900px) {
      .search-grid { grid-template-columns: repeat(2, 1fr) !important; }
    }
    @media (max-width: 600px) {
      .search-grid { grid-template-columns: repeat(1, 1fr) !important; }
    }
  `;
  document.head.appendChild(style);
  gridContainer.className = "search-grid";
  
  books.forEach((book) => {
    const viewBook = mapApiBookToViewModel(book);
    const card = document.createElement("div");
    card.style.background = "linear-gradient(145deg, rgba(30,35,55,0.95), rgba(20,25,40,0.98))";
    card.style.borderRadius = "16px";
    card.style.width="225px";
    card.style.padding = "18px";
    card.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)";
    card.style.border = "1px solid rgba(100, 150, 255, 0.25)";
    card.style.transition = "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    card.style.cursor = "pointer";
    card.style.position = "relative";
    card.style.overflow = "hidden";
    
    // Add subtle gradient border on hover
    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-8px) scale(1.02)";
      card.style.boxShadow = "0 20px 50px rgba(0,0,0,0.7), 0 0 30px rgba(0, 200, 255, 0.2)";
      card.style.borderColor = "rgba(0, 200, 255, 0.6)";
    });
    
    card.addEventListener("mouseleave", () => {
      card.style.transform = "translateY(0) scale(1)";
      card.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)";
      card.style.borderColor = "rgba(100, 150, 255, 0.25)";
    });
    
    // Cover image container
    const imgContainer = document.createElement("div");
    imgContainer.style.position = "relative";
    imgContainer.style.marginBottom = "14px";
    
    const img = document.createElement("img");
    img.src = viewBook.coverUrl;
    img.alt = viewBook.title;
    img.style.width = "100%";
    img.style.height = "260px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "12px";
    img.style.transition = "transform 0.4s ease";
    
    img.addEventListener("mouseenter", () => {
      img.style.transform = "scale(1.05)";
    });
    img.addEventListener("mouseleave", () => {
      img.style.transform = "scale(1)";
    });
    
    imgContainer.appendChild(img);
    
    // Title
    const title = document.createElement("h3");
    title.textContent = viewBook.title;
    title.style.fontSize = "1.05rem";
    title.style.color = "#ffffff";
    title.style.marginBottom = "8px";
    title.style.fontWeight = "600";
    title.style.lineHeight = "1.4";
    title.style.overflow = "hidden";
    title.style.textOverflow = "ellipsis";
    title.style.display = "-webkit-box";
    title.style.webkitLineClamp = "2";
    title.style.webkitBoxOrient = "vertical";
    
    // Author
    const author = document.createElement("p");
    author.textContent = "by " + viewBook.author;
    author.style.fontSize = "0.9rem";
    author.style.color = "#9dbefe";
    author.style.marginBottom = "12px";
    author.style.fontStyle = "italic";
    
    // Favorite button
    const bookKey = getBookUniqueKey(viewBook);
    const allFavs = cachedUserBooks.favourites || [];
    const targetBook = allFavs.find(b => getBookUniqueKey(b) === bookKey);
    const isVisible = targetBook ? (targetBook.isVisible !== false) : false;
    
    const favBtn = document.createElement("button");
    favBtn.className = "book-fav-btn" + (isVisible ? " active" : "");
    favBtn.innerHTML = isVisible ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
    favBtn.style.position = "absolute";
    favBtn.style.top = "12px";
    favBtn.style.right = "12px";
    favBtn.style.background = "rgba(0,0,0,0.75)";
    favBtn.style.border = "none";
    favBtn.style.color = "#fff";
    favBtn.style.fontSize = "1.3rem";
    favBtn.style.width = "40px";
    favBtn.style.height = "40px";
    favBtn.style.borderRadius = "50%";
    favBtn.style.cursor = "pointer";
    favBtn.style.zIndex = "10";
    favBtn.style.transition = "all 0.3s ease";
    favBtn.style.display = "flex";
    favBtn.style.alignItems = "center";
    favBtn.style.justifyContent = "center";
    favBtn.style.backdropFilter = "blur(10px)";
    
    // Favorite button click
    favBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      
      await toggleIsVisible(viewBook, "favourites");
    });
    
    // Book click (open details)
    card.addEventListener("click", () => openBookDetails(viewBook, "search-results"));
    
    card.appendChild(imgContainer);
    card.appendChild(favBtn);
    card.appendChild(title);
    card.appendChild(author);
    gridContainer.appendChild(card);
  });
  
  resultsDiv.appendChild(gridContainer);
}

function setupSessionControls() {
  const resumeBtn = document.getElementById("resumeLastBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  resumeBtn?.addEventListener("click", () => {
    const active = getActiveBook();
    if (!active) {
      alert("No recently opened book found.");
      return;
    }
    openReader(active);
  });

  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem(ACTIVE_BOOK_KEY);
    localStorage.removeItem(ACTIVE_BOOK_SOURCE_KEY);
    token = null;
    booksCache.clear();
    searchResultCache.clear();
    showLoginView();
    document.getElementById("admin").classList.add("hide");
    alert("Logged out successfully.");
  });
}

function injectSkeletonStyles() {
  if (document.getElementById("skeleton-styles")) return;
  const style = document.createElement("style");
  style.id = "skeleton-styles";
  style.textContent = `
    #sessionControls { display:flex; gap:10px; align-items:center; }
    #sessionControls button { padding:8px 12px; border:none; border-radius:8px; cursor:pointer; }
    .skeleton-card { width:150px; height:210px; border-radius:14px; background:rgba(255,255,255,0.08); overflow:hidden; }
    .skeleton-block { width:100%; height:100%; animation: shimmer 1.2s infinite linear; background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.16) 50%, rgba(255,255,255,0.06) 75%); background-size:200% 100%; }
    @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
  `;
  document.head.appendChild(style);
}

// ============================ INIT ============================

async function applyInitialAuthView() {
  if (!token) {
    const view = window.StateHelpers?.getInitialView(false, false) || "login";
    if (view === "login") showLoginView();
    return;
  }
  try {
    const meRes = await timedFetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    }, "auth-me");
    if (!meRes.ok) throw new Error(`Auth check failed: ${meRes.status}`);
    const me = await meRes.json();
    
    // Store user info including role
    localStorage.setItem("user", JSON.stringify(me));
    
    // Role-based UI visibility
    if (me.admin === "Y") {
      document.getElementById("admin").classList.remove("hide");
    } else {
      document.getElementById("admin").classList.add("hide");
    }

    const view = window.StateHelpers?.getInitialView(true, true) || "search";
    if (view === "search") showSearchView();
  } catch (error) {
    console.warn("Invalid session, forcing login:", error);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    token = null;
    const view = window.StateHelpers?.getInitialView(true, false) || "login";
    if (view === "login") showLoginView();
  }
}
const genreSelects = document.getElementById("genreSelect");

genreSelects.addEventListener("change", function () {
  const selectedGenre = this.value;
  console.log("Selected genre:", selectedGenre);

  loadBooks2(selectedGenre); // call your API
});
async function loadBooks2(genre = "all") {
  let url = "/api/books";

  if (genre !== "all") {
    url += `?genre=${genre}`;
  }

  const res = await fetch(url);
  const books = await res.json();

  const grid = document.getElementById("bookGrid");
  grid.innerHTML = "";

  if (books.length === 0) {
    grid.innerHTML = "<p>No books found 😢</p>";
    return;
  }

books.forEach(book => {
  const div = document.createElement("div");
  div.classList.add("book");

  // 🔥 VERY IMPORTANT (dataset for modal + details)
  div.dataset.name = book.title;
  div.dataset.author = book.author;
  div.dataset.genre = Array.isArray(book.genre) ? book.genre[0] : book.genre;
  div.dataset.id = book._id || "";
  div.dataset.url = book.fileUrl || "#";
  div.dataset.cover = book.coverUrl || "";
  div.dataset.description = book.description || "";

  const img = document.createElement("img");
  img.src = book.coverUrl;
  img.alt = book.title;

  // ✅ CLICK WORKS NOW
  img.addEventListener("click", () => openBookDetails(book, "filtered"));

  const title = document.createElement("h4");
title.innerText = book.title;
title.className = "book-title";

div.appendChild(img);
div.appendChild(title);
  grid.appendChild(div);
});
}
document.addEventListener("DOMContentLoaded", async () => {

  // ================= MY ACCOUNT =================
  const myAccountLink = document.getElementById("myAccountLink");

  if (myAccountLink) {
    myAccountLink.addEventListener("click", (e) => {
      e.preventDefault();

      const token = localStorage.getItem("token");
      const libraryUser = JSON.parse(localStorage.getItem("user"));
      const currentUser = JSON.parse(localStorage.getItem("currentUser"));

      if (token || libraryUser || currentUser) {

        const isAdmin =
          (libraryUser && libraryUser.admin === "Y") ||
          (currentUser && currentUser.role === "admin");

        if (isAdmin) {
          window.location.href = "admin-dashboard.html";
        } else {
          window.location.href = "user-dashboard.html";
        }

      } else {
        window.location.href = "index_user.html";
      }
    });
  }

  // ================= STORAGE LISTENER =================
  window.addEventListener("storage", async (e) => {
    if (["token", "user", "currentUser", "userBooksUpdated"].includes(e.key)) {
      await fetchUserBooks();
      refreshAllSections();
    }
  });

  // ================= INITIAL HIDE =================
  document.getElementById("list_books_stash").style.display = "none";
  document.getElementById("list_books_rel").style.display = "none";
  document.getElementById("list_books_fav").style.display = "none";
  document.getElementById("list_books").style.display = "none";

  injectSkeletonStyles();
  setupSessionControls();

  // ================= GOOGLE LOGIN =================
  await handleGoogleCallback();

  // ================= CHECK LOGIN =================
  await applyInitialAuthView();

  // ================= FETCH USER DATA =================
  await fetchUserBooks();

  // ================= LOAD BOOKS =================
  await loadBooks();
  await loadBooks2();

  // ================= SHOW SECTIONS IF LOGGED IN =================
  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  if (token || currentUser) {

    openAllSections();

    document.getElementById("list_books").style.display = "flex";
    document.getElementById("list_books_rel").style.display = "flex";

    renderFavoritesSection();
    renderContinueReadingSection();

  } else {

    showLoginView();

  }
});

readMoreBtn23.addEventListener("click",()=>{
  const book = {
    title: "The Problem with Forever",
    author: "Jennifer L. Armentrout",
    description: "The Problem with Forever is a deeply emotional and beautifully written novel that explores themes of trauma, healing, and self-discovery. The story follows Mallory 'Mouse' Dodge, a young girl who has survived a painful and abusive childhood that left her struggling with anxiety and the inability to speak comfortably in social situations. After years of being homeschooled by loving foster parents, she decides to face her fears and attend a public high school.At school, Mallory reconnects with Rider Stark, a boy from her past who once protected her during their darkest times. As their bond begins to grow again, Mallory is forced to confront her past and the emotional walls she has built around herself. While Rider appears strong and confident, he too carries scars that influence his choices and future. The novel beautifully portrays Mallory’s journey as she slowly finds her voice, both literally and emotionally. Through friendships, challenges, and moments of courage, she learns that healing is not linear and that speaking up can change not only her life but also the lives of those around her. Filled with heartfelt moments, realistic characters, and powerful messages, The Problem with Forever is a story about resilience, love, and the importance of standing up for yourself, even when it feels impossible.",
    genre: ["fiction"],
    coverUrl: "https://tse3.mm.bing.net/th/id/OIP.ckhRhFWlAeYBwPbs9kKqJwHaJ4?rs=1&pid=ImgDetMain&o=7&rm=3",
    fileUrl: "https://cdn.bookey.app/files/pdf/book/en/the-problem-with-forever.pdf"
  };

  openBookDetails(book, "best-book");
});