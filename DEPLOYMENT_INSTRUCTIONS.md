# Deployment Instructions - May 19, 2026

## Overview
Three completed tasks ready for deployment:
- **SCRUM-87**: Maintenance Kanban layout fixes
- **SCRUM-81**: World-currencies integration  
- **SCRUM-82**: Admin settings with 4 management tabs

All code committed to `develop` and `master` branches.

---

## Deployment Steps

### Option 1: Manual SSH Deployment (Current Method)

1. **SSH into AWS server:**
```bash
ssh -i ~/.ssh/LightsailDefaultKey-ca-central-1.pem admin@16.54.167.125
```

2. **Deploy to Development Environment (dev.ongdngolu.org):**
```bash
# Pull latest code from develop branch
cd /opt/nglu-app-dev
git pull origin develop

# Copy frontend dist (from your local machine via SCP)
scp -r -i ~/.ssh/LightsailDefaultKey-ca-central-1.pem \
  frontend/dist admin@16.54.167.125:/opt/nglu-app-dev/frontend/

# Copy backend dist (from your local machine via SCP)
scp -r -i ~/.ssh/LightsailDefaultKey-ca-central-1.pem \
  backend2/dist admin@16.54.167.125:/opt/nglu-app-dev/backend2/

# On the server, restart dev stack
cd /opt/nglu-app-dev
docker compose -p nglu_dev -f docker-compose.dev.yml --env-file .env.dev up --build -d
docker compose -p nglu_dev -f docker-compose.dev.yml ps
```

3. **Deploy to Production Environment (ongdngolu.org):**
```bash
# Pull latest code from master branch
cd /opt/nglu-app
git pull origin master

# Copy frontend dist
scp -r -i ~/.ssh/LightsailDefaultKey-ca-central-1.pem \
  frontend/dist admin@16.54.167.125:/opt/nglu-app/frontend/

# Copy backend dist
scp -r -i ~/.ssh/LightsailDefaultKey-ca-central-1.pem \
  backend2/dist admin@16.54.167.125:/opt/nglu-app/backend2/

# On the server, restart prod stack
cd /opt/nglu-app
docker compose -p nglu_prod -f docker-compose.prod.yml --env-file .env.prod up --build -d
docker compose -p nglu_prod -f docker-compose.prod.yml ps
```

4. **Verify deployments:**
```bash
# Dev environment
curl -I https://dev.ongdngolu.org/admin/dashboard

# Prod environment
curl -I https://ongdngolu.org/admin/dashboard
```

---

### Option 2: Bitbucket Pipeline Deployment (When Minutes Available)

Once pipeline minutes are available:
1. Push to `develop` → pipeline auto-deploys to dev
2. Push to `master` → pipeline auto-deploys to prod

The bitbucket-pipelines.yml is pre-configured for this.

---

## Verification Checklist

### Dev Environment (dev.ongdngolu.org)
- [ ] Dashboard loads (`/admin/dashboard`)
- [ ] Admin settings page accessible (`/admin/app-settings`)
- [ ] New admin settings route works (`/admin/admin-settings`)
- [ ] Maintenance Kanban view renders correctly
- [ ] Currency management accessible
- [ ] Audit logs tab working
- [ ] Backup tab functional

### Production Environment (ongdngolu.org)
- [ ] All of above verified
- [ ] Marketing site still serves at `/` 
- [ ] CRM accessible at `/admin`
- [ ] API routes proxying correctly

---

## Rollback Instructions

If issues occur, rollback to previous version:

```bash
# Dev rollback
cd /opt/nglu-app-dev
git revert HEAD
git pull origin develop
# Restart containers

# Prod rollback
cd /opt/nglu-app
git revert HEAD
git pull origin master
# Restart containers
```

---

## Git Commit Details

### Commit 1: SCRUM-87
```
fix(maintenance): resolve Kanban layout issues
- Fix column header counter positioning
- Prevent toolbar button wrapping
```

### Commit 2: SCRUM-81
```
feat(SCRUM-81): populate currency table from world-currencies library
- Install world-currencies npm package
- Update seeder with 180+ world currencies
- Add currencyCode support to DTOs
```

### Commit 3: SCRUM-82
```
feat(SCRUM-82): add admin settings with 4 management tabs
- Users: User management interface
- Models: Template/model management
- Audit: System audit logs with filtering
- Backup: Database backup management
```

---

## Build Information

**Frontend Builds:**
- ✓ Development build: `npm run build:dev` (API: https://dev.ongdngolu.org/api)
- ✓ Production build: `npm run build` (API: https://ongdngolu.org/api)
- Both in `frontend/dist/` directory

**Backend Build:**
- ✓ Built: `npm run build` in backend2/
- Output in `backend2/dist/` directory

---

## Notes

- All code is backward compatible
- No database migrations required for SCRUM-87 and SCRUM-82
- SCRUM-81 currencies seeder runs automatically on next deploy
- Audit logging is placeholder data (ready for integration with actual audit system)
- User management, models, and backup features are UI foundations (backend integration needed)

