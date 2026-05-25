// Combined Dashboard JavaScript (Clean Version)

const API_BASE = "http://localhost:5078";
const profileBioId=document.getElementById("profileBio");
// =========================
// USER HELPERS
// =========================
function getCurrentUserEmail() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const libraryUser = JSON.parse(localStorage.getItem("user"));

  return currentUser?.email || libraryUser?.email || null;
}
async function getCurrentUser() {

  const localUser =
    JSON.parse(localStorage.getItem("currentUser"));

  const email = localUser?.email;

  if (!email) {
    return localUser;
  }

  try {

    const res = await fetch(
      `${API_BASE}/api/users/email/${encodeURIComponent(email)}`
    );

    if (!res.ok) {
      return localUser || {};
    }

    const user = await res.json();

    // update localStorage also
    localStorage.setItem(
      "currentUser",
      JSON.stringify(user)
    );

    return user;

  } catch (err) {

    console.error("GET CURRENT USER ERROR =", err);

    return localUser || {};
  }
}

function getCurrentUserId() {
  const email = getCurrentUserEmail();

  return email
    ? `user_${email.replace(/[^a-zA-Z0-9]/g, "_")}`
    : "anonymous";
}

// =========================
// CACHE
// =========================
let cachedUserBooks = {
  favourites: [],
  continueReading: []
};

// =========================
// FETCH USER BOOKS
// =========================
async function fetchUserBooks() {

  const email = getCurrentUserEmail();

  if (!email) {
    return {
      favourites: [],
      continueReading: []
    };
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

    console.error("FETCH USER BOOKS ERROR =", err);

    return cachedUserBooks;
  }
}

// =========================
// FAVORITES
// =========================
function getFavorites() {
  return (cachedUserBooks.favourites || []).filter(
    book => book.isVisible !== false
  );
}

// =========================
// CONTINUE READING
// =========================
function getRecentBooks() {
  return (cachedUserBooks.continueReading || []).filter(
    book => book.isVisible !== false
  );
}

// =========================
// STORAGE TRIGGER
// =========================
function triggerUserBooksUpdate() {

  localStorage.setItem(
    "userBooksUpdated",
    Date.now().toString()
  );

  localStorage.removeItem("userBooksUpdated");
}

// =========================
// MODAL HANDLING
// =========================
const addBookModal = document.getElementById("addBookModal");

function openModal() {

  if (addBookModal) {
    addBookModal.classList.add("active");
  }
}

function closeAddBookForm() {

  if (addBookModal) {
    addBookModal.classList.remove("active");
  }
}

// CLOSE ON OUTSIDE CLICK
window.addEventListener("click", function (e) {

  if (e.target === addBookModal) {
    closeAddBookForm();
  }
});

// =========================
// SUBMIT BOOK
// =========================
async function submitBook() {

  try {

    const form = document.getElementById("addBookForm");

    const title = form.title.value.trim();
    const author = form.author.value.trim();
    const description = form.description.value.trim();
    const genre = form.genre.value.trim();
    const coverUrl = form.coverUrl.value.trim();
    const fileUrl = form.fileUrl.value.trim();

    // =========================
    // VALIDATION
    // =========================
    if (!title || !author || !fileUrl) {

      alert("Title, Author and File URL are required");

      return;
    }

    // =========================
    // CURRENT USER
    // =========================
    const currentUser = await getCurrentUser();

    const libraryUser = JSON.parse(
      localStorage.getItem("user")
    );

    // =========================
    // ADMIN CHECK
    // =========================
    const isAdmin =
      (currentUser && currentUser.role === "admin") ||
      (libraryUser && libraryUser.admin === "Y");

    // =========================
    // REQUEST PAYLOAD
    // =========================
    const payload = {
      title,
      author,
      description,
      genre,
      coverUrl,
      fileUrl,

      submittedByEmail:
        currentUser.email ||libraryUser?.email ||  "",

      submittedByName:
        currentUser.name || libraryUser?.name ||  "",

      status: "PENDING"
    };
console.log("PAYLOAD =", payload);
    // =========================
    // ADMIN FLOW
    // =========================
    if (isAdmin) {

      const res = await fetch(
        `${API_BASE}/api/books`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await res.json();

      if (res.ok) {

        alert("Book added successfully");

        addBookCard(payload);

        form.reset();

        closeAddBookForm();

      } else {

        alert(data.error || "Error adding book");
      }

      return;
    }

    // =========================
    // NORMAL USER FLOW
    // =========================
    const res = await fetch(
      `${API_BASE}/api/pending-books/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await res.json();

    if (res.ok) {

      alert("Book submitted for review");

      addBookCard(payload);

      form.reset();

      closeAddBookForm();

      loadMyAddedBooks();

    } else {

      alert(data.error || "Error submitting book");
    }

  } catch (err) {

    console.error("SUBMIT BOOK ERROR =", err);

    alert("Something went wrong");
  }
}

// =========================
// ADD BOOK CARD TO UI
// =========================
function addBookCard(book) {

  const bookGrid = document.getElementById("bookGrid");
  const bookCount = document.getElementById("bookCount");

  if (!bookGrid) {
    console.error("Book grid element not found");
    return;
  }
  const card = document.createElement("div");

  card.className = "book-card";

  card.innerHTML = `

    <img
      class="book-image"
      src="${book.coverUrl || "https://via.placeholder.com/300x400"}"
      alt="${book.title}"
    />

    <div class="book-content">

      <div class="book-title">
        ${book.title}
      </div>

      <div class="book-author">
        ${book.author}
      </div>

      ${book.genre
        ? `<div class="status">${book.genre}</div>`
        : ""
      }

      <a
        href="${book.fileUrl}"
        target="_blank"
        style="
          display:inline-block;
          margin-top:12px;
          padding:10px 16px;
          border-radius:10px;
          background:linear-gradient(135deg,#00C8FF,#3757e7);
          color:white;
          text-decoration:none;
          font-size:14px;
          font-weight:600;
        "
      >
        Read Book
      </a>

    </div>
  `;

  bookGrid.prepend(card);

  if (bookCount) {

    bookCount.innerText =
      document.querySelectorAll(".book-card").length;
  }
}

// =========================
// LOAD MY ADDED BOOKS
// =========================
async function loadMyAddedBooks() {
console.log("inside ");
  const container =
    document.getElementById("bookGrid");

  if (!container) return;

  const currentUser = await getCurrentUser();

  const libraryUser = JSON.parse(
    localStorage.getItem("user")
  );

  const userEmail =
    currentUser.email || libraryUser?.email || null;
console.log("User email for fetching books:", userEmail);
  if (!userEmail) {
    return;
  }

  try {

    const [pendingRes, mainRes] =
      await Promise.allSettled([

        fetch(
          `${API_BASE}/api/pending-books/my?email=${encodeURIComponent(userEmail)}`
        ),

        fetch(
          `${API_BASE}/api/books/my?email=${encodeURIComponent(userEmail)}`
        )
      ]);

    let pendingBooks = [];
    let mainBooks = [];

    if (pendingRes.status === "fulfilled") {
      pendingBooks = await pendingRes.value.json();
    }

    if (mainRes.status === "fulfilled") {
      mainBooks = await mainRes.value.json();
    }

    const allBooks = [
      ...pendingBooks,
      ...mainBooks
    ];
console.log("all books : "+  allBooks);
    container.innerHTML = "";

    if (!allBooks.length) {

      container.innerHTML = `
        <p class="empty-books">
          No submitted books yet
        </p>
      `;

      return;
    }

    allBooks.forEach(book => {

      let statusBadge = "📚 Added";

      if (book.status === "PENDING") {
        statusBadge = "🟠 Pending";
      }

      if (book.status === "REJECTED") {
        statusBadge = "🔴 Rejected";
      }

      if (book.status === "APPROVED") {
        statusBadge = "🟢 Approved";
      }

      const div = document.createElement("div");

      div.className = "book-item";
div.style.cursor = "pointer";

div.addEventListener("click", () => {
  openBookDetails(book);
});
      div.innerHTML = `
<div class="book-info">

          <div class="book-title">
            ${book.title}
          </div>

          <div class="book-author">
            by ${book.author}
          </div>

          <div
            class="book-status"
            style="
              margin-top:8px;
              color:#00C8FF;
              font-size:0.9rem;
            "
          >
            ${statusBadge}
          </div>

        </div>
      `;

      container.appendChild(div);
    });
document.getElementById("bookCount").innerText =allBooks.length;
  } catch (err) {

    console.error("LOAD MY BOOKS ERROR =", err);

    container.innerHTML = `
      <p>Error loading books</p>
    `;
  }
}

// =========================
// LOAD PENDING BOOKS
// =========================
async function loadPendingBooks() {

  const container =
    document.getElementById("pendingBooksList");

  if (!container){
console.log("outside");
   return;
  }
  try {

    const token = localStorage.getItem("token");

    const res = await fetch(
      `${API_BASE}/api/pending-books`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const books = await res.json();

    container.innerHTML = "";

    if (!books.length) {

      container.innerHTML = `
        <p>No pending books</p>
      `;

      return;
    }

    books.forEach(book => {
console.log(" book ", book );
      const div = document.createElement("div");

      div.className = "pending-book-card";
div.style.cursor = "pointer";

div.addEventListener("click", (e) => {
  if (e.target.tagName === "BUTTON") return;
  openBookDetails(book);
});
      div.innerHTML = `

        <img
          src="${book.coverUrl || "https://via.placeholder.com/150"}"
          alt="${book.title}"
        />

        <div class="pending-book-info">

          <h3>${book.title}</h3>

          <p>
            Author: ${book.author}
          </p>

          <p>
            Submitted By:
            ${book.submittedBy?.name || "Unknown"}
          </p>

          <div class="pending-book-actions">

            <button
              onclick="approveBook('${book._id}')"
              class="btn success"
            >
              ✅ Approve
            </button>

            <button
              onclick="rejectBook('${book._id}')"
              class="btn danger"
            >
              ❌ Reject
            </button>

          </div>

        </div>
      `;

      container.appendChild(div);
    });

  } catch (err) {

    console.error("LOAD PENDING ERROR =", err);

    container.innerHTML = `
      <p>Error loading pending books</p>
    `;
  }
}

// =========================
// APPROVE BOOK
// =========================
async function approveBook(id) {

  try {

    const token = localStorage.getItem("token");

    const res = await fetch(
      `${API_BASE}/api/pending-books/approve/${id}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await res.json();

    if (res.ok) {

      alert("Book approved successfully");

      loadPendingBooks();

    } else {

      alert(data.error || "Error approving book");
    }

  } catch (err) {

    console.error("APPROVE ERROR =", err);

    alert("Something went wrong");
  }
}

// =========================
// REJECT BOOK
// =========================
async function rejectBook(id) {

  try {

    const token = localStorage.getItem("token");

    const res = await fetch(
      `${API_BASE}/api/pending-books/reject/${id}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await res.json();

    if (res.ok) {

      alert("Book rejected");

      loadPendingBooks();

    } else {

      alert(data.error || "Error rejecting book");
    }

  } catch (err) {

    console.error("REJECT ERROR =", err);

    alert("Something went wrong");
  }
}

// =========================
// LOGOUT
// =========================
function logout() {

  localStorage.clear();

  sessionStorage.clear();

  window.location.replace("library.html");
}

// =========================
// OPEN BOOK DETAILS
// =========================
function openBookDetails(book) {

  localStorage.setItem(
    "selectedBook",
    JSON.stringify(book)
  );

  window.location.href = "book-details.html";
}

// =========================
// RENDER FAVORITES
// =========================
function renderFavBooks() {

  const container =
    document.getElementById("favBooksList");

  const noFavMsg =
    document.getElementById("noFavMsg");

  if (!container) return;

  const favorites = getFavorites();

  container.innerHTML = "";

  if (favorites.length === 0) {

    if (noFavMsg) {
      noFavMsg.style.display = "block";
    }

    return;
  }

  if (noFavMsg) {
    noFavMsg.style.display = "none";
  }

  favorites.forEach(book => {

    const div = document.createElement("div");

    div.className = "book-item";

    div.style.cursor = "pointer";

    div.innerHTML = `

      <div class="book-info">

        <div class="book-title">
          ${book.title}
        </div>

        <div class="book-author">
          by ${book.author}
        </div>

      </div>
    `;

    div.addEventListener(
      "click",
      () => openBookDetails(book)
    );

    container.appendChild(div);
  });
}

// =========================
// RENDER CONTINUE READING
// =========================
function renderContinueBooks() {

  const container =
    document.getElementById("continueBooksList");

  const noContMsg =
    document.getElementById("noContMsg");

  if (!container) return;

  const continueBooks = getRecentBooks();

  container.innerHTML = "";

  if (continueBooks.length === 0) {

    if (noContMsg) {
      noContMsg.style.display = "block";
    }

    return;
  }

  if (noContMsg) {
    noContMsg.style.display = "none";
  }

  continueBooks.forEach(book => {

    const div = document.createElement("div");

    div.className = "book-item";

    div.style.cursor = "pointer";

    div.innerHTML = `

      <div class="book-info">

        <div class="book-title">
          ${book.title}
        </div>

        <div class="book-author">
          by ${book.author}
        </div>

      </div>
    `;

    div.addEventListener(
      "click",
      () => openBookDetails(book)
    );

    container.appendChild(div);
  });
}

// =========================
// REFRESH SECTIONS
// =========================
function refreshAllSections() {

  const currentPage =
    window.location.pathname
      .split("/")
      .pop();

  if (currentPage === "user-dashboard.html") {

    loadMyAddedBooks();

    renderFavBooks();

    renderContinueBooks();
  }
}

let editMode = false;

function toggleEditProfile()
{
  editMode = !editMode;

  const editableFields = [
    document.getElementById("name"),
    document.getElementById("userName"),
    document.getElementById("profileBio"),
    document.getElementById("favGenre")
  ];

  editableFields.forEach(field =>
  {
    if(field)
    {
      field.contentEditable = editMode;
    }
  });

  // IMAGE CLICK ENABLE
  const profileImage =
    document.getElementById("profileImage");

  if(editMode)
  {
    profileImage.onclick = () =>
    {
      document
        .getElementById("imageUpload")
        .click();
    };
  }
  else
  {
    profileImage.onclick = null;

    saveProfileInline();
  }

  const button =
    document.querySelector(".secondary-btn");

  button.innerText =
    editMode
      ? "Save Profile"
      : "Edit Profile";
}


document
.getElementById("imageUpload")
.addEventListener("change", async function(e)
{
  const file = e.target.files[0];

  if(!file) return;

  const base64 =
    await convertToBase64(file);

  document.getElementById(
    "profileImage"
  ).src = base64;

  // AUTO SAVE IMAGE
  saveProfileInline();
});

async function saveProfileInline()
{
  try
  {
    const activeUser = await getCurrentUser();

    const updatedUser = {

      email: activeUser.email,

      name:
        document.getElementById("name")
        .innerText.trim(),

      username:
        document.getElementById("userName")
        .innerText
        .replace("@","")
        .trim(),

      bio:
        document.getElementById("profileBio")
        .innerText.trim(),

      favoriteGenre:
        document.getElementById("favGenre")
        .innerText.trim(),

      profileImage:
        document.getElementById("profileImage")
        .src
    };

    const response = await fetch(
      `${API_BASE}/api/users/update-profile`,
      {
        method:"PUT",

        headers:{
          "Content-Type":"application/json"
        },

        body: JSON.stringify(updatedUser)
      }
    );

    const data = await response.json();

    if(response.ok)
    {
      localStorage.setItem(
        "currentUser",
        JSON.stringify(data)
      );

      localStorage.setItem(
        "user",
        JSON.stringify(data)
      );

      alert("Profile Updated");
    }
    else
    {
      alert(data.error || "Update failed");
    }

  } catch(err)
  {
    console.log(err);

    alert("Error updating profile");
  }
}

function convertToBase64(file)
{
  return new Promise((resolve, reject)=>
  {
    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onload = () =>
      resolve(reader.result);

    reader.onerror = error =>
      reject(error);
  });
}

// =========================
// PAGE INIT
// =========================
window.onload = async () => {

  const currentPage =
    window.location.pathname
      .split("/")
      .pop();

  console.log(
    "CURRENT PAGE =",
    currentPage
  );

  console.log(
    "ACTIVE USER =",
    await getCurrentUser()
  );
  
  const activeUser=await getCurrentUser();
  if (currentPage === "user-dashboard.html") {
    const nameId=document.getElementById("name");
  const usernameId=document.getElementById("userName");
  if(nameId)
  {
    console.log("nameid not found");
    nameId.innerText=activeUser.name || "Library User";
  }
  const safeName =
    activeUser?.name || "library";
    if (usernameId) {
  usernameId.innerText =
    `@${safeName.split(" ")[0].toLowerCase()}_reads`;
}
  await fetchUserBooks();
const currentlyReadingId =
  document.getElementById("currentlyReadingCount");
console.log("passes");
if (currentlyReadingId)
{
  currentlyReadingId.innerText =
    getRecentBooks().length;
}
  document.getElementById("favGenre").innerText =
  activeUser.favoriteGenre ||
  "Favourite Genre";

document.getElementById("profileBio").innerText = activeUser.bio || "Bio goes here...";

  document.getElementById("profileImage").src =
  activeUser.profileImage ||
  "https://tse3.mm.bing.net/th/id/OIP.lQl3E9XjS44nIqhxswX5TgHaEo?w=600&h=375&rs=1&pid=ImgDetMain&o=7&rm=3";
  
    loadMyAddedBooks();

    renderFavBooks();

    renderContinueBooks();
  }

  if (currentPage === "admin-dashboard.html") {

    loadPendingBooks();
  }


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

        refreshAllSections();
      }
      
    loadMyAddedBooks();
loadPendingBooks();
    }
  );
};
