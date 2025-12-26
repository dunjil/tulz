#!/bin/bash
# ============================================================
# ToolHub - Quick Deploy Script
# Usage: ./quick_deploy.sh <VPS_IP> [SSH_USER]
# Example: ./quick_deploy.sh 192.168.1.100 root
# ============================================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Check arguments
if [ -z "$1" ]; then
    echo "Usage: $0 <VPS_IP> [SSH_USER]"
    echo "Example: $0 192.168.1.100 root"
    exit 1
fi

VPS_HOST="$1"
SSH_USER="${2:-root}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}=========================================="
echo "ToolHub Quick Deploy to $SSH_USER@$VPS_HOST"
echo -e "==========================================${NC}"

# Test SSH
echo "Testing SSH connection..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$SSH_USER@$VPS_HOST" "exit" 2>/dev/null; then
    echo -e "${RED}SSH connection failed!${NC}"
    echo "Make sure you can SSH without password: ssh-copy-id $SSH_USER@$VPS_HOST"
    exit 1
fi
echo "SSH OK"

# Create tarball
echo "Creating code tarball..."
cd "$PROJECT_DIR"
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
    -czf /tmp/toolhub-code.tar.gz backend frontend

# Upload files
echo "Uploading files..."
scp /tmp/toolhub-code.tar.gz "$SSH_USER@$VPS_HOST:/tmp/"
scp "$SCRIPT_DIR/deploy.sh" "$SSH_USER@$VPS_HOST:/tmp/"

# Check if env files exist and upload
if [ -f "$SCRIPT_DIR/backend.env" ]; then
    scp "$SCRIPT_DIR/backend.env" "$SSH_USER@$VPS_HOST:/tmp/"
fi
if [ -f "$SCRIPT_DIR/frontend.env" ]; then
    scp "$SCRIPT_DIR/frontend.env" "$SSH_USER@$VPS_HOST:/tmp/"
fi

# Run deploy
echo "Running deployment..."
ssh "$SSH_USER@$VPS_HOST" "chmod +x /tmp/deploy.sh && /tmp/deploy.sh"

# Cleanup
rm -f /tmp/toolhub-code.tar.gz

echo ""
echo -e "${GREEN}Deployment complete!${NC}"
