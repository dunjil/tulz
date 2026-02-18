#!/bin/bash
# ============================================================
# ToolHub - VPS Deployment Script (Streamlined)
# Handles setup and updates for Ubuntu 22.04+
# ============================================================

set -e

trap 'echo -e "\n${RED}[ERROR]${NC} Script failed. Exit code: $?"; exit 1' ERR

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

# Function to ensure swap space exists (4GB)
ensure_swap() {
    CURRENT_SWAP=$(free -m | awk '/^Swap:/ {print $2}')
    if [ "$CURRENT_SWAP" -lt 4000 ]; then
        log "Current swap ($CURRENT_SWAP MB) is less than 4GB. Increasing swap space..."
        # If /swapfile exists, turn it off first to resize it
        if [ -f /swapfile ]; then
            swapoff /swapfile || true
            rm -f /swapfile
        fi
        fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        if ! grep -q "/swapfile" /etc/fstab; then
            echo '/swapfile none swap sw 0 0' >> /etc/fstab
        fi
        log "4GB Swap file created and enabled."
    else
        log "Sufficient swap space already exists ($CURRENT_SWAP MB)."
    fi
}

# 0. Pre-requisites
ensure_swap

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

    # Firewall is managed externally or via separate script
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
    # Persist environments if they exist
    [ -d "$APP_DIR/backend/venv" ] && mv $APP_DIR/backend/venv /tmp/toolhub_venv_bak
    [ -d "$APP_DIR/frontend/node_modules" ] && mv $APP_DIR/frontend/node_modules /tmp/toolhub_node_bak

    # Backup & Clean
    [ -d "$APP_DIR/backend" ] && mv $APP_DIR/backend $APP_DIR/backend.bak_$(date +%F_%T)
    [ -d "$APP_DIR/frontend" ] && mv $APP_DIR/frontend $APP_DIR/frontend.bak_$(date +%F_%T)
    
    tar -xzf /tmp/toolhub-code.tar.gz -C $APP_DIR
    
    # Restore environments
    [ -d "/tmp/toolhub_venv_bak" ] && mv /tmp/toolhub_venv_bak $APP_DIR/backend/venv
    [ -d "/tmp/toolhub_node_bak" ] && mv /tmp/toolhub_node_bak $APP_DIR/frontend/node_modules
    
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
step "6/10" "Synchronizing database credentials..."
# Extract credentials from .env
DB_URL=$(grep "^DATABASE_URL=" $APP_DIR/backend/.env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
# Extract user, pass, host, port, dbname from URL: postgresql+asyncpg://user:pass@host:port/dbname
DB_USER_EXTRACTED=$(echo $DB_URL | sed 's/.*:\/\/\([^:]*\):.*/\1/')
DB_PASS_EXTRACTED=$(echo $DB_URL | sed 's/.*:\/\/.*:\([^@]*\)@.*/\1/')
DB_NAME_EXTRACTED=$(echo $DB_URL | sed 's/.*\/\([^?\/]*\).*/\1/')

log "Syncing user: $DB_USER_EXTRACTED"
# Create or Update User
# Run from /tmp to avoid "could not change directory" errors
cd /tmp
sudo -u postgres psql -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER_EXTRACTED') THEN CREATE ROLE $DB_USER_EXTRACTED WITH LOGIN PASSWORD '$DB_PASS_EXTRACTED'; ELSE ALTER ROLE $DB_USER_EXTRACTED WITH PASSWORD '$DB_PASS_EXTRACTED'; END IF; END \$\$;"

# Create Database if missing
if [ "$FIRST_TIME" = true ] || ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME_EXTRACTED"; then
    log "Creating database: $DB_NAME_EXTRACTED"
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME_EXTRACTED OWNER $DB_USER_EXTRACTED;" || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME_EXTRACTED TO $DB_USER_EXTRACTED;" || true
fi

# Always ensure schema permissions (helpful if user was created manually)
sudo -u postgres psql -d $DB_NAME_EXTRACTED -c "GRANT ALL ON SCHEMA public TO $DB_USER_EXTRACTED;" || true

step "7/10" "Building backend..."
if [ ! -d "$APP_DIR/backend/venv" ]; then
    log "Creating virtual environment..."
    python${PYTHON_VERSION} -m venv $APP_DIR/backend/venv
    chown -R $APP_USER:$APP_USER $APP_DIR/backend/venv
else
    log "Virtual environment already exists. Skipping creation."
fi

log "Upgrading pip..."
sudo -u $APP_USER $APP_DIR/backend/venv/bin/pip install --upgrade pip

# Install in batches to isolate OOM and find the problematic package
log "Installing backend dependencies in batches..."

PIP_CMD="$APP_DIR/backend/venv/bin/pip install --prefer-binary --no-cache-dir"

# 1. Base requirements (everything except heavy hitters)
log "Batch 1: Base requirements..."
sudo -u $APP_USER bash -c "grep -vE 'pandas|rembg|opencv|ocrmypdf|pillow|PyMuPDF' $APP_DIR/backend/requirements.txt > /tmp/req_base.txt"
sudo -u $APP_USER $PIP_CMD -r /tmp/req_base.txt

# 2. Individual heavy hitters
for pkg in "pandas" "pillow" "PyMuPDF" "opencv-python-headless" "rembg" "ocrmypdf"; do
    log "Batch: Installing $pkg..."
    # Get version from requirements if possible
    VERSION=$(grep -i "^$pkg==" $APP_DIR/backend/requirements.txt || echo "$pkg")
    sudo -u $APP_USER $PIP_CMD $VERSION
done

# 3. Final sweep to ensure everything is matched
log "Batch: Final sync with requirements.txt..."
sudo -u $APP_USER $PIP_CMD -r $APP_DIR/backend/requirements.txt

# Database initialization/migration
# We check the actual DB state because FIRST_TIME might be false if folders existed from a failed run
HAS_USERS=$(sudo -u postgres psql -d $DB_NAME_EXTRACTED -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users');" || echo "f")
HAS_ALEMBIC=$(sudo -u postgres psql -d $DB_NAME_EXTRACTED -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alembic_version');" || echo "f")

if [ "$HAS_USERS" = "f" ]; then
    log "Core tables missing. Initializing schema with setup_db.py..."
    sudo -u $APP_USER bash -c "cd $APP_DIR/backend && $APP_DIR/backend/venv/bin/python setup_db.py"
    log "Stamping migration version as head..."
    sudo -u $APP_USER bash -c "cd $APP_DIR/backend && $APP_DIR/backend/venv/bin/alembic stamp head"
elif [ "$HAS_ALEMBIC" = "f" ]; then
    log "Tables exist but no migration record found. Stamping head..."
    sudo -u $APP_USER bash -c "cd $APP_DIR/backend && $APP_DIR/backend/venv/bin/alembic stamp head"
else
    log "Database is ready. Running any pending migrations..."
    sudo -u $APP_USER bash -c "cd $APP_DIR/backend && $APP_DIR/backend/venv/bin/alembic upgrade head"
fi

# 8. Frontend Build
step "8/10" "Building frontend..."
# Ensure ownership is correct before building
chown -R $APP_USER:$APP_USER $APP_DIR/frontend
# Remove .next to prevent ENOENT errors with trace files during build
sudo -u $APP_USER rm -rf $APP_DIR/frontend/.next
sudo -u $APP_USER bash -c "cd $APP_DIR/frontend && npm install"
sudo -u $APP_USER bash -c "cd $APP_DIR/frontend && NODE_OPTIONS=--max-old-space-size=2048 npm run build"

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
step "10/10" "Configuring Nginx..."
# Try to get domain from .env, if it contains 'tulz.tools' use it, otherwise use tulz.tools as primary
DOMAIN=$(grep "^DOMAIN=" $APP_DIR/backend/.env | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' || echo "tulz.tools")
PUBLIC_IP=$(curl -s https://ifconfig.me || echo "38.242.208.42")

log "Using Domain: $DOMAIN and IP: $PUBLIC_IP"

cat > /etc/nginx/sites-available/toolhub <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN $PUBLIC_IP;
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

# Ensure default is disabled and our site is enabled
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/toolhub /etc/nginx/sites-enabled/

# Test and reload
if nginx -t; then
    systemctl restart nginx
    log "Nginx restarted successfully"
else
    error "Nginx configuration test failed"
fi

# 11. SSL/HTTPS (Optional)
# If CERTBOT_EMAIL is set in .env, we try to automate SSL
CERTBOT_EMAIL=$(grep "^CERTBOT_EMAIL=" $APP_DIR/backend/.env | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' || echo "")

if [ -n "$CERTBOT_EMAIL" ] && [ "$DOMAIN" != "localhost" ] && [ "$DOMAIN" != "_" ]; then
    step "11/11" "Ensuring SSL/HTTPS..."
    if ! certbot certificates | grep -q "$DOMAIN"; then
        log "Requesting new SSL certificate for $DOMAIN..."
        # We use --non-interactive and --agree-tos for automation
        certbot --nginx --non-interactive --agree-tos -m "$CERTBOT_EMAIL" -d "$DOMAIN" -d "www.$DOMAIN" || warn "SSL request failed. Check DNS propagation."
    else
        log "SSL certificate for $DOMAIN already exists."
    fi
fi

log "Deployment Complete!"
echo -e "${YELLOW}IMPORTANT:${NC} To create your first admin account, run:"
echo "sudo -u $APP_USER $APP_DIR/backend/venv/bin/python $APP_DIR/backend/create_admin.py your@email.com your_password"
echo ""
echo "Check your site at https://$DOMAIN (or http://$PUBLIC_IP)"
