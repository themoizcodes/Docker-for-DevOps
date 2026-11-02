# Taskboard — 3-tier app

Frontend (static HTML/CSS/JS + nginx)  →  Backend (Node.js / Express)  →  Database (MySQL)

## Structure
```
three-tier-app/
├── frontend/   index.html, style.css, app.js, nginx.conf
└── backend/    server.js, package.json
```

## Tier details
| Tier     | Tech            | Port | Notes |
|----------|-----------------|------|-------|
| frontend | nginx           | 80   | Static files `/usr/share/nginx/html` me copy karo, `nginx.conf` ko `/etc/nginx/conf.d/default.conf` pe |
| backend  | Node 20 + Express | 5000 | `npm install` phir `node server.js` |
| db       | MySQL 8         | 3306 | Table khud ban jata hai (retry loop ke sath) |

## Backend env variables
`DB_HOST` (default `db`), `DB_USER` (default `root`), `DB_PASSWORD` (default `password`), `DB_NAME` (default `taskboard`), `DB_PORT`, `PORT`

MySQL container ke liye: `MYSQL_ROOT_PASSWORD` backend ke `DB_PASSWORD` ke barabar rakho.

## Important
- Compose me services ke naam `backend` aur `db` rakho (nginx.conf me `http://backend:5000` hai, backend me default host `db` hai) ya phir naam badal do to nginx.conf / `DB_HOST` bhi badal dena.
- Frontend sirf `/api/...` call karta hai, nginx usay backend tak proxy karta hai.
- DB data persist karne ke liye `/var/lib/mysql` pe volume lagao.

## API
`GET /api/health` · `GET /api/tasks` · `GET /api/stats` · `POST /api/tasks` · `PATCH /api/tasks/:id` · `DELETE /api/tasks/:id`
