document.getElementById("startBtn").addEventListener("click", () => {
  const book = document.getElementById("book");

  // Add the flip effect
  book.classList.add("turn");

  // Redirect after full flip
  setTimeout(() => {
    window.location.href = "library.html#login";
  }, 1500); // matches CSS transition duration
});
