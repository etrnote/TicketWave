SHELL := /bin/sh

.PHONY: help up down clean clean-all build backend-build backend-test frontend-build local-deps local-deps-stop backend-run frontend-dev local-up

help:
	@printf "%s\n" "Targets:" \
		"  make local-up        Start deps + backend + frontend (one command for local dev)" \
		"  make up              Start all services via Docker Compose (DB data persists)" \
		"  make down            Stop services, keep DB data" \
		"  make clean           Stop services and delete volumes + containers" \
		"  make clean-all       Like clean but also removes images" \
		"  make build           Build backend and frontend" \
		"  make local-deps      Start Postgres + ActiveMQ for local dev" \
		"  make local-deps-stop Stop local dev containers" \
		"  make backend-test    Compile backend and run unit tests" \
		"  make backend-run     Run Spring Boot backend locally" \
		"  make frontend-dev    Run Vite dev server locally"

up:
	-docker rm -f ticketwave-postgres ticketwave-activemq ticketwave-backend ticketwave-frontend 2>/dev/null
	docker compose down --remove-orphans
	docker compose up --build

down:
	docker compose down

clean:
	docker compose down --volumes --remove-orphans
	-docker rm -f ticketwave-postgres ticketwave-activemq ticketwave-backend ticketwave-frontend 2>/dev/null

clean-all: clean
	docker compose down --rmi all

build: backend-build frontend-build

backend-build:
	cd backend && mvn clean package

backend-test:
	cd backend && mvn clean test

frontend-build:
	cd frontend && npm install && npm run build

local-deps:
	docker run -d --name ticketwave-postgres -p 5432:5432 \
		-e POSTGRES_DB=ticketwave -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
		postgres:16-alpine
	docker run -d --name ticketwave-activemq -p 61616:61616 -p 8161:8161 \
		-e ARTEMIS_USER=admin -e ARTEMIS_PASSWORD=admin \
		apache/activemq-artemis:latest

local-deps-stop:
	-docker rm -f ticketwave-postgres ticketwave-activemq

backend-run:
	cd backend && mvn spring-boot:run

frontend-dev:
	cd frontend && npm install && npm run dev

local-up:
	@echo "Starting local dependencies..."
	@-docker rm -f ticketwave-postgres ticketwave-activemq 2>/dev/null; true
	$(MAKE) local-deps
	@echo "Waiting for dependencies to be ready (5s)..."
	@sleep 5
	@echo "Starting backend + frontend — Ctrl+C stops all"
	@trap 'kill 0' INT TERM; \
		(cd backend && mvn spring-boot:run) & \
		(cd frontend && npm install && npm run dev); \
		wait
