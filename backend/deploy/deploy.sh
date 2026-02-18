#!/bin/bash
# ============================================================
# ToolHub - VPS Deployment Script
# This script handles both first-time setup and updates
# For Ubuntu 22.04 LTS (2 vCPU, 4GB RAM minimum)
# ============================================================

set -e

echo "=========================================="
echo "ToolHub - VPS Deployment"
echo "=========================================="

# Configuration
APP_NAME="toolhub"
APP_USER="toolhub"
APP_DIR="/opt/toolhub"
DB_NAME="toolhub"
DB_USER="toolhub"
PYTHON_VERSION="3.12"
NODE_VERSION="22"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
step() { echo -e "${BLUE}[$1]${NC} $2"; }

# ============================================================
# First-time setup check
# ============================================================
step "1/15" "Checking if first-time setup is needed..."

if [ ! -d "$APP_DIR/backend" ]; then
    echo "First-time setup detected. Running full installation..."
    FIRST_TIME=true
else
    echo "Existing installation detected. Running update..."
    FIRST_TIME=false
fi

# ============================================================
# First-time setup
# ============================================================
if [ "$FIRST_TIME" = true ]; then
    # Update system
    step "2/15" "Updating system packages..."
    apt-get update
    apt-get upgrade -y

    # Install base dependencies
    step "3/15" "Installing system dependencies..."
    apt-get install -y \
        curl \
        wget \
        git \
        build-essential \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        ufw \
        fail2ban \
        nginx \
        certbot \
        python3-certbot-nginx \
        libpq-dev \
        libffi-dev \
        libssl-dev \
        libjpeg-dev \
        zlib1g-dev \
        libpng-dev \
        poppler-utils \
        wkhtmltopdf \
        redis-server \
        tesseract-ocr \
        tesseract-ocr-eng \
        tesseract-ocr-fra \
        tesseract-ocr-deu \
        tesseract-ocr-spa \
        tesseract-ocr-ita \
        tesseract-ocr-por \
        tesseract-ocr-nld \
        tesseract-ocr-pol \
        tesseract-ocr-rus \
        tesseract-ocr-jpn \
        tesseract-ocr-chi-sim \
        tesseract-ocr-chi-tra \
        tesseract-ocr-kor \
        tesseract-ocr-ara \
        tesseract-ocr-hin \
        tesseract-ocr-tur \
        tesseract-ocr-vie \
        ghostscript \
        unpaper \
        pngquant

    # Install Python 3.12
    step "4/15" "Installing Python $PYTHON_VERSION..."
    add-apt-repository -y ppa:deadsnakes/ppa
    apt-get update
    apt-get install -y python${PYTHON_VERSION} python${PYTHON_VERSION}-venv python${PYTHON_VERSION}-dev

    # Install Node.js
    step "5/15" "Installing Node.js $NODE_VERSION..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
    npm install -g pm2

    # Install PostgreSQL 15
    step "6/15" "Installing PostgreSQL 15..."
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    apt-get update
    apt-get install -y postgresql-15 postgresql-contrib-15

    # Start PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql

    # Start Redis
    systemctl start redis-server
    systemctl enable redis-server

    # Configure firewall
    step "7/15" "Configuring firewall..."
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22
    ufw allow 80
    ufw allow 443
    ufw --force enable

    # Configure Fail2Ban
    step "8/15" "Configuring Fail2Ban..."
    cat > /etc/fail2ban/jail.local <<'FAIL2BAN_EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true

[nginx-botsearch]
enabled = true
FAIL2BAN_EOF

    systemctl restart fail2ban
    systemctl enable fail2ban

    # Create application user
    step "9/15" "Creating application user..."
    if ! id "$APP_USER" &>/dev/null; then
        useradd -m -s /bin/bash $APP_USER
    fi

    # Create application directories
    mkdir -p $APP_DIR
    mkdir -p $APP_DIR/logs
    mkdir -p $APP_DIR/tmp
    chown -R $APP_USER:$APP_USER $APP_DIR

    step "10/15" "First-time setup complete!"
fi

# ============================================================
# Extract code (runs every deployment)
# ============================================================
step "11/15" "Extracting application code..."

if [ -f /tmp/toolhub-code.tar.gz ]; then
    # Backup current code if exists
    if [ -d "$APP_DIR/backend" ]; then
        rm -rf $APP_DIR/backend.backup
        mv $APP_DIR/backend $APP_DIR/backend.backup || true
    fi
    if [ -d "$APP_DIR/frontend" ]; then
        rm -rf $APP_DIR/frontend.backup
        mv $APP_DIR/frontend $APP_DIR/frontend.backup || true
    fi

    # Extract new code
    tar -xzf /tmp/toolhub-code.tar.gz -C $APP_DIR
    chown -R $APP_USER:$APP_USER $APP_DIR
    echo "Code extracted successfully"
else
    error "Code tarball not found at /tmp/toolhub-code.tar.gz"
fi

# ============================================================
# Setup environment files
# ============================================================
step "12/15" "Setting up environment files..."

if [ -f /tmp/backend.env ]; then
    cp /tmp/backend.env $APP_DIR/backend/.env
    chown $APP_USER:$APP_USER $APP_DIR/backend/.env
    chmod 600 $APP_DIR/backend/.env
    echo "Backend .env configured"
fi

if [ -f /tmp/frontend.env ]; then
    cp /tmp/frontend.env $APP_DIR/frontend/.env.local
    chown $APP_USER:$APP_USER $APP_DIR/frontend/.env.local
    chmod 600 $APP_DIR/frontend/.env.local
    echo "Frontend .env.local configured"
fi

# ============================================================
# Setup PostgreSQL (first time or if needed)
# ============================================================
if [ "$FIRST_TIME" = true ]; then
    step "12a/15" "Setting up PostgreSQL database..."

    # Read password from env file
    if [ -f /tmp/backend.env ]; then
        DB_PASS=$(grep "^DATABASE_URL=" /tmp/backend.env | sed 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/')
    fi

    if [ -z "$DB_PASS" ]; then
        DB_PASS=$(openssl rand -base64 32 | tr -d '=+/')
        warn "Generated random DB password. Update your .env file!"
    fi

    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" || true
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" || true
    sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;" || true

    echo "PostgreSQL database configured"
fi

# ============================================================
# Setup Python virtual environment and dependencies
# ============================================================
step "13/15" "Setting up Python environment..."

# Create venv if not exists
if [ ! -d "$APP_DIR/backend/venv" ]; then
    su - $APP_USER -c "python${PYTHON_VERSION} -m venv $APP_DIR/backend/venv"
fi

# Install dependencies
su - $APP_USER -c "$APP_DIR/backend/venv/bin/pip install --upgrade pip"
su - $APP_USER -c "$APP_DIR/backend/venv/bin/pip install -r $APP_DIR/backend/requirements.txt"

# Run database migrations
step "13a/15" "Running database migrations..."
su - $APP_USER -c "cd $APP_DIR/backend && $APP_DIR/backend/venv/bin/alembic upgrade head" || warn "Migrations may have failed"

# ============================================================
# Build frontend
# ============================================================
step "14/15" "Building frontend..."

su - $APP_USER -c "cd $APP_DIR/frontend && npm install"
su - $APP_USER -c "cd $APP_DIR/frontend && npm run build"

# ============================================================
# Create/Update systemd services
# ============================================================
step "14a/15" "Creating systemd services..."

# Backend service
cat > /etc/systemd/system/toolhub-api.service <<'BACKEND_SERVICE_EOF'
[Unit]
Description=ToolHub FastAPI Backend
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=exec
User=toolhub
Group=toolhub
WorkingDirectory=/opt/toolhub/backend
Environment="PATH=/opt/toolhub/backend/venv/bin"
EnvironmentFile=/opt/toolhub/backend/.env
ExecStart=/opt/toolhub/backend/venv/bin/gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --timeout 300 \
    --access-logfile /opt/toolhub/logs/api_access.log \
    --error-logfile /opt/toolhub/logs/api_error.log \
    --log-level info

Restart=always
RestartSec=10

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/toolhub/logs /opt/toolhub/tmp /tmp/toolhub

LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
BACKEND_SERVICE_EOF

# Frontend service (using PM2)
cat > /etc/systemd/system/toolhub-web.service <<'FRONTEND_SERVICE_EOF'
[Unit]
Description=ToolHub Next.js Frontend
After=network.target

[Service]
Type=forking
User=toolhub
Group=toolhub
WorkingDirectory=/opt/toolhub/frontend
Environment="PATH=/usr/bin:/opt/toolhub/frontend/node_modules/.bin"
Environment="PM2_HOME=/opt/toolhub/.pm2"
ExecStart=/usr/bin/pm2 start npm --name toolhub-web -- start
ExecReload=/usr/bin/pm2 reload toolhub-web
ExecStop=/usr/bin/pm2 stop toolhub-web
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
FRONTEND_SERVICE_EOF

# Celery worker service
cat > /etc/systemd/system/toolhub-celery.service <<'CELERY_SERVICE_EOF'
[Unit]
Description=ToolHub Celery Worker
After=network.target redis-server.service
Wants=redis-server.service

[Service]
Type=exec
User=toolhub
Group=toolhub
WorkingDirectory=/opt/toolhub/backend
Environment="PATH=/opt/toolhub/backend/venv/bin"
EnvironmentFile=/opt/toolhub/backend/.env
ExecStart=/opt/toolhub/backend/venv/bin/celery -A app.workers.celery_app worker \
    --loglevel=info \
    --concurrency=4 \
    --queues=pdf,image,email,ocr,default \
    --logfile=/opt/toolhub/logs/celery.log

Restart=always
RestartSec=10

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/toolhub/logs /opt/toolhub/tmp /tmp/toolhub

LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
CELERY_SERVICE_EOF

# ============================================================
# Configure NGINX (first time or update)
# ============================================================
if [ "$FIRST_TIME" = true ] || [ ! -f /etc/nginx/sites-available/toolhub ]; then
    step "14b/15" "Configuring NGINX..."

    # Get domain from env or use default
    if [ -f /tmp/backend.env ]; then
        DOMAIN=$(grep "^DOMAIN=" /tmp/backend.env | cut -d'=' -f2 | tr -d '"' || echo "")
    fi
    DOMAIN=${DOMAIN:-"_"}

    cat > /etc/nginx/sites-available/toolhub <<NGINX_EOF
# Rate limiting zones
limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/m;
limit_req_zone \$binary_remote_addr zone=general:10m rate=100r/m;

upstream toolhub_api {
    server 127.0.0.1:8000 fail_timeout=0;
}

upstream toolhub_web {
    server 127.0.0.1:3000 fail_timeout=0;
}

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # File upload size (for PDF, images, etc.)
    client_max_body_size 100M;

    # Logs
    access_log /opt/toolhub/logs/nginx_access.log;
    error_log /opt/toolhub/logs/nginx_error.log;

    # API proxy
    location /api/ {
        limit_req zone=api burst=20 nodelay;

        proxy_pass http://toolhub_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Health check (no rate limit)
    location /health {
        proxy_pass http://toolhub_api/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        access_log off;
    }

    # Frontend static files (Next.js)
    location /_next/static/ {
        proxy_pass http://toolhub_web;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Frontend
    location / {
        limit_req zone=general burst=30 nodelay;

        proxy_pass http://toolhub_web;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX_EOF

    # Enable site
    rm -f /etc/nginx/sites-enabled/default
    ln -sf /etc/nginx/sites-available/toolhub /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
fi

# ============================================================
# Start/Restart services
# ============================================================
step "15/15" "Starting services..."

systemctl daemon-reload
systemctl enable toolhub-api
systemctl enable toolhub-web
systemctl enable toolhub-celery
systemctl restart toolhub-api
systemctl restart toolhub-celery

# For PM2, we need to handle it differently
su - $APP_USER -c "export PM2_HOME=/opt/toolhub/.pm2 && cd /opt/toolhub/frontend && pm2 delete toolhub-web 2>/dev/null || true && pm2 start npm --name toolhub-web -- start"
su - $APP_USER -c "export PM2_HOME=/opt/toolhub/.pm2 && pm2 save"

# Wait for services to start
sleep 5

# ============================================================
# Health check
# ============================================================
echo ""
echo "Checking service status..."

API_STATUS="FAILED"
WEB_STATUS="FAILED"
CELERY_STATUS="FAILED"
REDIS_STATUS="FAILED"

if systemctl is-active --quiet toolhub-api; then
    API_STATUS="RUNNING"
fi

if curl -s http://127.0.0.1:3000 > /dev/null 2>&1; then
    WEB_STATUS="RUNNING"
fi

if systemctl is-active --quiet toolhub-celery; then
    CELERY_STATUS="RUNNING"
fi

if systemctl is-active --quiet redis-server; then
    REDIS_STATUS="RUNNING"
fi

# ============================================================
# Output summary
# ============================================================
echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "Service Status:"
echo "  Backend API:    $API_STATUS"
echo "  Frontend:       $WEB_STATUS"
echo "  Celery Worker:  $CELERY_STATUS"
echo "  Redis:          $REDIS_STATUS"
echo ""
echo "Useful commands:"
echo "  View API logs:      journalctl -u toolhub-api -f"
echo "  View Celery logs:   journalctl -u toolhub-celery -f"
echo "  View PM2 logs:      su - toolhub -c 'pm2 logs toolhub-web'"
echo "  Restart API:        systemctl restart toolhub-api"
echo "  Restart Celery:     systemctl restart toolhub-celery"
echo "  Restart Frontend:   su - toolhub -c 'pm2 restart toolhub-web'"
echo ""
echo "Next steps (if first deployment):"
echo "  1. Configure DNS to point to this server"
echo "  2. Run: certbot --nginx -d yourdomain.com"
echo ""
echo -e "${GREEN}==========================================${NC}"

# Exit with error if services failed
if [ "$API_STATUS" = "FAILED" ]; then
    echo ""
    warn "API service failed to start. Showing logs:"
    journalctl -u toolhub-api -n 30 --no-pager
    exit 1
fi
