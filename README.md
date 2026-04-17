# 💰 Finance Tracker

A full-stack Finance Tracker application built with Next.js (React), Node.js (Express), and PostgreSQL. 
Containerized using Docker Compose for an easy setup.

## 🏗️ Architecture

```text
Browser (http://localhost:3010)
    │
    ▼
┌─────────────────┐        ┌────────────────┐        ┌──────────────┐
│  Next.js (Web)  │  ───►  │  Node.js API   │  ───►  │  PostgreSQL  │
│  Frontend :3010 │  API   │  Backend :3011 │  SQL   │   Database   │
└─────────────────┘        └────────────────┘        └──────────────┘
```

## 📂 Project Structure

```text
finance-tracker/
├── docker-compose.yml        ← Blueprint: defines 3 services (db, backend, frontend)
├── frontend/                 ← Next.js application (Port: 3010)
│   ├── Dockerfile
│   ├── package.json
│   └── src/                  
├── backend/                  ← Node.js / Express API (Port: 3011)
│   ├── Dockerfile            
│   ├── package.json
│   └── app.js             
└── README.md                 ← Project documentation
```

## 🚀 Getting Started

### Prerequisites

- [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/install/) installed.

### Run the Application

```bash
# Start all services in the background (first build takes ~2-5 mins)
docker-compose up -d --build

# Check the status of the containers
docker-compose ps

# View logs for all services
docker-compose logs -f

# Stop all services
docker-compose down

# Stop services and remove database data (volumes)
docker-compose down -v
```

### Accessing the App

1. **Frontend (Next.js)**: [http://localhost:3010](http://localhost:3010)
2. **Backend API Health Check**: [http://localhost:3011/api/health](http://localhost:3011/api/health)
3. **Backend API Transactions**: [http://localhost:3011/api/transactions](http://localhost:3011/api/transactions)

## 📌 How It Works

- **db** (PostgreSQL) → Starts first, stores data in a Docker named volume (`pgdata`), accessible on port `5432`. It initializes the tables `categories` and `transactions` automatically.
- **backend** (Node.js/Express) → Waits for the database to be ready, then connects using environment variables. Exposes the API on port `3011`.
- **frontend** (Next.js) → Connects to the backend via `NEXT_PUBLIC_API_URL=http://localhost:3011/api`. Exposes the web interface on port `3010`.

Docker Compose automatically creates an internal network, allowing these containers to communicate with each other seamlessly.
