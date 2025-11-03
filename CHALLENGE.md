## Full‑Stack Coding Challenge

Welcome! This repository contains a small NestJS + TypeORM backend to extend.
Your goal is to design clean, testable code, implement requested features end‑to‑end, and document decisions where helpful.

### Tech Stack
- **Backend**: NestJS, TypeORM, PostgreSQL
- **Frontend**: Flutter (separate project you will create)

## Prerequisites
- Node.js 20+
- Docker (to run PostgreSQL locally)
- npm
- Flutter 

## Getting Started (Backend)
1. Install dependencies
   - `npm install`

2. Start PostgreSQL (via Docker)
   - `docker run --name bears-db -e POSTGRES_PASSWORD=password -e POSTGRES_USER=postgres -e POSTGRES_DB=postgres -p 5432:5432 -d postgres:16`
   - The backend expects by default:
     - host: `localhost`
     - port: `5433`
     - user: `postgres`
     - password: `password`
     - database: `postgres`

3. Run the app (runs migrations on startup)
   - `npm run start:dev`   

4. Existing endpoint example
   - `GET http://localhost:3000/bear/size-in-range/:start/:end` returns bear names with size in range.

### Migrations
- Run migrations (executed automatically on app start). To run manually:
  - `npm run migration:run`

### Seed Data
- You may use `src/persistence/sample-data/bears.sql` as a reference or create your own SQL scripts.
- Apply with your preferred tool (e.g., `psql`, a DB client) after the database is up.

## The Challenge

### 1) Model colors and relationships
- A bear can have one or multiple colors.
- Update the data model and migrations accordingly
- Populate new tables with sample data (SQL script acceptable).

### 2) CRUD APIs
- Implement CRUD endpoints for:
  - Bears
  - Colors
- Business rule: deleting a color deletes all bears associated with that color.

### 3) Search bears by color(s)
- Add an endpoint to search for bears by one or more colors

### 4) Tests
- Extend `src/controller/bear.controller.spec.ts` with tests for your new endpoints and behaviors.

### 5) Flutter frontend
- Create a Flutter app that consumes your backend.
- Implement as much functionality as you can (structure and code quality matter more than completeness).
- Tests are a plus.

## Expectations & Evaluation
- **Code quality**: readability, structure, naming, and maintainability
- **API design**: clear contracts, proper status codes, validation
- **Database design**: correct relationships and constraints
- **Testing**: meaningful tests that validate behavior
- **Frontend**: architecture, state management, UI/UX basics, and API integration
- **Documentation**: concise instructions and rationale where helpful


## Useful Scripts

- `npm run start:dev` – start backend (dev)
- `npm test` – run tests
- `npm run migration:generate -- src/persistence/migrations/<Name>` – generate migration
- `npm run migration:run` – run migrations

## Submission
- Instructions to run the backend and the Flutter app
- Any notes on tradeoffs/assumptions
- If using a separate repo for Flutter, include the link