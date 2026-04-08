#!/usr/bin/env bash
set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y \
  ca-certificates \
  curl \
  docker.io \
  jq \
  tar \
  wget

systemctl enable --now docker
usermod -aG docker ubuntu || true

mkdir -p /opt/illa /var/lib/illa
chown -R ubuntu:ubuntu /opt/illa /var/lib/illa

if [[ ! -x /usr/local/bin/illa ]]; then
  cd /opt/illa
  # Latest release occasionally omits Linux artifacts; fall back to a known-good tag.
  ILLA_URL="$(curl -fsSL https://api.github.com/repos/illacloud/illa/releases/latest \
    | grep -o 'https://[^"]*illa-x86_64-linux.tar.gz' \
    | head -n1 || true)"
  if [[ -z "${ILLA_URL}" ]]; then
    ILLA_URL="https://github.com/illacloud/illa/releases/download/v1.2.14/illa-x86_64-linux.tar.gz"
  fi
  wget -q "$ILLA_URL" -O illa.tar.gz
  tar -xzf illa.tar.gz
  if [[ -x /opt/illa/illa-x86_64-linux/illa ]]; then
    cp /opt/illa/illa-x86_64-linux/illa /usr/local/bin/illa
    chmod +x /usr/local/bin/illa
  fi
fi

# Non-blocking readiness probes.
sudo -u ubuntu -H bash -lc 'illa --help >/tmp/illa-help.txt 2>&1 || true'
sudo -u ubuntu -H bash -lc 'illa doctor >/tmp/illa-doctor.txt 2>&1 || true'
