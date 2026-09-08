#!/bin/bash

set -euxo pipefail

exec > >(tee /var/log/aws-autoscaling-lab-user-data.log | logger -t user-data -s 2>/dev/console) 2>&1

echo "===== Starting EC2 bootstrap ====="

# Update packages
dnf update -y

# Install required packages
dnf install -y docker git curl

# Start Docker
systemctl enable docker
systemctl start docker

# Allow ec2-user to use Docker
usermod -aG docker ec2-user

# Install Docker Compose
mkdir -p /usr/local/lib/docker/cli-plugins

curl -L \
  https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose

chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Install Docker Buildx
curl -L \
  https://github.com/docker/buildx/releases/download/v0.28.0/buildx-v0.28.0.linux-amd64 \
  -o /usr/local/lib/docker/cli-plugins/docker-buildx

chmod +x /usr/local/lib/docker/cli-plugins/docker-buildx

# Verify Docker tools
docker --version
docker compose version
docker buildx version

# Clone application
rm -rf /opt/aws-autoscaling-and-alb

git clone \
  https://github.com/Pratik-Invi/aws-autoscaling-and-alb.git \
  /opt/aws-autoscaling-and-alb

# Start application
cd /opt/aws-autoscaling-and-alb

docker compose build
docker compose up -d

echo "===== Application deployment completed ====="

docker compose ps

echo "===== EC2 bootstrap completed ====="
