#!/bin/bash
set -e

DOMAIN="$1"

if [ -z "$DOMAIN" ] && [ -f /opt/n-piidetector/.env ]; then
  DOMAIN=$(grep -E '^DOMAIN=' /opt/n-piidetector/.env | cut -d '=' -f2)
fi

if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <domain>" >&2
  echo "Domain not provided and DOMAIN not found in /opt/n-piidetector/.env" >&2
  exit 1
fi

# Comment out any limit_req_zone lines in default site
if [ -f /etc/nginx/sites-enabled/default ]; then
  sed -i '/limit_req_zone/s/^/#/' /etc/nginx/sites-enabled/default
fi

# Ensure ratelimit.conf contains desired zone
if [ ! -f /etc/nginx/conf.d/ratelimit.conf ] || ! grep -q 'limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;' /etc/nginx/conf.d/ratelimit.conf; then
  echo 'limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;' > /etc/nginx/conf.d/ratelimit.conf
fi

# Test nginx configuration
nginx -t || { echo "Nginx configuration failed" >&2; exit 1; }

# Install certbot packages if necessary
install_pkgs=""
command -v certbot >/dev/null 2>&1 || install_pkgs="certbot"
dpkg -s python3-certbot-nginx >/dev/null 2>&1 || install_pkgs="$install_pkgs python3-certbot-nginx"
if [ -n "$install_pkgs" ]; then
  apt-get update
  apt-get install -y $install_pkgs
fi

certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email

systemctl reload nginx || systemctl restart nginx
