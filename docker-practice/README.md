# Two-tier Docker Practice (Flask + Node, MySQL backend)

Har app = **Tier 1: web app** + **Tier 2: MySQL database**.
Abhi sab kuch manually `docker` commands se karo. Compose baad me.

## Flask app

```bash
# 1. custom network (containers ek dusre ko name se dhoondh sakein)
docker network create flask-net

# 2. MySQL container (volume = data persist)
docker run -d --name flask-mysql --network flask-net \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=appdb \
  -v flask-mysql-data:/var/lib/mysql \
  mysql:8.0

# 3. image build
cd flask-app
docker build -t flask-two-tier:1.0 .

# 4. app container
docker run -d --name flask-web --network flask-net -p 5000:5000 \
  -e DB_HOST=flask-mysql -e DB_USER=root \
  -e DB_PASSWORD=secret -e DB_NAME=appdb \
  flask-two-tier:1.0
```

Open: http://localhost:5000  |  API: /api/messages  |  Health: /health

## Node app

```bash
docker network create node-net

docker run -d --name node-mysql --network node-net \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=appdb \
  -v node-mysql-data:/var/lib/mysql \
  mysql:8.0

cd node-app
docker build -t node-two-tier:1.0 .

docker run -d --name node-web --network node-net -p 3000:3000 \
  -e DB_HOST=node-mysql -e DB_USER=root \
  -e DB_PASSWORD=secret -e DB_NAME=appdb \
  node-two-tier:1.0
```

Open: http://localhost:3000

## Practice ideas
- `docker logs -f flask-web` (DB retry logs dekho)
- `docker exec -it flask-mysql mysql -uroot -psecret appdb`
- Container delete karke dobara run karo, volume ki wajah se data bacha rahega
- `docker image history flask-two-tier:1.0` se layers dekho
- Dockerfile me `COPY . .` ko requirements se pehle rakho aur dekho cache kaise toot'ta hai
- Multi-stage build / non-root user / `HEALTHCHECK` add karo
- Phir isi setup ko `docker-compose.yml` me convert karo
