# TicketWave

Event management app: Spring Boot API + React (Vite) + PostgreSQL + ActiveMQ.

For testing purposes, the following users can be used:
| Email             | Pass | Role    |
| ----------------- | ---- | ------- |
| user@gmail.com    | 1234 | Regular |
| admin@example.com | 1234 | Admin   |

## Option A — Everything in Docker

### Prerequisites

- **Docker** and Docker Compose (for running dependencies or the full stack)

From the repo root:

```bash
make up
```

Waits for Postgres and ActiveMQ, then starts backend and frontend. Data persists in a named volume until you run `make clean`.

| Service  | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| API      | http://localhost:8080 (e.g. `/api/events`) |
| ActiveMQ | http://localhost:8161 — `admin` / `admin` |

Stop: `make down`. Remove data volumes: `make clean`.

## Option B — Local app, dependencies in Docker

### Prerequisites
- **Java 17+** and **Maven** (to run the backend outside Docker)
- **Node.js** and **npm** (to run the frontend outside Docker)

One command (starts Postgres + ActiveMQ, then backend and frontend; Ctrl+C stops the app processes):

```bash
make local-up
```

**Or** run pieces yourself: `make local-deps`, then in separate terminals `make backend-run` and `make frontend-dev`.

The API uses http://localhost:8080. The Vite dev URL is printed in the terminal (usually http://localhost:5173). Stop only the DB/broker: `make local-deps-stop` (after you stop the app).

## Environment

For Docker, connection settings are in `docker-compose.yml`. For local runs, you can override with the same variable names as in the Compose file (`DATABASE_URL`, `JWT_SECRET`, etc.); see `backend/src/main/resources/application.properties` for property keys and dev defaults.
