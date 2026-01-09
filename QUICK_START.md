# Aureum Calendar - Quick Start Guide

## 🚀 Run Development Server

```bash
# Terminal 1 - Backend (API)
cd server && node index.js

# Terminal 2 - Frontend (UI)
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

---

## 📦 Generate New Production Environment

Creates a clean copy with fresh database and admin user:

```bash
node scripts/generate_prod.cjs --target=/path/to/destination --admin=USERNAME --password=PASSWORD
```

**Example:**
```bash
node scripts/generate_prod.cjs --target=~/Desktop/calendar-prod --admin=admin --password=secret123
```

---

## 👑 Admin Management

### Promote Existing User to Admin
```bash
node scripts/make_admin.cjs --username=USERNAME
```

### Check Who Is Admin
```bash
sqlite3 server/calendar.db "SELECT username, is_admin FROM users;"
```

---

## 🏭 Build for Production

```bash
# Build frontend
npm run build

# Run production server (serves built files)
cd server && node index.js
```

Access at: http://localhost:3001

---

## 🛑 Stop All Servers

```bash
pkill -f "node.*index.js"; pkill -f "vite"
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `server/index.js` | Backend API server |
| `server/calendar.db` | SQLite database |
| `scripts/generate_prod.cjs` | Create production copy |
| `scripts/make_admin.cjs` | Promote user to admin |

---

## ⚡ One-Liner Commands

```bash
# Start everything
cd server && node index.js & cd .. && npm run dev

# Kill everything
pkill -f "node.*index.js"; pkill -f "vite"

# Check ports
lsof -i:3001 -i:5173
```
