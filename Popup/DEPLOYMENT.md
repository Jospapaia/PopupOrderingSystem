# Deployment Options

## Architecture

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React + Vite | Static build, SPA rewrite via `vercel.json` |
| Backend | FastAPI + Gunicorn | Dockerized, runs migrations on startup |
| Database | PostgreSQL | Runs alongside backend in Docker |

---

## Option 1 — Vercel (frontend) + Railway (backend)

Already configured in the repo (`vercel.json`, `Dockerfile`).

**Cost:** Railway is ~$5–10/mo after a 30-day trial. No cold starts on paid plan.

### Frontend — Vercel
1. Connect the GitHub repo to [vercel.com](https://vercel.com)
2. Set root directory to `frontend`
3. Add environment variable: `VITE_API_URL=https://your-railway-url.up.railway.app`
4. Vercel auto-deploys on every push to `main`

### Backend — Railway
1. Create a new project at [railway.app](https://railway.app)
2. Add a **PostgreSQL** plugin — Railway sets `DATABASE_URL` automatically
3. Connect the GitHub repo
4. Set environment variables:
   - `ADMIN_PASSWORD` — choose a strong password
   - `CORS_ORIGINS` — `https://your-vercel-app.vercel.app`
5. Override start command:
   ```
   sh -c "alembic upgrade head && gunicorn app.main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000"
   ```

---

## Option 2 — Vercel (frontend) + Render (backend)

Same frontend setup as Option 1. Backend on [render.com](https://render.com) instead of Railway.

**Cost:** Render Starter web service ~$7/mo. Free Postgres tier has a 90-day expiry.

1. Create a new **Web Service** on Render, connect the GitHub repo
2. Add a **PostgreSQL** database
3. Set the same env vars as above
4. Set the same start command as above

---

## Option 3 — Vercel (frontend) + Hetzner VPS (backend) ✅ Best value

**~€4/mo total.** Frontend stays on Vercel for free. Backend + database run on a Hetzner VPS using the existing `docker-compose.yml`. No cold starts, no usage metering, full control.

### What this looks like

```
Customers → vercel.app (frontend, free)
                ↓ API calls
          hetzner-server-ip (backend :443 via nginx → :8002)
                ↓
          PostgreSQL (same server, Docker)
```

### What you need to do — step by step

#### 1. Accounts and prerequisites
- [ ] Create a [Hetzner account](https://www.hetzner.com/cloud) (requires credit card)
- [ ] Have a domain name, **or** be comfortable using a raw IP for the API (HTTPS won't work without a domain)
- [ ] Have a terminal open (Windows Terminal / PowerShell is fine)

#### 2. Create the server
- [ ] In Hetzner Cloud console → **New Project** → **Add Server**
- [ ] Location: pick the closest region (e.g. Nuremberg or Helsinki)
- [ ] Image: **Ubuntu 24.04**
- [ ] Type: **CX11** (2 vCPU, 2 GB RAM, €3.79/mo) — sufficient for this app
- [ ] SSH keys: generate one locally and paste the public key in, OR use Hetzner's root password option
- [ ] Click **Create & Buy**
- [ ] Note the server's public IP address

#### 3. Connect to the server
```bash
ssh root@YOUR_SERVER_IP
```

#### 4. Install Docker
```bash
curl -fsSL https://get.docker.com | sh
```
Docker Compose is included as `docker compose` (v2).

#### 5. Clone the repo onto the server
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git /app
cd /app
```

#### 6. Create the `.env` file
```bash
cp .env.example .env
nano .env
```
Set these values:
```
DATABASE_URL=postgresql://popup:popup@db:5432/popup
ADMIN_PASSWORD=choose-something-strong
CORS_ORIGINS=https://your-vercel-app.vercel.app
```
Save and exit (`Ctrl+X → Y → Enter`).

#### 7. Start the backend + database
```bash
docker compose up -d
```
Check it's running:
```bash
curl http://localhost:8002/health
# → {"status":"ok"}
```

#### 8. Set up nginx as a reverse proxy (for HTTPS)

Install nginx:
```bash
apt install nginx certbot python3-certbot-nginx -y
```

Create a config file (replace `api.yourdomain.com` with your subdomain):
```bash
nano /etc/nginx/sites-available/popup
```
Paste:
```nginx
server {
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
Enable it and get an SSL certificate:
```bash
ln -s /etc/nginx/sites-available/popup /etc/nginx/sites-enabled/
certbot --nginx -d api.yourdomain.com
```
Certbot will configure HTTPS automatically and auto-renew the certificate.

#### 9. Point your DNS
- [ ] In your domain registrar, add an **A record**: `api.yourdomain.com → YOUR_SERVER_IP`
- [ ] Wait a few minutes for DNS to propagate

#### 10. Update Vercel
- [ ] In Vercel dashboard → Project → Settings → Environment Variables
- [ ] Set `VITE_API_URL=https://api.yourdomain.com`
- [ ] Redeploy (or push a commit to trigger auto-deploy)

#### 11. Update CORS on the server
```bash
cd /app
nano .env
# Update CORS_ORIGINS=https://your-vercel-app.vercel.app
docker compose up -d --force-recreate backend
```

---

### Ongoing maintenance on Hetzner

**Deploy a new version:**
```bash
ssh root@YOUR_SERVER_IP
cd /app && git pull
docker compose up -d --build backend
```

**View backend logs:**
```bash
docker compose logs -f backend
```

**Database backup:**
```bash
docker exec popup-db-1 pg_dump -U popup popup > backup.sql
```

---

## Before Going Live Checklist

- [ ] `ADMIN_PASSWORD` is not `changeme`
- [ ] `VITE_API_URL` in Vercel points to the live backend
- [ ] `CORS_ORIGINS` on the backend includes the Vercel production URL
- [ ] `curl https://api.yourdomain.com/health` returns `{"status":"ok"}`
- [ ] Product images uploaded via admin panel (see note below)

---

## ⚠️ Product Images

Images are stored on the backend container filesystem (`static/uploads/`). On Hetzner they **persist** across restarts because the container mounts the host filesystem. They are only lost if you run `docker compose down -v` (which removes volumes) or manually delete them.

On Railway/Render the filesystem is ephemeral — images are lost on every redeploy. Re-upload via the admin panel after each deploy, or migrate to S3/Cloudinary for a permanent fix.
