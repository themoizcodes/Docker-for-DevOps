# Docker Commands Cheat Sheet

## 1. Basic Info
```bash
docker --version                 # Docker version
docker info                      # System-wide info
docker help                      # All commands
docker <command> --help          # Help for a specific command
```

## 2. Images
```bash
docker pull nginx                # Download image from Docker Hub
docker pull nginx:1.25           # Pull a specific tag
docker images                    # List local images
docker image ls
docker rmi <image_id>            # Remove an image
docker rmi -f <image_id>         # Force remove
docker image prune               # Remove dangling images
docker image prune -a            # Remove all unused images
docker tag myapp:latest user/myapp:v1   # Tag an image
docker push user/myapp:v1        # Push to Docker Hub
docker search nginx              # Search Docker Hub
docker history <image>           # Show image layers
docker inspect <image>           # Detailed image info
docker save -o myapp.tar myapp   # Export image to tar
docker load -i myapp.tar         # Import image from tar
```

## 3. Build
```bash
docker build -t myapp .                    # Build from Dockerfile in current dir
docker build -t myapp:v1 .                 # Build with tag
docker build -f Dockerfile.dev -t myapp .  # Use a different Dockerfile
docker build --no-cache -t myapp .         # Build without cache
docker build --build-arg ENV=prod -t myapp .
```

## 4. Run Containers
```bash
docker run nginx                           # Run a container
docker run -d nginx                        # Detached (background)
docker run -d --name web nginx             # Give a name
docker run -d -p 8080:80 nginx             # Port mapping (host:container)
docker run -d -P nginx                     # Publish all exposed ports randomly
docker run -it ubuntu bash                 # Interactive terminal
docker run --rm ubuntu echo "hello"        # Auto-remove after exit
docker run -d -e MYSQL_ROOT_PASSWORD=secret mysql   # Environment variable
docker run -d --env-file .env myapp        # Load env vars from file
docker run -d -v myvol:/data nginx         # Named volume
docker run -d -v $(pwd):/app myapp         # Bind mount (current dir)
docker run -d --network mynet myapp        # Attach to a network
docker run -d --restart unless-stopped nginx   # Restart policy
docker run -d --memory 512m --cpus 1 nginx     # Resource limits
```

## 5. Manage Containers
```bash
docker ps                        # Running containers
docker ps -a                     # All containers (including stopped)
docker ps -q                     # Only container IDs
docker start <container>         # Start
docker stop <container>          # Stop (graceful)
docker restart <container>       # Restart
docker pause <container>         # Pause
docker unpause <container>       # Unpause
docker kill <container>          # Force stop
docker rm <container>            # Remove container
docker rm -f <container>         # Force remove (even if running)
docker container prune           # Remove all stopped containers
docker rename old_name new_name  # Rename
```

## 6. Debugging & Inspecting
```bash
docker logs <container>              # View logs
docker logs -f <container>           # Follow logs live
docker logs --tail 100 <container>   # Last 100 lines
docker logs -t <container>           # With timestamps
docker exec -it <container> bash     # Open shell in running container
docker exec -it <container> sh       # If bash is not available
docker exec <container> ls /app      # Run a single command
docker inspect <container>           # Full details (JSON)
docker top <container>               # Processes inside container
docker stats                         # Live CPU/RAM usage
docker port <container>              # Port mappings
docker diff <container>              # Changed files in container
docker cp file.txt <container>:/app/ # Copy host -> container
docker cp <container>:/app/file.txt . # Copy container -> host
```

## 7. Volumes
```bash
docker volume create myvol       # Create volume
docker volume ls                 # List volumes
docker volume inspect myvol      # Volume details
docker volume rm myvol           # Remove volume
docker volume prune              # Remove unused volumes
```

## 8. Networks
```bash
docker network ls                          # List networks
docker network create mynet                # Create network
docker network inspect mynet               # Network details
docker network connect mynet <container>   # Connect container
docker network disconnect mynet <container>
docker network rm mynet                    # Remove network
docker network prune                       # Remove unused networks
```

## 9. Docker Compose
```bash
docker compose up                # Start services
docker compose up -d             # Start in background
docker compose up --build        # Rebuild images then start
docker compose down              # Stop and remove containers/networks
docker compose down -v           # Also remove volumes
docker compose ps                # List services
docker compose logs -f           # Follow logs
docker compose logs -f <service> # Logs of one service
docker compose exec <service> bash   # Shell into a service
docker compose build             # Build images
docker compose pull              # Pull latest images
docker compose restart           # Restart services
docker compose stop              # Stop services
docker compose start             # Start stopped services
docker compose config            # Validate & view final config
```

## 10. Docker Hub / Registry
```bash
docker login                     # Login to Docker Hub
docker logout                    # Logout
docker login <registry-url>      # Login to a private registry (e.g. AWS ECR)
```

### AWS ECR Example
```bash
aws ecr get-login-password --region <region> | \
  docker login --username AWS --password-stdin <account_id>.dkr.ecr.<region>.amazonaws.com
docker tag myapp:latest <account_id>.dkr.ecr.<region>.amazonaws.com/myapp:latest
docker push <account_id>.dkr.ecr.<region>.amazonaws.com/myapp:latest
```

## 11. Cleanup (Free Disk Space)
```bash
docker system df                 # Disk usage by Docker
docker system prune              # Remove unused containers, networks, dangling images
docker system prune -a           # Also remove all unused images
docker system prune -a --volumes # Also remove unused volumes (careful!)
```

## 12. Useful One-Liners
```bash
docker stop $(docker ps -q)              # Stop all running containers
docker rm $(docker ps -aq)               # Remove all containers
docker rmi $(docker images -q)           # Remove all images
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"   # Custom output
docker inspect -f '{{.NetworkSettings.IPAddress}}' <container>   # Get container IP
```

## 13. Sample Dockerfile
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 14. Sample docker-compose.yml
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=db
    depends_on:
      - db
  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: secret
    volumes:
      - dbdata:/var/lib/mysql

volumes:
  dbdata:
```
