# Brightloop 

### Subscription Management Platform

Brightloop is a centralized subscription management platform designed to help businesses manage customers, products, subscription plans, quotations, invoices, payments, and business performance.

Built for **Odoo Hackathon 2026**, the project focuses on simplifying subscription workflows and bringing essential business operations together in one place.

---

## Overview

Managing subscriptions involves multiple tasks, from handling customer information to tracking recurring payments and generating invoices.

Brightloop brings these operations into a single platform, helping businesses keep their information organized and monitor their subscription activities more efficiently.

## Features

- **Dashboard** — View business activity, revenue statistics, and subscription insights.
- **Customer Management** — Create, update, search, and manage customer records.
- **Product Management** — Organize products and their associated subscription plans.
- **Subscription Management** — Track subscription status, billing periods, and lifecycle changes.
- **Quotation Management** — Create and manage customer quotations.
- **Invoice Management** — Generate and track invoices and outstanding balances.
- **Payment Tracking** — Monitor payment records and payment status.
- **Discount Management** — Manage discounts associated with business transactions.
- **Reports & Analytics** — View business reports and subscription performance.
- **Workspace Management** — Manage workspace members, invitations, and access.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT |
| API | REST API |

## Project Structure

```text
Brightloop/
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   │
│   ├── src/
│   │   ├── common/
│   │   ├── database/
│   │   └── modules/
│   │
│   ├── .env.example
│   ├── docker-compose.yml
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   ├── services/
│   │   └── styles.css
│   │
│   ├── package.json
│   └── readme.md
│
├── .gitignore
├── LICENSE
└── README.md
```

## Getting Started

Follow these steps to run Brightloop locally.

### Prerequisites

Make sure you have the following installed:

- Node.js 20 or later
- npm
- Docker Desktop
- Git

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd Odoo-2026-main
```

### 2. Set Up the Backend

Open a terminal and navigate to the backend directory.

```bash
cd backend
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Configure your `.env` file with your local database password and secure JWT secrets.

Also add:

```env
POSTGRES_PASSWORD=your_local_database_password
```

Make sure `DATABASE_URL` uses the same PostgreSQL password.

### 3. Start the Database

Run PostgreSQL using Docker Compose:

```bash
docker compose up -d postgres
```

### 4. Initialize the Database

Apply database migrations and generate the Prisma Client.

```bash
npm run prisma:migrate:deploy
npm run prisma:generate
```

Insert the development sample data:

```bash
npm run db:seed
```

### 5. Start the Backend Server

```bash
npm run start:dev
```

The backend API will be available at:

`http://localhost:3000/api/v1`

Health check:

`http://localhost:3000/api/v1/health`

### 6. Set Up the Frontend

Open a second terminal.

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at:

`http://localhost:5173`

The frontend connects to the backend at `http://localhost:3000/api/v1` by default.

---

## Environment Configuration

The backend uses environment variables for database connections, authentication, and application configuration.

Important variables include:

| Variable | Purpose |
|---|---|
| `PORT` | Backend server port |
| `DATABASE_URL` | PostgreSQL connection URL |
| `POSTGRES_PASSWORD` | Local Docker database password |
| `JWT_ACCESS_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `CORS_ORIGINS` | Allowed frontend origins |

Never commit your `.env` file or expose production credentials.

## Useful Commands

### Backend

| Command | Description |
|---|---|
| `npm run start:dev` | Start development server |
| `npm run build` | Build backend |
| `npm run start:prod` | Start production server |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:validate` | Validate database schema |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed sample data |
| `npm run db:smoke` | Run database smoke tests |

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build frontend |
| `npm run preview` | Preview production build |

## Security

Brightloop includes authentication, workspace-based access control, request validation, and protected API endpoints.

Sensitive configuration is managed through environment variables. Development credentials should be changed before deploying the application.

## Project Goal

The goal of Brightloop is to make subscription management simpler and more accessible by bringing essential business operations into one organized platform.

---

**Brightloop — Simplifying Subscription Management.**

*Developed for Odoo Hackathon 2026.*
