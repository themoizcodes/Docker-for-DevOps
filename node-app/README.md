# Node.js Docker Practice

A small Node.js HTTP app with no external dependencies. It is intentionally
provided without a `Dockerfile` so you can create one as practice.

## Run locally

```bash
npm start
```

Open <http://localhost:3000>. The `/health` endpoint returns `{"status":"ok"}`.
You can choose a different port with the `PORT` environment variable.

## Docker practice

Create a `Dockerfile` in this directory, then try:

```bash
docker build -t node-app .
docker run --rm -p 3000:3000 node-app
```
