# 🔐 PasteVault – High-Performance C++ Paste Sharing Platform

A light, blazingly fast, and security-focused Pastebin microservice engineered in **C++17**, powered by **Crow**, **Asio**, and **SQLite3**. Features **Zero-Knowledge Client-Side AES-256 Encryption**, **Prism.js Syntax Highlighting**, **🔥 Burn After Reading**, and a sleek **Slate Glassmorphism UI**.

Containerized with **Docker** and deployed on **Render**.

[![Language](https://img.shields.io/badge/Language-C%2B%2B17-blue.svg)](https://en.cppreference.com/w/cpp/17)
[![Framework](https://img.shields.io/badge/Framework-Crow%20v1.2.0-008080.svg)](https://crowcpp.org/)
[![Database](https://img.shields.io/badge/Database-SQLite3-003B57.svg)](https://www.sqlite.org/)
[![Encryption](https://img.shields.io/badge/Security-AES--256%20Zero--Knowledge-brightgreen.svg)](https://cryptojs.gitbook.io/)
[![Build System](https://img.shields.io/badge/Build-CMake-064F8C.svg)](https://cmake.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

## 🌐 Live Demo

🚀 **Live Application:** https://pastevault-tbl1.onrender.com/

[![Live Demo](https://img.shields.io/badge/Live-Demo-success?style=for-the-badge&logo=render)](https://pastevault-tbl1.onrender.com/)

---

---

## 🚀 Key Features

- **🔒 Client-Side Zero-Knowledge Encryption:** Optional password protection uses **AES-256 (CryptoJS)** directly in the browser. Text is encrypted before leaving the client—the C++ backend and SQLite database store *only* scrambled ciphertext and never see plaintext or passwords.
- **⚡ Automatic Prism.js Syntax Highlighting:** Dynamic language detection and syntax highlighting for C++, Python, JavaScript, HTML, SQL, CSS, and more with Prism.js dark themes.
- **🔥 "Burn After Reading" One-Time Pastes:** Optional single-view pastes that automatically self-destruct and purge permanently from SQLite the instant they are retrieved.
- **🚀 Top-Down Toast Notifications & Quick Actions:** Modern floating toast popup on creation with direct share-link copying and a 1-click "Copy Content" button for viewers.
- **💎 Slate Glassmorphism UI:** Modern developer-focused design inspired by Vercel and Linear, complete with ambient background glows, responsive layouts, and custom scrollbars.
- **RESTful C++ Backend:** Structured routing supporting `POST` (create), `GET` (retrieve), and `DELETE` (explicit deletion) with JSON request/response payloads.
- **SQLite Persistence:** Thread-safe C++ database wrapper using parameterized prepared statements to prevent SQL injection.
- **Auto-Expiration Handling:** Flexible TTL (Time-To-Live) support (5 minutes, 1 hour, 1 day, or permanent) with automatic expiration checks and database cleanup.
- **Dynamic Base62 ID Generator:** Short 7-character unique identifier generation using C++ `<random>` (`std::mt19937`).
- **Automated Cloud Pipeline:** Containerized multi-stage Docker build pipeline deployed to Render with zero-downtime auto-deploys via GitHub webhooks.

---

## 🛠️ Tech Stack & Architecture

### Backend

- **Language:** C++17
- **HTTP Framework:** [Crow Framework](https://crowcpp.org/) (built on Asio)
- **Database:** SQLite3
- **Build System:** CMake 3.14+ (using `FetchContent` for automated dependency management)

### Frontend

- **UI & Styling:** HTML5, Modern CSS3 (CSS Variables, Backdrop Filters, Glassmorphism, Custom Scrollbars)
- **Encryption:** [CryptoJS](https://github.com/brix/crypto-js) (AES-256 Client-Side)
- **Code Highlighting:** [Prism.js](https://prismjs.com/) (Core + Autoloader)
- **Scripting:** Vanilla JavaScript (ES6+ `async/await` with `fetch` & `Clipboard API`)

### Infrastructure

- **Containerization:** Multi-stage Docker
- **Hosting:** Render Cloud Platform

---

## 📂 Project Structure

```text
PasteVault/
├── CMakeLists.txt         # Root build configuration
├── Dockerfile             # Multi-stage container build spec
├── pastevault.db          # SQLite persistent storage (auto-generated)
├── include/               # Header includes
├── src/
│   ├── main.cpp           # Server entry point & static file routing
│   ├── database/
│   │   ├── DatabaseManager.hpp
│   │   └── DatabaseManager.cpp # SQLite C++ wrapper, migration & prepared statements
│   ├── handlers/
│   │   ├── PasteHandler.hpp
│   │   └── PasteHandler.cpp    # ID generation, TTL/Burn logic & JSON handling
│   └── routes/
│       └── Router.hpp          # Crow REST API endpoints definition
└── public/
    ├── index.html         # Single-page UI layout & Toast containers
    ├── style.css          # Glassmorphism dark slate styling & Prism overrides
    └── app.js             # Client routing, AES encryption/decryption & clipboard actions
```

---

## 🔌 API Reference

### 1. Create a Paste

#### Endpoint

```http
POST /api/paste
```

#### Request Body (Plaintext)

```json
{
  "content": "Hello world from PasteVault!",
  "ttl_minutes": 60,
  "is_encrypted": false,
  "burn_after_reading": false
}
```

#### Request Body (Client-Encrypted & Burn-After-Reading)

```json
{
  "content": "U2FsdGVkX1+x9b...",
  "ttl_minutes": -1,
  "is_encrypted": true,
  "burn_after_reading": true
}
```

> **Note:** Set `ttl_minutes` to `-1` for permanent or burn-after-reading pastes.

#### Response (201 Created)

```json
{
  "id": "RCOtjlQ",
  "is_encrypted": true,
  "burn_after_reading": true,
  "created_at": 1784874104,
  "expires_at": -1
}
```

---

### 2. Retrieve a Paste

#### Endpoint

```http
GET /api/paste/<paste_id>
```

#### Response (200 OK)

```json
{
  "id": "RCOtjlQ",
  "content": "U2FsdGVkX1+x9b...",
  "is_encrypted": true,
  "burn_after_reading": true,
  "created_at": 1784874104,
  "expires_at": -1
}
```

> **Note:** If `burn_after_reading` is `true`, this request returns the payload and deletes the row from SQLite immediately.

---

### 3. Delete a Paste

#### Endpoint

```http
DELETE /api/paste/<paste_id>
```

#### Response (200 OK)

```json
{
  "message": "Paste deleted successfully"
}
```

---

## ⚙️ Local Development Setup

### Prerequisites

- GCC / G++ (supporting C++17)
- CMake (v3.14+)
- SQLite3 library installed locally

### Building & Running

#### Clone the repository

```bash
git clone https://github.com/<YOUR_USERNAME>/PasteVault.git
cd PasteVault
```

#### Configure with CMake

```bash
mkdir build && cd build
cmake ..
```

#### Compile

```bash
make              # Linux/Mac
# OR
mingw32-make      # Windows MinGW
```

#### Launch the server

```bash
# Run from project root so static public files load correctly
cd ..
./build/pastevault
```

Open **http://localhost:18080/** in your web browser.

---

## 🐳 Docker Setup

Build and run locally using Docker:

```bash
docker build -t pastevault .
docker run -p 18080:18080 pastevault
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.