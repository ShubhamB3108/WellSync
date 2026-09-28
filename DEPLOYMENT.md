# WellSync 🛢️⚡ Deployment Guide

This document provides production deployment procedures for **WellSync** — the AI-Enabled Well-to-Surface Digital Twin for CSS Cycle & Sucker Rod Pump Optimization.

---

## 📋 Architecture Overview

WellSync is composed of three interconnected services:

```mermaid
flowchart LR
    Browser["Client Browser"] -->|HTTP / Port 80, 5173| Nginx["Nginx Reverse Proxy & Static SPA"]
    Nginx -->|/api/* & /health| FastAPI["FastAPI Backend (Port 8000)"]
    FastAPI -->|PostgreSQL Wire (Port 5432)| DB[("TimescaleDB / PostgreSQL")]
    FastAPI --> ML["Pre-Trained Dyno XGBoost/GB Model"]
```

1. **Frontend**: React 19 + TypeScript + Vite, served via **Nginx** (Alpine) with HTTP compression, security headers, and reverse proxy for `/api/` and `/health`.
2. **Backend**: FastAPI + Python 3.11/3.13 + Uvicorn, running physics reservoir models, ML dynamometer classifier, and APScheduler simulation engine.
3. **Database**: PostgreSQL 16 with TimescaleDB extension for time-series sensor telemetry and historical CSS cycles.

---

## 🚀 Option 1: Docker Compose Deployment (Recommended)

Docker Compose is the fastest and most reliable deployment method for single-node servers, cloud VMs (AWS EC2, Azure VM, GCP Compute Engine, DigitalOcean Droplet), or on-premise servers.

### Prerequisites
- Docker Engine 24.0+
- Docker Compose v2.20+
- At least 2 CPU cores and 4 GB RAM

### Step 1: Clone the Repository & Setup Environment

```bash
git clone https://github.com/your-org/wellSync.git
cd wellSync

# Create production environment file from template
cp .env.example .env
```

### Step 2: Configure Environment Variables

Edit `.env` to configure your production secrets:

```ini
# Production Secret (Generate with: openssl rand -hex 32)
JWT_SECRET=your-32-character-or-longer-production-secret-here

# Database Credentials
POSTGRES_USER=wellsync
POSTGRES_PASSWORD=choose_a_strong_database_password
POSTGRES_DB=wellsync
DATABASE_URL=postgresql://wellsync:choose_a_strong_database_password@db:5432/wellsync

# Simulator configuration:
# Keep 'true' for standalone demo/synthetic data or 'false' when connected to live SCADA
SIMULATOR_ENABLED=true
SIMULATOR_TICK_SECONDS=10

# Ports
FRONTEND_PORT=80
BACKEND_PORT=8000
DB_PORT=5432
```

### Step 3: Build & Launch Services

```bash
# Build images and start containers in detached mode
docker compose up -d --build
```

### Step 4: Verify Deployment Health

```bash
# Check running containers
docker compose ps

# Check backend health check
curl http://localhost:8000/health
# Expected JSON output:
# {"status":"healthy","db":"ok","simulator":"running","model_loaded":true,"field":"Baghewala, Rajasthan (Jodhpur Sandstone)"}

# View container logs
docker compose logs -f backend
docker compose logs -f frontend
```

### Step 5: Access the Application

- **Web Dashboard:** `http://<your-server-ip>` or `http://localhost`
- **FastAPI OpenAPI Docs:** `http://<your-server-ip>:8000/docs`

---

## ☁️ Option 2: Render Deployment (1-Click Blueprint)

The repository includes a ready-to-use Render Blueprint (`render.yaml`) that provisions the complete architecture automatically.

### Automated Deployment Steps:
1. Sign in to your **[Render Dashboard](https://dashboard.render.com)**.
2. Click **New +** at the top right and select **Blueprint**.
3. Connect your GitHub account and choose repository: **`ShubhamB3108/WellSync`**.
4. Render will parse `render.yaml` and show the 3 resources to create:
   - 🐘 **`wellsync-db`**: Managed PostgreSQL database.
   - ⚡ **`wellsync-backend`**: FastAPI Web Service (installs requirements, trains ML classifier, auto-connects to database).
   - 🌐 **`wellsync-frontend`**: React SPA (installs packages, builds bundle, configures SPA client routing).
5. Click **Apply**.
6. Once deployed, Render gives you live public HTTPS URLs for both frontend and backend.

> [!TIP]
> If Render assigns a customized subdomain to your backend (e.g., `wellsync-backend-abcd.onrender.com`), verify that `VITE_API_URL` under **wellsync-frontend** > **Environment** matches `https://<your-backend-subdomain>.onrender.com/api/v1`.


---

## 🏢 Option 3: Bare-Metal Linux VM Deployment (Systemd + Nginx)

Used for on-premise deployments at OIL facilities or enterprise Linux environments (Ubuntu 22.04 / RHEL 9).

### 1. System Dependencies
```bash
sudo apt-get update
sudo apt-get install -y python3-venv python3-pip nodejs npm nginx postgresql
```

### 2. Backend Service Setup
```bash
cd /opt/wellSync

# Setup virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# Train / verify ML model
python backend/ml/train_dyno_classifier.py

# Initialize and seed database
PYTHONPATH=backend python backend/seed.py
```

Create Systemd Service (`/etc/systemd/system/wellsync-backend.service`):
```ini
[Unit]
Description=WellSync FastAPI Application
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/wellSync
Environment="PATH=/opt/wellSync/.venv/bin"
Environment="PYTHONPATH=backend"
Environment="DATABASE_URL=postgresql://wellsync:password@localhost:5432/wellsync"
Environment="JWT_SECRET=production-secret-key-32chars"
ExecStart=/opt/wellSync/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start backend:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now wellsync-backend
```

### 3. Frontend Build & Nginx Host
```bash
cd /opt/wellSync/frontend
npm install
npm run build
sudo cp -r dist/* /var/www/wellsync/
```

Configure Nginx (`/etc/nginx/sites-available/wellsync`):
```nginx
server {
    listen 80;
    server_name wellsync.yourdomain.com;

    client_max_body_size 50M;

    location / {
        root /var/www/wellsync;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:8000/health;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/wellsync /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

---

## 🔒 Production Security Checklist

- [ ] **Change Default JWT Secret**: Ensure `JWT_SECRET` in `.env` is randomly generated and never committed to source control.
- [ ] **Change Database Passwords**: Never use default credentials (`wellsync / wellsync`) in production.
- [ ] **Enable HTTPS / SSL**: Terminate TLS using Let's Encrypt / Certbot on Nginx:
  ```bash
  sudo certbot --nginx -d wellsync.yourdomain.com
  ```
- [ ] **Firewall Ports**: Only expose port `80` (HTTP) and `443` (HTTPS) to the public internet. Keep `5432` (PostgreSQL) and `8000` (FastAPI) internal.
- [ ] **CORS Restrictions**: Set `CORS_ORIGINS` in backend configuration to only allow authorized domain names.

---

## 👥 Pre-Configured Demo Accounts

Once deployed, the following demo roles are pre-seeded in the database:

| Role | Email | Password | Intended Workflow |
|---|---|---|---|
| **Field Engineer** | `field@wellsync.demo` | `wellsync123` | Monitored dyno cards, fluid pound response, SPM approval |
| **Reservoir Lead** | `reservoir@wellsync.demo` | `wellsync123` | CSS cycle parameter optimization, decline curve what-if |
| **Operations Manager** | `ops@wellsync.demo` | `wellsync123` | Field-wide SOR, energy cost per bbl, PDF/CSV report exports |
| **System Administrator** | `admin@wellsync.demo` | `wellsync123` | User provisioning, switching between Simulator & CSV Ingestion |

---

## 💾 Database Maintenance & Backup

### Backup Database
```bash
docker compose exec -t db pg_dump -U wellsync wellsync > wellsync_backup_$(date +%F).sql
```

### Restore Database
```bash
cat wellsync_backup_2026-09-28.sql | docker compose exec -T db psql -U wellsync -d wellsync
```

---

## 🌐 Render Cloud Deployment & Domain Monitor (domain-monitor.io)

Render free-tier web services spin down after **15 minutes** of inactivity. To ensure zero cold-start delay for evaluators, judges, and operators, WellSync is integrated with **Domain Monitor** ([domain-monitor.io](https://domain-monitor.io/)).

### 1. The 15-Minute Render Idle Problem
When a free instance receives no inbound HTTP traffic for 15 minutes, Render spins down the container. The next user who opens the app experiences a 30–60 second cold-start delay while the container boots up.

### 2. Solution: Integrating Domain Monitor (domain-monitor.io)
Domain Monitor performs free, continuous external uptime and ping monitoring. Every periodic probe routes through Render's external ingress router, resetting Render's 15-minute countdown and keeping the backend permanently active.

#### Step-by-Step Setup:
1. Go to [https://domain-monitor.io/](https://domain-monitor.io/) and create a free account (or log in).
2. Click **"Add Monitor"** or navigate to **"Uptime Monitoring"**.
3. Configure the monitor:
   - **Monitor Type**: `HTTP(s)` / `Uptime Monitoring`
   - **Friendly Name**: `WellSync Backend`
   - **URL to Monitor**: `https://wellsync-backend-m8a8.onrender.com/health`
     *(Alternative endpoint: `https://wellsync-backend-m8a8.onrender.com/api/v1/uptime/ping`)*
   - **Check Interval**: `5 or 10 minutes` *(safely below Render's 15-minute timeout)*
   - **HTTP Method**: `GET` or `HEAD`
   - **Accepted Status Code**: `200 OK`
4. Save the monitor. Domain Monitor will now ping the backend around the clock.

### 3. Multi-Layer Anti-Sleep Defense Architecture
WellSync implements a 4-layer defense against Render idle timeouts:
1. **Domain Monitor ([domain-monitor.io](https://domain-monitor.io/))**: External cloud probe pinging `/health` every 5 minutes.
2. **GitHub Actions Workflow** ([`.github/workflows/domain-monitor-keepalive.yml`](file:///d:/wellSync/.github/workflows/domain-monitor-keepalive.yml)): Scheduled cron running `curl` every 10 minutes.
3. **APScheduler Internal Worker** ([`backend/app/jobs/keep_alive.py`](file:///d:/wellSync/backend/app/jobs/keep_alive.py)): Outbound self-ping every 10 minutes through Render's external router.
4. **Browser Dashboard Keeper** ([`frontend/src/App.tsx`](file:///d:/wellSync/frontend/src/App.tsx)): Silently pings `/api/v1/uptime/ping` every 5 minutes while the dashboard is open in any browser tab.

