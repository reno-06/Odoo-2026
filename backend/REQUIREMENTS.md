# Backend requirements

This backend uses Node.js and npm; `package.json` and `package-lock.json` are
the authoritative dependency manifests. This file summarizes the runtime and
development requirements.

## Runtime

- Node.js 20 or newer
- npm
- PostgreSQL 16
- Environment configuration copied from `.env.example` to `.env`
- Database URL and JWT access/refresh secrets configured in `.env`

## Production dependencies

- `@nestjs/common` `^11.0.11`
- `@nestjs/config` `^4.0.1`
- `@nestjs/core` `^11.0.11`
- `@nestjs/platform-express` `^11.0.11`
- `@nestjs/throttler` `^6.7.1`
- `@prisma/client` `6.12.0`
- `class-transformer` `^0.5.1`
- `class-validator` `^0.14.1`
- `dotenv` `^16.4.7`
- `joi` `^17.13.3`
- `nodemailer` `^10.3.1`
- `reflect-metadata` `^0.2.2`
- `rxjs` `^7.8.2`

## Development dependencies

- `@nestjs/cli` `^11.0.5`
- `@types/express` `^5.0.0`
- `@types/node` `^22.13.10`
- `@types/nodemailer` `^6.4.17`
- `prettier` `^3.5.3`
- `prisma` `6.12.0`
- `ts-node` `^10.9.2`
- `tsconfig-paths` `^4.2.0`
- `typescript` `~5.7.3`

## Install and initialize

Run from this directory:

```powershell
npm ci
npm run prisma:generate
npm run prisma:migrate:deploy
```

For local development, start PostgreSQL with `docker compose up -d postgres`,
then run `npm run db:seed` to load development data.

## Available scripts

- `npm run build` — compile the NestJS application
- `npm run start` — start NestJS
- `npm run start:dev` — start in watch mode
- `npm run start:prod` — run the compiled application
- `npm run prisma:generate` — generate Prisma Client
- `npm run prisma:validate` — validate the Prisma schema
- `npm run prisma:migrate:dev` — create/apply a development migration
- `npm run prisma:migrate:deploy` — apply checked-in migrations
- `npm run prisma:studio` — open Prisma Studio
- `npm run db:seed` — seed development data
- `npm run db:smoke` — run database CRUD smoke checks
