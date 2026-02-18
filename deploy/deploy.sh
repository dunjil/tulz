#!/bin/bash
# ============================================================
# ToolHub - VPS Deployment Script (Streamlined)
# Handles setup and updates for Ubuntu 22.04+
# ============================================================

set -e

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
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
step() { echo -e "${BLUE}[$1]${NC} $2"; }

# 1. Setup Check
step "1/10" "Checking environment..."
if [ ! -d "$APP_DIR/backend" ]; then
    FIRST_TIME=true
    log "First-time setup detected"
else
    FIRST_TIME=false
    log "Existing installation detected"
fi

# 2. System Dependencies
if [ "$FIRST_TIME" = true ]; then
    step "2/10" "Installing system dependencies..."
    apt-get update && apt-get upgrade -y
    apt-get install -y \
        curl wget git build-essential software-properties-common \
        ufw fail2ban nginx certbot python3-certbot-nginx \
        libpq-dev libffi-dev libssl-dev libjpeg-dev zlib1g-dev libpng-dev \
        poppler-utils tesseract-ocr tesseract-ocr-eng ghostscript \
        libjemalloc2

    # Python 3.12
    add-apt-repository -y ppa:deadsnakes/ppa
    apt-get update
    apt-get install -y python${PYTHON_VERSION} python${PYTHON_VERSION}-venv python${PYTHON_VERSION}-dev

    # Node.js
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs

    # PostgreSQL 15
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    apt-get update
    apt-get install -y postgresql-15 postgresql-contrib-15
    systemctl enable postgresql --now

    # Firewall
    ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw --force enable
fi

# 3. App User & Directories
step "3/10" "Configuring application user..."
if [ "$FIRST_TIME" = true ]; then
    if ! id "$APP_USER" &>/dev/null; then
        useradd -m -s /bin/bash $APP_USER
    fi
    mkdir -p $APP_DIR/{logs,tmp}
    chown -R $APP_USER:$APP_USER $APP_DIR
fi

# 4. Extract Code
step "4/10" "Updating application code..."
if [ -f /tmp/toolhub-code.tar.gz ]; then
    # Backup & Clean
    [ -d "$APP_DIR/backend" ] && mv $APP_DIR/backend $APP_DIR/backend.bak_$(date +%F_%T)
    [ -d "$APP_DIR/frontend" ] && mv $APP_DIR/frontend $APP_DIR/frontend.bak_$(date +%F_%T)
    
    tar -xzf /tmp/toolhub-code.tar.gz -C $APP_DIR
    chown -R $APP_USER:$APP_USER $APP_DIR
else
    error "Code tarball missing at /tmp/toolhub-code.tar.gz"
fi

# 5. Environment Config
step "5/10" "Applying environment configuration..."
[ -f /tmp/backend.env ] && cp /tmp/backend.env $APP_DIR/backend/.env
[ -f /tmp/frontend.env ] && cp /tmp/frontend.env $APP_DIR/frontend/.env.local
chown $APP_USER:$APP_USER $APP_DIR/backend/.env $APP_DIR/frontend/.env.local
chmod 600 $APP_DIR/backend/.env $APP_DIR/frontend/.env.local

# 6. Database Setup
if [ "$FIRST_TIME" = true ]; then
    step "6/10" "Setting up database..."
    DB_PASS=$(grep "^DATABASE_URL=" $APP_DIR/backend/.env | sed 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/' || echo "safe_password")
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" || true
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" || true
    sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;" || true
fi

# 7. Backend Setup
step "7/10" "Building backend..."
su - $APP_USER -c "cd $APP_DIR/backend && python${PYTHON_VERSION} -m venv venv"
su - $APP_USER -c "$APP_DIR/backend/venv/bin/pip install --upgrade pip"
su - $APP_USER -c "$APP_DIR/backend/venv/bin/pip install -r $APP_DIR/backend/requirements.txt"
su - $APP_USER -c "cd $APP_DIR/backend && $APP_DIR/backend/venv/bin/alembic upgrade head"

# 8. Frontend Build
step "8/10" "Building frontend..."
su - $APP_USER -c "cd $APP_DIR/frontend && npm install && npm run build"

# 9. Systemd Services
step "9/10" "Updating systemd services..."
cat > /etc/systemd/system/tulz-api.service <<EOF
[Unit]
Description=Tulz API
After=network.target postgresql.service

[Service]
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR/backend
Environment="PATH=$APP_DIR/backend/venv/bin"
EnvironmentFile=$APP_DIR/backend/.env
ExecStart=$APP_DIR/backend/venv/bin/gunicorn app.main:app \
    --workers 3 --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 --timeout 300
Restart=always

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/tulz-web.service <<EOF
[Unit]
Description=Tulz Web
After=network.target

[Service]
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR/frontend
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable tulz-api tulz-web
systemctl restart tulz-api tulz-web

# 10. Nginx Config
if [ "$FIRST_TIME" = true ] || [ ! -f /etc/nginx/sites-available/toolhub ]; then
    step "10/10" "Configuring Nginx..."
    DOMAIN=$(grep "^DOMAIN=" $APP_DIR/backend/.env | cut -d'=' -f2 | tr -d '"' || echo "_")
    cat > /etc/nginx/sites-available/toolhub <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    client_max_body_size 100M;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    rm -f /etc/nginx/sites-enabled/default
    ln -sf /etc/nginx/sites-available/toolhub /etc/nginx/sites-enabled/
    nginx -t && systemctl restart nginx
fi

log "Deployment Complete!"
echo -e "${YELLOW}IMPORTANT:${NC} To create your first admin account, run:"
echo "sudo -u $APP_USER $APP_DIR/backend/venv/bin/python $APP_DIR/backend/create_admin.py your@email.com your_password"
echo ""
echo "Check your site at http://$DOMAIN (or run certbot for SSL)"
