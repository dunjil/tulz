#!/bin/bash

# ============================================================
# ToolHub VPS Setup Script
# For Ubuntu 22.04 LTS (2 vCPU, 4GB RAM minimum)
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Configuration
DOMAIN=${DOMAIN:-"toolhub.local"}
APP_USER=${APP_USER:-"toolhub"}
APP_DIR="/home/$APP_USER/app"
DB_NAME="toolhub"
DB_USER="toolhub"
DB_PASS=${DB_PASS:-$(openssl rand -base64 32)}

log "Starting ToolHub setup..."
log "Domain: $DOMAIN"

# ============================================================
# System Updates
# ============================================================
log "Updating system packages..."
apt-get update && apt-get upgrade -y

# ============================================================
# Install Dependencies
# ============================================================
log "Installing system dependencies..."
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
    pngquant \
    poppler-utils \
    libpq-dev \
    libjpeg-dev \
    zlib1g-dev \
    libpng-dev

# ============================================================
# Install Python 3.12
# ============================================================
log "Installing Python 3.12..."
add-apt-repository -y ppa:deadsnakes/ppa
apt-get update
apt-get install -y python3.12 python3.12-venv python3.12-dev python3-pip

# ============================================================
# Install Node.js 22
# ============================================================
log "Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# ============================================================
# Install PostgreSQL 15
# ============================================================
log "Installing PostgreSQL 15..."
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt-get update
apt-get install -y postgresql-15 postgresql-contrib-15

# Configure PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Configure Redis
systemctl start redis-server
systemctl enable redis-server

sudo -u postgres psql <<EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

log "PostgreSQL configured. Database: $DB_NAME, User: $DB_USER"

# ============================================================
# Create Application User
# ============================================================
log "Creating application user..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -m -s /bin/bash $APP_USER
fi

# ============================================================
# Setup Application Directory
# ============================================================
log "Setting up application directory..."
mkdir -p $APP_DIR
chown -R $APP_USER:$APP_USER $APP_DIR

# ============================================================
# Configure Firewall
# ============================================================
log "Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# ============================================================
# Configure Fail2Ban
# ============================================================
log "Configuring Fail2Ban..."
cat > /etc/fail2ban/jail.local <<EOF
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
EOF

systemctl restart fail2ban
systemctl enable fail2ban

# ============================================================
# Create Nginx Configuration
# ============================================================
log "Creating Nginx configuration..."
cat > /etc/nginx/sites-available/toolhub <<EOF
# Rate limiting zone
limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/m;
limit_req_zone \$binary_remote_addr zone=general:10m rate=100r/m;

server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

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

    # File upload size
    client_max_body_size 50M;

    # API proxy
    location /api/ {
        limit_req zone=api burst=10 nodelay;

        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }

    # Frontend proxy
    location / {
        limit_req zone=general burst=20 nodelay;

        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Static files caching (for production)
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/toolhub /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ============================================================
# Create Systemd Services
# ============================================================
log "Creating systemd services..."

# Backend service
cat > /etc/systemd/system/toolhub-api.service <<EOF
[Unit]
Description=ToolHub FastAPI Backend
After=network.target postgresql.service

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR/backend
Environment="PATH=$APP_DIR/backend/venv/bin"
EnvironmentFile=$APP_DIR/backend/.env
ExecStart=$APP_DIR/backend/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 127.0.0.1:8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Frontend service (using PM2)
cat > /etc/systemd/system/toolhub-web.service <<EOF
[Unit]
Description=ToolHub Next.js Frontend
After=network.target

[Service]
Type=forking
User=$APP_USER
WorkingDirectory=$APP_DIR/frontend
Environment="PATH=/usr/bin"
ExecStart=/usr/bin/pm2 start npm --name toolhub-web -- start
ExecReload=/usr/bin/pm2 reload toolhub-web
ExecStop=/usr/bin/pm2 stop toolhub-web
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload

# ============================================================
# Create Deployment Script
# ============================================================
log "Creating deployment script..."
cat > $APP_DIR/deploy.sh <<'DEPLOY_EOF'
#!/bin/bash
set -e

APP_DIR="/home/toolhub/app"
cd $APP_DIR

echo "Pulling latest code..."
git pull origin main

echo "Deploying backend..."
cd $APP_DIR/backend
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
deactivate

echo "Deploying frontend..."
cd $APP_DIR/frontend
npm install
npm run build

echo "Restarting services..."
sudo systemctl restart toolhub-api
sudo systemctl restart toolhub-web

echo "Deployment complete!"
DEPLOY_EOF
chmod +x $APP_DIR/deploy.sh
chown $APP_USER:$APP_USER $APP_DIR/deploy.sh

# ============================================================
# Output Summary
# ============================================================
log "============================================================"
log "ToolHub VPS Setup Complete!"
log "============================================================"
log ""
log "Database credentials:"
log "  Database: $DB_NAME"
log "  User: $DB_USER"
log "  Password: $DB_PASS"
log ""
log "Next steps:"
log "1. Clone your repository to $APP_DIR"
log "2. Copy .env.example to .env and configure"
log "3. Set up Python virtual environment:"
log "   cd $APP_DIR/backend"
log "   python3.12 -m venv venv"
log "   source venv/bin/activate"
log "   pip install -r requirements.txt"
log ""
log "4. Build frontend:"
log "   cd $APP_DIR/frontend"
log "   npm install"
log "   npm run build"
log ""
log "5. Run migrations:"
log "   cd $APP_DIR/backend"
log "   alembic upgrade head"
log ""
log "6. Start services:"
log "   sudo systemctl start toolhub-api"
log "   sudo systemctl start toolhub-web"
log "   sudo systemctl enable toolhub-api"
log "   sudo systemctl enable toolhub-web"
log ""
log "7. Set up SSL (after DNS is configured):"
log "   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
log ""
log "============================================================"
