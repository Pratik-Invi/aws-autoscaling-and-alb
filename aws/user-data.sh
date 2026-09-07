#!/bin/bash
set -euxo pipefail

# This is a lab example. Replace these URLs before using the Launch Template.
BACKEND_REPO="REPLACE_WITH_BACKEND_GIT_URL"
FRONTEND_REPO="REPLACE_WITH_FRONTEND_GIT_URL"

dnf update -y || true
dnf install -y git docker curl

systemctl enable --now docker

# Install Docker Compose plugin if the AMI does not already have it.
if ! docker compose version >/dev/null 2>&1; then
  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi

mkdir -p /opt/aws-autoscaling-test
cd /opt/aws-autoscaling-test

# Recommended: use one deployment repository containing the compose file.
# For this lab, copy the complete project to this directory before creating the AMI,
# or adapt these commands to clone your deployment repository.
#
# git clone "$BACKEND_REPO" backend
# git clone "$FRONTEND_REPO" frontend
# cp /path/to/docker-compose.yml .
# docker compose up -d --build

echo "Populate /opt/aws-autoscaling-test with the application before enabling the ASG."
