# Three-Tier Taskboard Application

A containerized three-tier task board application:

```text
Browser
   |
   | HTTP
   v
AWS Application Load Balancer
   |
   +--------------------> Frontend (Nginx / ECS)
                            |
                            | /api/* proxy
                            v
                         Backend (Node.js / ECS)
                            |
                            | TCP 3306
                            v
                         RDS / MySQL
```

| Tier | Technology | Port |
|---|---|---|
| Frontend | Nginx, HTML, CSS, JavaScript | 80 |
| Backend | Node.js 22, Express | 5000 |
| Database | MySQL 8 | 3306 |

The frontend calls `/api/*`. Nginx proxies those requests to the backend. The backend creates the `taskboard` database and `tasks` table automatically when it starts.

## Features

- Dockerized frontend and backend
- Docker Compose for local development
- REST API for task management
- MySQL data persistence
- Health endpoint at `/api/health`
- AWS ECR image storage
- AWS ECS deployment

## Project Structure

```text
three-tier-app/
├── frontend/
│   ├── dockerfile
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── nginx.conf
├── backend/
│   ├── dockerfile
│   ├── package.json
│   └── server.js
├── docker-compose.yaml
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | API and database health |
| `GET` | `/api/tasks` | List tasks |
| `GET` | `/api/stats` | Task counts by status |
| `POST` | `/api/tasks` | Create a task |
| `PATCH` | `/api/tasks/:id` | Update task status |
| `DELETE` | `/api/tasks/:id` | Delete a task |

## Run Locally with Docker Compose

From this directory:

```bash
docker compose up --build
```

Open <http://localhost:8080>.

Stop and remove the containers:

```bash
docker compose down
```

Remove the database volume too:

```bash
docker compose down -v
```

The local Compose setup uses:

| Variable | Value |
|---|---|
| `DB_HOST` | `db` |
| `DB_USER` | `root` |
| `DB_PASSWORD` | `password` |
| `DB_NAME` | `taskboard` |
| `DB_PORT` | `3306` |

`nginx.conf` expects the Compose backend service name `backend`. For ECS with separate services, configure backend service discovery or route `/api/*` to a backend target group instead.

## Build and Push Images to Amazon ECR

Set the AWS CLI variables once:

```bash
AWS_REGION=ap-south-1
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

Create repositories:

```bash
aws ecr create-repository --repository-name three-tier-frontend --region $AWS_REGION
aws ecr create-repository --repository-name three-tier-backend --region $AWS_REGION
```

Authenticate Docker:

```bash
aws ecr get-login-password --region $AWS_REGION |
  docker login --username AWS --password-stdin $ECR_REGISTRY
```

Build, tag, and push both images:

```bash
docker build -t three-tier-backend ./backend -f ./backend/dockerfile
docker tag three-tier-backend:latest $ECR_REGISTRY/three-tier-backend:latest
docker push $ECR_REGISTRY/three-tier-backend:latest

docker build -t three-tier-frontend ./frontend -f ./frontend/dockerfile
docker tag three-tier-frontend:latest $ECR_REGISTRY/three-tier-frontend:latest
docker push $ECR_REGISTRY/three-tier-frontend:latest
```

## AWS Infrastructure

Create the following resources before registering ECS services:

1. A VPC with public subnets in at least two Availability Zones.
2. Two ECS task security groups:
   - **Frontend:** allow inbound TCP port `80` from the ALB security group.
   - **Backend:** allow inbound TCP port `5000` from the frontend security group or ALB security group.
   - Both tasks use an outbound rule that allows traffic to reach RDS and AWS APIs.
3. A database security group that allows inbound TCP port `3306` only from the backend ECS task security group.
4. An RDS MySQL database in private subnets.
5. A private ECR repository for each image.
6. An ECS cluster using the Fargate capacity provider.
7. An Application Load Balancer with a public HTTP listener on port `80`.
8. An ECS IAM task execution role that can pull from ECR and write logs to CloudWatch.

For RDS, create the initial database as `taskboard`, for example by setting RDS **Initial database name** to `taskboard`.

## ECS Task Definitions

### Backend task

The backend task container should use the ECR backend image and expose TCP port `5000`.

Configure these environment variables:

| Variable | ECS Value |
|---|---|
| `PORT` | `5000` |
| `DB_HOST` | RDS endpoint, for example `taskboard-db.xxxxxx.ap-south-1.rds.amazonaws.com` |
| `DB_PORT` | `3306` |
| `DB_USER` | RDS master username |
| `DB_PASSWORD` | RDS password |
| `DB_NAME` | `taskboard` |

Use Secrets Manager or ECS secrets for `DB_PASSWORD` in a real environment instead of storing it directly in the task definition.

Backend container settings:

```text
Container port: 5000
Protocol: TCP
Health check: CMD-SHELL, curl is not installed in node:22-alpine
Health check alternative: use /api/health through the ALB or add wget to the image
CPU/Memory: 256 CPU / 512 MiB or higher
```

The backend is healthy when it can reach MySQL. `/api/health` returns the database status.

### Frontend task

The frontend task container should use the ECR frontend image and expose TCP port `80`.

For ECS networking, the current Nginx configuration can proxy to Docker Compose service `backend:5000` only. Use one of these ECS approaches:

**Recommended: separate ALB paths**

1. Create one target group for port `80` and attach it to the frontend ECS service.
2. Create one target group for port `5000` and attach it to the backend ECS service.
3. Configure the ALB listener:
   - `/api/*` -> backend target group
   - default `/*` -> frontend target group

This approach does not require the frontend Nginx container to know the backend hostname. It should not send `/api/*` directly to `backend:5000`.

**Alternative: service discovery**

If Nginx must remain the proxy, register the backend ECS service with AWS Cloud Map and create an internal DNS name such as `backend.internal`. Replace `backend:5000` in `frontend/nginx.conf` with that DNS name, rebuild the frontend image, and push it again to ECR.

## Create and Run ECS Services

Create the ECS services using the AWS Console or CLI:

- **Frontend service:** desired tasks `2`, public subnets or appropriate task networking, frontend security group, frontend target group, port `80`.
- **Backend service:** desired tasks `2`, private subnets with NAT or ECR/NAT connectivity, backend security group, backend target group on port `5000`.
- Enable service health checks and rolling deployments.

Backend service discovery or the separate-ALB routing must be in place before the application is considered ready.

After deployment, open the ALB DNS name:

```text
http://<application-load-balancer-dns-name>
```

Test the API directly through the ALB:

```bash
curl http://<application-load-balancer-dns-name>/api/health
curl http://<application-load-balancer-dns-name>/api/tasks
```

## Updating the ECS Application

After changing code:

```bash
AWS_REGION=ap-south-1
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

docker build -t three-tier-backend ./backend -f ./backend/dockerfile
docker tag three-tier-backend:latest $ECR_REGISTRY/three-tier-backend:latest
docker push $ECR_REGISTRY/three-tier-backend:latest

docker build -t three-tier-frontend ./frontend -f ./frontend/dockerfile
docker tag three-tier-frontend:latest $ECR_REGISTRY/three-tier-frontend:latest
docker push $ECR_REGISTRY/three-tier-frontend:latest
```

Update both ECS task definitions with the new image URI, then deploy the revised task definition to the frontend and backend services.

## Production Notes

- Put ECS tasks in private subnets.
- Use HTTPS with ACM and Route 53.
- Keep database credentials in Secrets Manager or AWS Systems Manager Parameter Store.
- Restrict security groups to the resource that must communicate.
- Use RDS automated backups and Multi-AZ for production.
- Restrict the ECS execution role to required ECR and CloudWatch resources.
- Set appropriate CPU, memory, desired count, and autoscaling policies.
- Add CloudWatch alarms for ECS 5xx responses, unhealthy targets, CPU, memory, and database connections.
- Delete ECS services, task definitions, load balancers, RDS, ECR repositories, security groups, and the VPC after a lab to avoid AWS charges.
