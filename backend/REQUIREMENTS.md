# Backend Requirements

## Requirements

- Node.js (v20 or later)
- npm (latest version)
- PostgreSQL (v15 or later)
- Internet connection

## Dependencies

- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL Client
- CORS
- dotenv
- bcrypt
- JSON Web Token (JWT)

## Development Dependencies

- ts-node
- nodemon
- TypeScript
- Prisma CLI

## Installation

```bash
npm install
```

## Environment Setup

Create a `.env` file and configure:

```env
DATABASE_URL="your_postgresql_connection_url"
PORT=5000
JWT_SECRET="your_secret_key"
```

## Database Setup

```bash
npx prisma generate
npx prisma migrate dev
```

## Run Backend

```bash
npm run dev
```

## Production Build

```bash
npm run build
npm start
```
