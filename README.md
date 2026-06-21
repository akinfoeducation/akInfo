# AKT Institute OS

Institute CRM & Management System — Spring Boot + Next.js + PostgreSQL

---

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 3.3 (Java 17) |
| Frontend | Next.js 15 (React) |
| Database | PostgreSQL 16 |
| Search | Meilisearch |
| Reverse Proxy | Nginx |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions → Hostinger VPS |

---

## Local Development

### Prerequisites
- Java 17
- Node.js 20
- Docker Desktop

### Start infrastructure (DB + Meilisearch)
```bash
docker compose -f docker-compose.dev.yml up -d postgres meilisearch
```

### Backend
```bash
cd backend/aktInstituteOS
cp .env.local.example .env.local    # fill in values
./gradlew bootRun
# Runs on http://localhost:8080
# Swagger UI: http://localhost:8080/swagger-ui.html
```

### Frontend
```bash
cd frontend/aktInstituteOS
npm install
cp .env.local.example .env.local    # set BACKEND_URL=http://localhost:8080
npm run dev
# Runs on http://localhost:3000
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values.

| Variable | Description |
|----------|-------------|
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `JWT_SECRET` | JWT signing secret (min 64 chars) — `openssl rand -base64 64` |
| `MEILI_MASTER_KEY` | Meilisearch master key — `openssl rand -hex 32` |
| `MAIL_USERNAME` | Gmail address for notifications |
| `MAIL_PASSWORD` | Gmail App Password (not regular password) |
| `CORS_ALLOWED_ORIGINS` | Your production domain, e.g. `https://crm.aktinstitute.com` |

---

## Production Deployment

### First-time VPS setup

SSH into your Hostinger VPS, then:

```bash
# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/akinfoeducation/akInfo/main/scripts/setup-vps.sh | bash
```

This installs Docker, clones the repo, and configures the firewall.

### GitHub Secrets to configure

Go to **GitHub → akInfo → Settings → Secrets and variables → Actions**

Add these secrets:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | Your VPS IP address |
| `VPS_USER` | `root` (Hostinger default) |
| `VPS_SSH_KEY` | Private SSH key for VPS access |
| `VPS_PORT` | `22` (optional, default) |

### Configure production .env on VPS

```bash
ssh root@YOUR_VPS_IP
nano /opt/akinfo/.env   # fill in all production values
```

### Set up SSL (first time only)

```bash
bash /opt/akinfo/scripts/setup-ssl.sh yourdomain.com your@email.com
```

### Start all services

```bash
cd /opt/akinfo
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Verify everything is running

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

---

## CI/CD Pipelines

### How it works

```
Push to main (backend/**) → GitHub Actions → Build JAR → Build Docker image
                           → Push to ghcr.io → SSH to VPS → Pull image → Restart container

Push to main (frontend/**) → GitHub Actions → Type check → Build Docker image
                            → Push to ghcr.io → SSH to VPS → Pull image → Restart container
```

### Independent deployments

- Backend changes → only backend pipeline runs
- Frontend changes → only frontend pipeline runs
- Both can run simultaneously without conflict

### Manual deploy (without pushing code)

Go to **GitHub → Actions → Backend CI/CD → Run workflow** (or Frontend CI/CD)

---

## Useful Commands on VPS

```bash
# View running containers
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# View backend logs (live)
docker logs -f akt-backend

# View frontend logs
docker logs -f akt-frontend

# View nginx logs
docker logs -f akt-nginx

# Restart a single service
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart backend

# Pull and restart everything manually
cd /opt/akinfo
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Database backup
docker exec akt-postgres pg_dump -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d).sql
```
