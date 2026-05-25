# 📚 BookVerse

**BookVerse** is a full-stack web application that allows users to explore, search, and manage books. It integrates **MongoDB Atlas** for data storage and **Gutendex API** for fetching public domain books.

---

# ✨ Features

* 🔐 User Authentication (Login/Register)
* 🔍 Search books by title, genre, and author
* ⭐ Featured books section
* 📖 Save books to personal library
* 🌐 Integration with external book API (Gutendex)
* 📱 Responsive UI for all devices

---

# 🛠️ Tech Stack

**Frontend:**

* HTML / CSS / JavaScript 

**Backend:**

* Node.js
* Express.js

**Database:**

* MongoDB Atlas

**API:**

* Gutendex API

---

# 📁 Project Structure

```bash
BookVerse/
│
├── backend/
│   ├── config/
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   └── .env (not included in repo)
│
├── public/
│
├── server.js
|
├── seedBooks.js
|
└── README.md
```

---

# ⚙️ Setup Instructions

## 1️⃣ Clone the repository

```bash
git clone https://github.com/your-username/bookverse.git
cd bookverse
```

---

## 2️⃣ Backend Setup

Navigate to backend folder:

```bash
cd backend
npm install
```

---

## 3️⃣ Create `.env` file

Inside the backend folder, create a `.env` file and add:

```env
PORT=your port number

MONGO_URI=your_mongodb_atlas_connection_string

JWT_SECRET=your_secret_key

GUTENDEX_API=https://gutendex.com/books

NODE_ENV=development
```

---

## 4️⃣ Run Backend Server

```bash
npm start
```

---

# 🌐 API Integration

BookVerse uses the **Gutendex API** to fetch books dynamically:

```
https://gutendex.com/books
```

It helps in:

* Searching books
* Fetching book details
* Displaying public domain books

---

# 🗄️ Database Setup (MongoDB Atlas)

1. Create a cluster in MongoDB Atlas
2. Add database user
3. Whitelist your IP
4. Copy connection string into `.env`

---

# 🚀 Future Scope

* 🤖 AI-based book recommendations
* 💬 User reviews and ratings
* 📊 Reading analytics dashboard
* 👥 Social reading features

---

# 👨‍💻 Author

**BookVerse Project**
Developed for academic / learning purposes


