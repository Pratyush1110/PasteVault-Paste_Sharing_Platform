# 🔐 PasteVault – High-Performance C++ Paste Sharing Platform

A light, blazingly fast, and persistent Pastebin microservice engineered in **C++17**, powered by **Crow**, **Asio**, and **SQLite3**. Containerized with **Docker** and deployed on **Render**.

[![Language](https://img.shields.io/badge/Language-C%2B%2B17-blue.svg)](https://en.cppreference.com/w/cpp/17)
[![Framework](https://img.shields.io/badge/Framework-Crow%20v1.2.0-008080.svg)](https://crowcpp.org/)
[![Database](https://img.shields.io/badge/Database-SQLite3-003B57.svg)](https://www.sqlite.org/)
[![Build System](https://img.shields.io/badge/Build-CMake-064F8C.svg)](https://cmake.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

---

## 🚀 Key Features

- **RESTful C++ Backend:** Structured routing supporting `POST` (create), `GET` (retrieve), and `DELETE` (explicit deletion) with JSON request/response payloads.
- **SQLite Persistence:** Thread-safe C++ database wrapper using parameterized prepared statements to prevent SQL injections.
- **Auto-Expiration Handling:** Flexible TTL (Time-To-Live) support (5 minutes, 1 hour, 1 day, or permanent) with automatic expiration checks and database cleanup.
- **Clean Architecture:** Strict 3-tier separation of routing, handler business logic, and database access layers for maximum maintainability.
- **Dynamic Base62 ID Generator:** Unique short 7-character alphanumeric string generation using C++ `<random>` (`std::mt19937`).
- **Clean Single-Page Frontend:** Responsive, distraction-free HTML5/CSS3/JS UI featuring dynamic path-based routing (`/` for creating, `/<paste_id>` for viewing).
- **Automated Cloud Pipeline:** Containerized multi-stage Docker build pipeline deployed to Render with zero-downtime auto-deploys via GitHub webhooks.

---

## 🛠️ Tech Stack & Architecture

### Backend

- **Language:** C++17
- **HTTP Framework:** [Crow Framework](https://crowcpp.org/) (built on Asio)
- **Database:** SQLite3
- **Build System:** CMake 3.14+ (using `FetchContent` for automated dependency management)

### Frontend

- **UI:** HTML5, Modern CSS3
- **Scripting:** Vanilla JavaScript (ES6+ `async/await` with `fetch` API)

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
│   │   └── DatabaseManager.cpp # SQLite C++ wrapper & prepared statements
│   ├── handlers/
│   │   ├── PasteHandler.hpp
│   │   └── PasteHandler.cpp    # ID generation, TTL logic & JSON handling
│   └── routes/
│       └── Router.hpp          # Crow REST API endpoints definition
└── public/
    ├── index.html         # Single-page UI layout
    ├── style.css          # Dark slate theme styling
    └── app.js             # Client-side routing & fetch requests
```

---

## 🔌 API Reference

### 1. Create a Paste

**Endpoint**

```http
POST /api/paste
```

**Request Body**

```json
{
  "content": "Hello world from PasteVault!",
  "ttl_minutes": 60
}
```

> **Note:** Set `ttl_minutes` to `-1` for permanent pastes.

**Response (201 Created)**

```json
{
  "id": "RCOtjlQ",
  "created_at": 1784874104,
  "expires_at": 1784877704
}
```

---

### 2. Retrieve a Paste

**Endpoint**

```http
GET /api/paste/<paste_id>
```

**Response (200 OK)**

```json
{
  "id": "RCOtjlQ",
  "content": "Hello world from PasteVault!",
  "created_at": 1784874104,
  "expires_at": 1784877704
}
```

---

### 3. Delete a Paste

**Endpoint**

```http
DELETE /api/paste/<paste_id>
```

**Response (200 OK)**

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

**Clone the repository**

```bash
git clone https://github.com/<YOUR_USERNAME>/PasteVault.git
cd PasteVault
```

**Configure with CMake**

```bash
mkdir build && cd build
cmake ..
```

**Compile**

```bash
make              # Linux/Mac
# OR
mingw32-make      # Windows MinGW
```

**Launch the server**

```bash
# Run from project root so static public files load correctly
cd ..
./build/pastevault
```

Open `http://localhost:18080/` in your web browser.

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