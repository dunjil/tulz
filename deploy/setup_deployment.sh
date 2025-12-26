#!/bin/bash
# ============================================================
# ToolHub - Deployment Setup Script
# Run this locally to prepare and trigger deployment
# ============================================================

set -e

echo "=========================================="
echo "ToolHub - Deployment Setup"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
prompt() { echo -e "${BLUE}[INPUT]${NC} $1"; }

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# ============================================================
# Check prerequisites
# ============================================================
log "Checking prerequisites..."

# Check if SSH key exists
if [ ! -f ~/.ssh/id_rsa ] && [ ! -f ~/.ssh/id_ed25519 ]; then
    warn "No SSH key found. You may need to set up SSH access to your VPS."
fi

# ============================================================
# Configuration
# ============================================================
echo ""
log "Configuration"
echo "============================================"

# Load existing config if available
CONFIG_FILE="$SCRIPT_DIR/.deploy_config"
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
    log "Loaded existing configuration from $CONFIG_FILE"
fi

# Prompt for VPS details
prompt "Enter VPS IP address or hostname [$VPS_HOST]: "
read -r input
VPS_HOST=${input:-$VPS_HOST}

if [ -z "$VPS_HOST" ]; then
    error "VPS_HOST is required"
fi

prompt "Enter SSH user (default: root) [$SSH_USER]: "
read -r input
SSH_USER=${input:-${SSH_USER:-root}}

prompt "Enter domain name (e.g., toolhub.example.com) [$DOMAIN]: "
read -r input
DOMAIN=${input:-$DOMAIN}

prompt "Enter PostgreSQL password [$DB_PASS]: "
read -r input
DB_PASS=${input:-${DB_PASS:-$(openssl rand -base64 24 | tr -d '=+/')}}

prompt "Enter secret key for JWT [$SECRET_KEY]: "
read -r input
SECRET_KEY=${input:-${SECRET_KEY:-$(openssl rand -base64 48 | tr -d '=+/')}}

# Save configuration
cat > "$CONFIG_FILE" <<EOF
VPS_HOST="$VPS_HOST"
SSH_USER="$SSH_USER"
DOMAIN="$DOMAIN"
DB_PASS="$DB_PASS"
SECRET_KEY="$SECRET_KEY"
EOF
chmod 600 "$CONFIG_FILE"
log "Configuration saved to $CONFIG_FILE"

# ============================================================
# Test SSH connection
# ============================================================
echo ""
log "Testing SSH connection to $SSH_USER@$VPS_HOST..."

if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "$SSH_USER@$VPS_HOST" "echo 'SSH connection successful'" 2>/dev/null; then
    echo -e "${GREEN}SSH connection OK${NC}"
else
    warn "SSH connection failed. Make sure:"
    echo "  1. The VPS is running and accessible"
    echo "  2. Your SSH key is copied to the VPS (ssh-copy-id $SSH_USER@$VPS_HOST)"
    echo "  3. SSH port 22 is open"
    echo ""
    prompt "Do you want to try copying your SSH key now? (y/n): "
    read -r answer
    if [ "$answer" = "y" ]; then
        ssh-copy-id "$SSH_USER@$VPS_HOST"
    fi
fi

# ============================================================
# Create code tarball
# ============================================================
echo ""
log "Creating code tarball..."

cd "$PROJECT_DIR"
TARBALL="/tmp/toolhub-code.tar.gz"

# Create tarball excluding unnecessary files
tar --exclude='node_modules' \
    --exclude='venv' \
    --exclude='.venv' \
    --exclude='__pycache__' \
    --exclude='.git' \
    --exclude='.next' \
    --exclude='*.pyc' \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='.deploy_config' \
    --exclude='*.log' \
    -czf "$TARBALL" backend frontend

log "Created tarball: $TARBALL ($(du -h $TARBALL | cut -f1))"

# ============================================================
# Create environment files
# ============================================================
echo ""
log "Creating environment files..."

# Backend .env
BACKEND_ENV="/tmp/backend.env"
cat > "$BACKEND_ENV" <<EOF
# Database
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/toolhub

# Security
SECRET_KEY=$SECRET_KEY
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Domain
DOMAIN=$DOMAIN
FRONTEND_URL=https://$DOMAIN
BACKEND_URL=https://$DOMAIN

# Google OAuth (update these)
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-your-google-client-id}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-your-google-client-secret}
GOOGLE_REDIRECT_URI=https://$DOMAIN/api/v1/auth/google/callback

# Email (ZeptoMail)
ZEPTOMAIL_API_KEY=${ZEPTOMAIL_API_KEY:-your-zeptomail-api-key}
ZEPTOMAIL_FROM_EMAIL=noreply@$DOMAIN
ZEPTOMAIL_FROM_NAME=ToolHub

# Polar.sh Payments
POLAR_ACCESS_TOKEN=${POLAR_ACCESS_TOKEN:-}
POLAR_WEBHOOK_SECRET=${POLAR_WEBHOOK_SECRET:-}
POLAR_PRODUCT_ID=${POLAR_PRODUCT_ID:-}
POLAR_ORGANIZATION_ID=${POLAR_ORGANIZATION_ID:-}
POLAR_SANDBOX=false

# File Upload
MAX_FILE_SIZE_MB=50
TEMP_FILE_DIR=/opt/toolhub/tmp
TEMP_FILE_TTL_HOURS=1

# Rate Limiting
FREE_DAILY_USES=3
RATE_LIMIT_PER_MINUTE=30

# Pricing (in cents)
PRICE_PRO_MONTHLY_USD=1000
PRICE_PRO_ANNUAL_USD=9600

# GeoIP (optional)
GEOIP_DB_PATH=/opt/toolhub/data/GeoLite2-Country.mmdb

# Redis & Celery
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# OCR (Tesseract)
TESSERACT_CMD=/usr/bin/tesseract
EOF

# Frontend .env
FRONTEND_ENV="/tmp/frontend.env"
cat > "$FRONTEND_ENV" <<EOF
NEXT_PUBLIC_API_URL=https://$DOMAIN
NEXT_PUBLIC_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-your-google-client-id}
EOF

log "Environment files created"

# ============================================================
# Upload files to VPS
# ============================================================
echo ""
log "Uploading files to VPS..."

# Upload tarball
scp "$TARBALL" "$SSH_USER@$VPS_HOST:/tmp/toolhub-code.tar.gz"
log "Uploaded code tarball"

# Upload env files
scp "$BACKEND_ENV" "$SSH_USER@$VPS_HOST:/tmp/backend.env"
scp "$FRONTEND_ENV" "$SSH_USER@$VPS_HOST:/tmp/frontend.env"
log "Uploaded environment files"

# Upload deploy script
scp "$SCRIPT_DIR/deploy.sh" "$SSH_USER@$VPS_HOST:/tmp/deploy.sh"
log "Uploaded deploy script"

# ============================================================
# Run deployment
# ============================================================
echo ""
log "Running deployment on VPS..."
echo "============================================"

ssh "$SSH_USER@$VPS_HOST" "chmod +x /tmp/deploy.sh && /tmp/deploy.sh"

# ============================================================
# Cleanup
# ============================================================
echo ""
log "Cleaning up temporary files..."
rm -f "$TARBALL" "$BACKEND_ENV" "$FRONTEND_ENV"

# ============================================================
# Summary
# ============================================================
echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "Your ToolHub instance should now be running at:"
echo "  http://$VPS_HOST (or https://$DOMAIN after SSL setup)"
echo ""
echo "Next steps:"
echo "  1. Point your domain DNS to $VPS_HOST"
echo "  2. SSH to VPS and run: certbot --nginx -d $DOMAIN"
echo "  3. Update Google OAuth redirect URI to: https://$DOMAIN/api/v1/auth/google/callback"
echo "  4. Configure Polar.sh webhook URL: https://$DOMAIN/api/v1/webhooks/polar"
echo ""
echo "To redeploy in the future, just run this script again:"
echo "  $SCRIPT_DIR/setup_deployment.sh"
echo ""
echo -e "${GREEN}==========================================${NC}"
