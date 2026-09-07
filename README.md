# AWS Auto Scaling Test Lab

A small Docker Compose application for learning and testing:

- Application Load Balancer (ALB)
- Target Groups and health checks
- EC2 Auto Scaling Groups
- CloudWatch CPU-based scaling
- Docker Compose on EC2
- ALB traffic distribution between EC2 instances

## Directory

- `backend/` - Node.js API and CPU load generator
- `frontend/` - React/Vite dashboard served by Nginx
- `docker-compose.yml` - runs frontend + backend
- `aws/user-data.sh` - starting point for EC2 bootstrap

## Local test

```bash
docker compose up -d --build
```

Open:

```text
http://localhost
```

## AWS architecture

```text
Internet
   |
   v
ALB
   |
Target Group
   |
+--+---------+---------+
|            |         |
EC2-1       EC2-2    EC2-3
|            |         |
Docker      Docker    Docker
Compose     Compose   Compose
```

The ALB distributes requests. The Auto Scaling Group changes the number of EC2 instances.

## Important

Do not create the production/ASG setup until the application is in a Git repository or container registry and the Launch Template bootstrap process is tested.

For the learning lab, start with:
- Min: 1
- Desired: 1
- Max: 3 or 5
- Health check path: `/health`
- Target group port: 80
- Scaling metric: average EC2 CPU utilization
- Initial target: 50%

The exact cooldown/warmup values should be chosen deliberately during the lab because AWS needs time to launch an instance, start Docker, start the application, pass the health check, and add the instance to the target group.
