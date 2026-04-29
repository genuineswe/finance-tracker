<div align="center">

# 💰 Finance Tracker

**A full-stack personal finance management application with budget allocation powered by the 50/30/20 rule.**

[![Build Status](https://img.shields.io/github/actions/workflow/status/andrel/finance-tracker/ci.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/andrel/finance-tracker/actions)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](#-quick-start)
[![Node](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](#prerequisites)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](#-tech-stack)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](#-tech-stack)

<br />

<!-- Ganti URL di bawah dengan screenshot/GIF asli dari aplikasi Anda -->
<!-- Cara membuat GIF: gunakan tool seperti LICEcap, Kap (macOS), atau peek (Linux) -->

> 📸 **Tambahkan screenshot atau GIF demo di sini:**
>
> 1. Jalankan aplikasi → buka browser → screenshot halaman utama
> 2. Simpan ke folder `docs/` sebagai `demo.gif` atau `screenshot.png`
> 3. Uncomment baris di bawah dan hapus blockquote ini

<!-- ![Finance Tracker Demo](docs/demo.gif) -->

</div>

---

## 📖 Table of Contents

- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🛠 Tech Stack

| Layer        | Technology                                                                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend** | ![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs) ![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black) ![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white) |
| **Backend**  | ![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat-square&logo=express) ![Zod](https://img.shields.io/badge/Zod-4-3E67B1?style=flat-square&logo=zod&logoColor=white) |
| **Database** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white)                                                          |
| **DevOps**   | ![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white) ![Nodemon](https://img.shields.io/badge/Nodemon-3.1-76D04B?style=flat-square&logo=nodemon&logoColor=white) |
| **HTTP**     | ![Axios](https://img.shields.io/badge/Axios-1.15-5A29E4?style=flat-square&logo=axios&logoColor=white)                                                                      |

---

## ✨ Features

- 📊 **Transaction Management** — Full CRUD for income & expense tracking
- 🏷️ **Category System** — Organize transactions with customizable categories (Gaji, Makanan, Transportasi, Hiburan, Lainnya)
- 💡 **50/30/20 Budget Allocation** — Automated budget calculator based on the proven budgeting rule
- 🔍 **Advanced Filtering** — Filter by category, date range, amount range, and keyword search
- 📄 **Pagination & Sorting** — Server-side pagination with multi-column sorting
- ✅ **Input Validation** — Schema-based validation with Zod on every endpoint
- 🛡️ **Centralized Error Handling** — Consistent API error responses with PostgreSQL-aware error codes
- 🐳 **One-Command Setup** — Docker Compose orchestrates all 3 services instantly
- 🔄 **Hot Reload** — Nodemon (backend) + Next.js Fast Refresh (frontend) for rapid development
- 💱 **IDR Formatting** — Indonesian Rupiah currency formatting built-in

---

## 🏗 Architecture

```
                         ┌──────────────────────────────────────────┐
                         │            Docker Compose                │
                         │                                          │
  Browser (:3010)        │  ┌────────────┐       ┌──────────────┐  │
  ───────────────────────┼─►│  Next.js   │ HTTP  │   Express    │  │
                         │  │  Frontend  │──────►│   Backend    │  │
                         │  │  :3010     │       │   :3011      │  │
                         │  └────────────┘       └──────┬───────┘  │
                         │                              │ SQL      │
                         │                       ┌──────▼───────┐  │
                         │                       │  PostgreSQL  │  │
                         │                       │  :5432       │  │
                         │                       └──────────────┘  │
                         │                              │          │
                         │                        pgdata (volume)  │
                         └──────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

| Tool              | Version  | Installation                                             |
| ----------------- | -------- | -------------------------------------------------------- |
| **Docker**        | 20.10+   | [docs.docker.com/get-docker](https://docs.docker.com/get-docker/) |
| **Docker Compose** | v2.0+   | Included with Docker Desktop                             |
| **Node.js** *(optional, for local dev)* | 20+ | [nodejs.org](https://nodejs.org/) |
| **Git**           | 2.30+    | [git-scm.com](https://git-scm.com/)                     |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/andrel/finance-tracker.git
cd finance-tracker

# 2. Copy environment file
cp .env.example .env

# 3. Start all services (first run will build images, ~2-5 min)
docker compose up -d --build

# 4. Verify everything is running
docker compose ps
```

**🎉 Open your browser:**

| Service      | URL                                    |
| ------------ | -------------------------------------- |
| Frontend     | http://localhost:3010                   |
| API          | http://localhost:3011/api/health        |
| PostgreSQL   | `localhost:5432` (via any SQL client)   |

### Useful Commands

```bash
docker compose logs -f          # Stream logs from all services
docker compose logs -f backend  # Stream backend logs only
docker compose down             # Stop all services
docker compose down -v          # Stop all + delete database volume
docker compose restart backend  # Restart a specific service
```

---

## 🔐 Environment Variables

Create a `.env` file in the project root (or copy from `.env.example`):

```env
# ──────────────────────────────────────
# Database
# ──────────────────────────────────────
POSTGRES_USER=admin
POSTGRES_PASSWORD=password123
POSTGRES_DB=db_transaksi
DATABASE_URL=postgresql://admin:password123@db:5432/db_transaksi

# ──────────────────────────────────────
# Backend
# ──────────────────────────────────────
PORT=3011
NODE_ENV=development

# ──────────────────────────────────────
# Frontend
# ──────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:3011/api
```

> ⚠️ **Important:** Never commit `.env` with real credentials. The values above are for local development only.

---

## 📚 API Documentation

**Base URL:** `http://localhost:3011/api`

### Health Check

| Method | Endpoint       | Description                       | Auth |
| ------ | -------------- | --------------------------------- | ---- |
| `GET`  | `/api/health`  | Check API & database connectivity | ❌   |

### Transactions

| Method   | Endpoint                | Description                          | Auth |
| -------- | ----------------------- | ------------------------------------ | ---- |
| `POST`   | `/api/transactions`     | Create a new transaction             | ❌   |
| `GET`    | `/api/transactions`     | List all transactions (with filters) | ❌   |
| `GET`    | `/api/transactions/:id` | Get a single transaction by ID       | ❌   |
| `PUT`    | `/api/transactions/:id` | Update a transaction by ID           | ❌   |
| `DELETE` | `/api/transactions/:id` | Delete a transaction by ID           | ❌   |

#### Query Parameters for `GET /api/transactions`

| Parameter   | Type     | Default  | Description                          |
| ----------- | -------- | -------- | ------------------------------------ |
| `page`      | integer  | `1`      | Page number                          |
| `limit`     | integer  | `10`     | Items per page                       |
| `category`  | string   | —        | Filter by category name              |
| `startDate` | string   | —        | Filter from date (`YYYY-MM-DD`)      |
| `endDate`   | string   | —        | Filter to date (`YYYY-MM-DD`)        |
| `minAmount` | number   | —        | Minimum amount filter                |
| `maxAmount` | number   | —        | Maximum amount filter                |
| `search`    | string   | —        | Search in description (ILIKE)        |
| `sort`      | string   | `date`   | Sort column: `date`, `amount`, `description`, `category_name` |
| `order`     | string   | `desc`   | Sort order: `asc` or `desc`          |

### Budget Allocation

| Method | Endpoint                | Description                           | Auth |
| ------ | ----------------------- | ------------------------------------- | ---- |
| `POST` | `/api/budget/allocate`  | Calculate 50/30/20 budget allocation  | ❌   |

<details>
<summary><strong>📋 Request & Response Examples</strong></summary>

#### Create Transaction

```bash
curl -X POST http://localhost:3011/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "description": "Makan siang",
    "category_id": 2,
    "date": "2026-04-29"
  }'
```

```json
{
  "status": "success",
  "message": "Transaction created successfully",
  "data": {
    "id": 1,
    "amount": "50000.00",
    "description": "Makan siang",
    "category_id": 2,
    "date": "2026-04-29",
    "created_at": "2026-04-29T07:00:00.000Z",
    "updated_at": "2026-04-29T07:00:00.000Z"
  }
}
```

#### Budget Allocation

```bash
curl -X POST http://localhost:3011/api/budget/allocate \
  -H "Content-Type: application/json" \
  -d '{ "income": 10000000 }'
```

```json
{
  "status": "success",
  "message": "Budget allocation calculated (50/30/20 rule)",
  "data": {
    "income": { "raw": 10000000, "formatted": "Rp 10.000.000" },
    "allocation": {
      "needs":   { "percentage": 50, "amount": 5000000, "formatted": "Rp 5.000.000" },
      "wants":   { "percentage": 30, "amount": 3000000, "formatted": "Rp 3.000.000" },
      "savings": { "percentage": 20, "amount": 2000000, "formatted": "Rp 2.000.000" }
    }
  }
}
```

#### Error Response Format

```json
{
  "status": "fail",
  "message": "Validation Failed",
  "data": null,
  "errors": [
    { "field": "amount", "message": "Amount must be positive" },
    { "field": "date", "message": "Format tanggal harus YYYY-MM-DD" }
  ]
}
```

</details>

---

## 📁 Project Structure

```
finance-tracker/
├── docker-compose.yml          # Orchestrates 3 services (frontend, backend, db)
├── .env.example                # Environment variable template
├── README.md                   # You are here
│
├── backend/
│   ├── Dockerfile              # Node.js 20 Alpine image
│   ├── package.json            # Express, pg, cors, zod
│   ├── app.js                  # Main server: routes, DB init, error handling
│   └── utils/
│       ├── errors.js           # Custom error classes (NotFoundError, ValidationError)
│       └── logger.js           # Request error logging utility
│
└── frontend/
    ├── Dockerfile              # Node.js 20 Alpine image
    ├── package.json            # Next.js 16, React 19, Axios, TypeScript
    ├── tsconfig.json           # TypeScript configuration
    ├── .env.local              # Frontend environment (API URL)
    └── src/
        ├── app/
        │   ├── layout.tsx      # Root layout with metadata
        │   ├── page.tsx        # Main page: transaction list & forms
        │   └── globals.css     # Global styles
        └── services/
            └── api.ts          # Axios API client & service functions
```

---

## 💻 Development

### Running Locally (Without Docker)

If you prefer running services directly on your machine:

#### 1. Start PostgreSQL

Use a local PostgreSQL instance or start only the database container:

```bash
docker compose up -d db
```

#### 2. Start Backend

```bash
cd backend
npm install

# Set environment variables
export DATABASE_URL=postgresql://admin:password123@localhost:5432/db_transaksi
export PORT=3011

npm run dev    # Starts with nodemon (auto-reload on file changes)
```

#### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev    # Next.js dev server at http://localhost:3010
```

### Code Style

- **Backend:** JavaScript (ES6+) with Zod schema validation
- **Frontend:** TypeScript with Next.js App Router
- **Linting:** `npm run lint` (frontend, via Next.js ESLint config)

---

## 🧪 Testing

### Manual API Testing

```bash
# Health check
curl http://localhost:3011/api/health

# Create a transaction
curl -X POST http://localhost:3011/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"amount": 25000, "description": "Kopi", "category_id": 2, "date": "2026-04-29"}'

# Get all transactions with filters
curl "http://localhost:3011/api/transactions?category=Makanan&sort=amount&order=desc"

# Budget allocation
curl -X POST http://localhost:3011/api/budget/allocate \
  -H "Content-Type: application/json" \
  -d '{"income": 8000000}'
```

### Automated Testing (Future Enhancement)

```bash
# Once test framework is added:
cd backend && npm test
cd frontend && npm test
```

> 💡 **Recommended test setup:** Jest + Supertest (backend), Jest + React Testing Library (frontend)

---

## 🚢 Deployment

### Production with Docker

```bash
# 1. Build production images
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 2. Verify deployment
curl https://your-domain.com/api/health
```

### Production Checklist

- [ ] Change default database credentials in `.env`
- [ ] Set `NODE_ENV=production`
- [ ] Use `npm start` instead of `npm run dev` in Dockerfiles
- [ ] Add SSL/TLS termination (nginx reverse proxy or cloud load balancer)
- [ ] Set up database backups (pg_dump cron job or managed DB)
- [ ] Configure CORS `origin` to your production domain
- [ ] Add rate limiting middleware (e.g., `express-rate-limit`)
- [ ] Set up logging service (e.g., Datadog, ELK, or CloudWatch)
- [ ] Enable health check in docker-compose for auto-restart

### Deploy to Cloud Platforms

<details>
<summary><strong>Railway / Render / Fly.io</strong></summary>

1. Push code to GitHub
2. Connect repository to your chosen platform
3. Set environment variables from `.env.example`
4. Deploy — the platform will detect `docker-compose.yml` or `Dockerfile` automatically

</details>

<details>
<summary><strong>AWS (ECS / EC2)</strong></summary>

1. Push Docker images to ECR
2. Create ECS task definition with the 3 services
3. Use RDS for managed PostgreSQL
4. Set up ALB for load balancing

</details>

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### Getting Started

1. **Fork** the repository
2. **Create** a feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit** your changes with clear messages
   ```bash
   git commit -m "feat: add monthly spending chart"
   ```
4. **Push** to your branch
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open** a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix     | Usage                                  |
| ---------- | -------------------------------------- |
| `feat:`    | New feature                            |
| `fix:`     | Bug fix                                |
| `docs:`    | Documentation changes                  |
| `style:`   | Code style (formatting, no logic change) |
| `refactor:`| Code refactoring                       |
| `test:`    | Adding or updating tests               |
| `chore:`   | Maintenance tasks                      |

### Ideas for Contribution

- 🔐 Add JWT authentication
- 📊 Add charts/graphs for spending visualization
- 📱 Make frontend responsive/PWA
- 🧪 Add unit & integration tests
- 📤 Export transactions to CSV/PDF
- 🌐 Add i18n (multi-language support)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by [Andre L](https://github.com/andrel)**

⭐ Star this repo if you find it useful!

</div>
