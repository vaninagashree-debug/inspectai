# VisionGuard AI - Deployment & Containerization Guide

This document describes the steps to build, configure, and deploy the VisionGuard AI automated quality control platform inside Docker containers.

---

## 1. Prerequisites
- Docker (v20.10 or higher)
- Docker Compose (v2.0 or higher)

---

## 2. Docker Configuration Files

The deployment artifacts are housed in the `docker/` workspace folder:
1. `docker/Dockerfile`: Base builder using Python 3.12-slim. Installs required shared libraries (`libgl1-mesa-glx` and `libglib2.0-0` for OpenCV graphics commands), downloads lightweight PyTorch CPU wheels, and bundles API services.
2. `docker/docker-compose.yml`: Multi-container composition compiling Backend, PostgreSQL, and Redis caching.

---

## 3. Deployment Commands

### 3.1 Start Multi-Container Stack
To build images and spin up the complete services stack (FastAPI, Redis, PostgreSQL) in the background:
```bash
cd docker
docker compose up -d --build
```

### 3.2 Verify Container Status
Confirm all three containers are active:
```bash
docker compose ps
```
Standard ports mapped:
* **FastAPI Backend**: `http://localhost:8000`
* **PostgreSQL Database**: `localhost:5432`
* **Redis Cache**: `localhost:6379`

### 3.3 Access Logs
To view runtime outputs from the uvicorn API:
```bash
docker compose logs -f backend
```

### 3.4 Stop Stack
To spin down and remove containers while preserving data volumes:
```bash
docker compose down
```
To purge all stored datasets, model checkpoints, and database records alongside containers:
```bash
docker compose down -v
```
