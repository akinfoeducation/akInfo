#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# AKT Institute OS — SSL Certificate Setup (Let's Encrypt)
# Run this ONCE after setup-vps.sh, before starting nginx with HTTPS.
#
# Usage: bash scripts/setup-ssl.sh yourdomain.com your@email.com
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-admin@aktinstitute.com}"
DEPLOY_DIR="/opt/akinfo"
SSL_DIR="$DEPLOY_DIR/docker/nginx/ssl"

if [ -z "$DOMAIN" ]; then
    echo "Usage: bash setup-ssl.sh yourdomain.com your@email.com"
    exit 1
fi

echo "▶ Getting SSL certificate for $DOMAIN..."

# Stop nginx if running (certbot needs port 80)
docker compose -C "$DEPLOY_DIR" stop nginx 2>/dev/null || true

# Get certificate via standalone mode
certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN"

# Copy certs to nginx ssl dir
cp /etc/letsencrypt/live/"$DOMAIN"/fullchain.pem "$SSL_DIR/fullchain.pem"
cp /etc/letsencrypt/live/"$DOMAIN"/privkey.pem   "$SSL_DIR/privkey.pem"
chmod 600 "$SSL_DIR"/*.pem

# Update nginx.conf server_name
sed -i "s/server_name _;/server_name $DOMAIN;/" "$DEPLOY_DIR/docker/nginx/nginx.conf"

echo ""
echo "SSL certificate installed ✅"
echo "Domain: $DOMAIN"
echo ""

# Set up auto-renewal cron
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $SSL_DIR/fullchain.pem && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $SSL_DIR/privkey.pem && docker compose -C $DEPLOY_DIR restart nginx") | crontab -

echo "Auto-renewal cron job added (daily at 3 AM) ✅"
echo ""
echo "Next: start all services:"
echo "  cd $DEPLOY_DIR && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d"
