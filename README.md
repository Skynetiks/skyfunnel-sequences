# **Email Scheduler System**

A multi-step email scheduling and automation system built with **Bun.js**, **PostgreSQL**, and **RabbitMQ**. Each lead progresses through email sequences with retry, interval, and time-window controls.

---

## **Table of Contents**

1. [Project Structure](#project-structure)
2. [Services Overview](#services-overview)
3. [Getting Started](#getting-started)
4. [Environment Variables](#environment-variables)
5. [Running Locally](#running-locally)
6. [Running with Docker](#running-with-docker)
7. [CI/CD](#cicd)
8. [Logs & Monitoring](#logs--monitoring)
9. [Development Notes](#development-notes)

---

## **Project Structure**

```
project-root/
├─ src/
│  ├─ app/
│  │  ├─ scheduler/        # Scheduler entry point and logic
│  │  ├─ pump/             # Moves jobs from Outbox → RabbitMQ
│  │  ├─ worker/           # Consumes RabbitMQ jobs and sends emails
│  ├─ db/                  # pg client & repositories
│  ├─ core/                # Business logic, entities, services
│  ├─ config/              # Env, RabbitMQ, Bun config
│  └─ utils/               # Logger, error handling, time helpers
├─ tests/                  # Unit, integration, e2e
├─ docker.compose.yml
├─ docker-compose.prod.yml
├─ Dockerfile
├─ package.json
├─ bun.lockb
├─ tsconfig.json
└─ README.md
```

---

## **Services Overview**

| Service       | Description                                                                 |
| ------------- | --------------------------------------------------------------------------- |
| **Scheduler** | Scans leads and sequences, enqueues jobs in **Outbox** table.               |
| **Pump**      | Moves unprocessed Outbox jobs to RabbitMQ for delivery.                     |
| **Worker**    | Consumes jobs from RabbitMQ, sends emails, updates lead state, logs events. |

---

## **Getting Started**

1. **Clone the repo**

```bash
git clone https://github.com/your-org/email-scheduler.git
cd email-scheduler
```

2. **Install Bun dependencies**

```bash
bun install
```

3. **Set up TypeScript**

```bash
bun tsc --init
```
