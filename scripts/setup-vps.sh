#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# AKT Institute OS — VPS First-Time Setup
# Run this ONCE on a fresh Hostinger VPS (Ubuntu 22.04)
#
# Usage: bash scripts/setup-vps.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DEPLOY_DIR="/opt/akinfo"
REPO_URL="https://github.com/akinfoeducation/akInfo.git"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  AKT Institute OS — VPS Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. System updates ────────────────────────────────────────────────────────
echo ""
echo "▶ Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Install Docker ────────────────────────────────────────────────────────
echo ""
echo "▶ Installing Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "  Docker installed ✅"
else
    echo "  Docker already installed ✅"
fi

# ── 3. Install Docker Compose plugin ────────────────────────────────────────
echo ""
echo "▶ Checking Docker Compose..."
if ! docker compose version &>/dev/null; then
    apt-get install -y docker-compose-plugin
fi
docker compose version
echo "  Docker Compose ready ✅"

# ── 4. Install Certbot ───────────────────────────────────────────────────────
echo ""
echo "▶ Installing Certbot..."
apt-get install -y certbot
echo "  Certbot installed ✅"

# ── 5. Create deploy directory ───────────────────────────────────────────────
echo ""
echo "▶ Creating deploy directory at $DEPLOY_DIR..."
mkdir -p "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/docker/nginx/ssl"

# ── 6. Clone repository ──────────────────────────────────────────────────────
echo ""
echo "▶ Cloning repository..."
if [ -d "$DEPLOY_DIR/.git" ]; then
    echo "  Repo already cloned, pulling latest..."
    git -C "$DEPLOY_DIR" pull origin main
else
    git clone "$REPO_URL" "$DEPLOY_DIR"
fi
echo "  Repository ready ✅"

# ── 7. Create .env from template ─────────────────────────────────────────────
echo ""
echo "▶ Setting up environment file..."
if [ ! -f "$DEPLOY_DIR/.env" ]; then
    cp "$DEPLOY_DIR/.env.example" "$DEPLOY_DIR/.env"
    echo ""
    echo "  ⚠️  IMPORTANT: Edit $DEPLOY_DIR/.env with your production values!"
    echo "  Run: nano $DEPLOY_DIR/.env"
    echo ""
else
    echo "  .env already exists ✅"
fi

# ── 8. SSH key for GitHub Actions ────────────────────────────────────────────
echo ""
echo "▶ Setting up SSH for GitHub Actions deployment..."
if [ ! -f ~/.ssh/authorized_keys ] || ! grep -q "github-actions" ~/.ssh/authorized_keys 2>/dev/null; then
    echo ""
    echo "  ═══════════════════════════════════════════════════════"
    echo "  GITHUB ACTIONS SSH KEY SETUP"
    echo "  ═══════════════════════════════════════════════════════"
    echo ""
    echo "  On your LOCAL MACHINE (not this VPS), run:"
    echo ""
    echo "    ssh-keygen -t ed25519 -C 'github-actions-akinfo' -f ~/.ssh/akinfo_deploy"
    echo ""
    echo "  Then add the PUBLIC key to this VPS:"
    echo "    cat ~/.ssh/akinfo_deploy.pub  (copy this)"
    echo "    # Paste it into ~/.ssh/authorized_keys on this VPS"
    echo ""
    echo "  Then add the PRIVATE key to GitHub:"
    echo "    cat ~/.ssh/akinfo_deploy  (copy this)"
    echo "    GitHub → Settings → Secrets → New secret"
    echo "    Name: VPS_SSH_KEY"
    echo "  ═══════════════════════════════════════════════════════"
else
    echo "  SSH key already configured ✅"
fi

# ── 9. Firewall ──────────────────────────────────────────────────────────────
echo ""
echo "▶ Configuring firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "  Firewall configured (SSH, HTTP, HTTPS) ✅"

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  VPS setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Edit credentials:  nano $DEPLOY_DIR/.env"
echo "  2. Set up SSL:        bash $DEPLOY_DIR/scripts/setup-ssl.sh yourdomain.com"
echo "  3. Start services:    cd $DEPLOY_DIR && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
