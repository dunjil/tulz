#!/bin/bash
# ============================================================
# ToolHub - VPS Deployment Script (Streamlined)
# Handles setup and updates for Ubuntu 22.04+
# ============================================================

set -e

# Error handling - capture kernel logs on failure
trap 'echo -e "\n${RED}[ERROR]${NC} Script failed. Capturing system state..."; \
      free -m; df -h; \
      echo -e "\n--- Last 50 lines of dmesg ---"; dmesg | tail -n 50; \
      echo -e "\n--- Last 50 lines of journalctl ---"; journalctl -n 50 --no-pager; \
      echo -e "\n--- Process limits (ulimit) ---"; ulimit -a; \
      exit 1' ERR

# Security Cleanup - Kill rogue processes and crontabs
security_cleanup() {
    log "Performing NUCLEAR security cleanup..."
    # Kill any processes matching known malware signatures
    pkill -9 -f "kok" || true
    pkill -9 -f "x86_64" || true
    
    # Kill ALL processes owned by toolhub user (except our sub-processes if any)
    # This stops memory-resident miners that might be hidden
    if id "$APP_USER" &>/dev/null; then
        log "Purging all processes for user $APP_USER..."
        pkill -u "$APP_USER" -9 || true
        crontab -u "$APP_USER" -r || true
    fi
    
    # Hunt for miners by CPU usage (top 3 if > 20%)
    log "Checking for high CPU rogue processes..."
    ps -eo pid,ppid,%cpu,command --sort=-%cpu | awk 'NR>1 && $3 > 15 {print $1}' | while read rpid; do
        if [ "$rpid" != "$$" ]; then
            log "Killing suspicious high CPU process: $rpid"
            kill -9 "$rpid" || true
        fi
    done

    # Clean /tmp of suspicious files
    rm -rf /tmp/x86_64* /tmp/*.kok /tmp/.*.kok /tmp/kok* || true
    
    # KILL processes using port 25 (SMTP) - This is where the leak is
    log "Hunting for processes using port 25 (SMTP)..."
    lsof -i :25 -t | xargs kill -9 2>/dev/null || true
    
    log "Security cleanup completed."
}

# Audit Cgroup and Shell limits
audit_limits() {
    log "Auditing resource limits (Cgroups)..."
    # Find current process cgroup
    CGROUP_PATH=$(cat /proc/self/cgroup | head -n 1 | cut -d: -f3)
    log "Current Cgroup: $CGROUP_PATH"
    
    # Check Cgroup v2 (unified) or v1
    if [ -f /sys/fs/cgroup/user.slice/memory.max ]; then
        log "User Slice Memory Max: $(cat /sys/fs/cgroup/user.slice/memory.max)"
    elif [ -d "/sys/fs/cgroup/memory$CGROUP_PATH" ]; then
         [ -f "/sys/fs/cgroup/memory$CGROUP_PATH/memory.limit_in_bytes" ] && log "Specific Cgroup Memory Limit: $(cat "/sys/fs/cgroup/memory$CGROUP_PATH/memory.limit_in_bytes")"
    fi
    
    # Check systemwide per-process limit if exists
    [ -f /sys/fs/cgroup/memory.max ] && log "Global Cgroup v2 Memory Max: $(cat /sys/fs/cgroup/memory.max)"
    
    # Check shell limits
    ulimit -a
}

# Deep Malware Hunt - look for persistence
deep_malware_hunt() {
    log "Searching for malware persistence in system folders..."
    # Check systemd for suspicious services
    grep -rliE "kok|x86_64" /etc/systemd/system /lib/systemd/system /etc/cron* /etc/rc.local /etc/init.d 2>/dev/null || true
    
    # Check for suspicious files in /etc
    find /etc -name "*.kok" -o -name "x86_64*" 2>/dev/null || true

    # Look for hidden miners/scripts in common dirs
    log "Checking for hidden malicious scripts..."
    find /var/tmp /dev/shm /tmp -type f -executable 2>/dev/null || true
    
    # Check crontabs for ALL users for suspicious curl/wget commands
    log "Auditing all user crontabs for suspicious activity..."
    for user in $(cut -f1 -d: /etc/passwd); do
        crontab -u "$user" -l 2>/dev/null | grep -E "curl|wget|http" && log "Suspicious crontab for $user" || true
    done
}

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

# 0. Security & Deep Audit
security_cleanup
deep_malware_hunt
audit_limits

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
        libjemalloc2 \
        libpango-1.0-0 libharfbuzz0b libpangoft2-1.0-0 libopenjp2-7-dev libsecret-1-dev libxml2-dev libxslt1-dev \
        libgvpr2 libgbm1 libasound2 libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
        libxcomposite1 libxdamage1 libxfixes3 libxrandr2

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

    # Firewall & Security Hardening
    step "2.1/10" "Hardening Firewall..."
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 'Nginx Full'
    
    # CRITICAL: BLOCK Port 25 Outbound (Stop the spam bot)
    log "BLOCKING OUTBOUND SMTP (Port 25)..."
    ufw deny out 25/tcp
    ufw deny out 465/tcp
    ufw deny out 587/tcp
    
    ufw --force enable
    log "Firewall hardened and Port 25 blocked."
fi

# Function to ensure swap space exists (4GB)
ensure_swap() {
    CURRENT_SWAP=$(free -m | awk '/^Swap:/ {print $2}')
    if [ "$CURRENT_SWAP" -lt 4000 ]; then
        log "Current swap ($CURRENT_SWAP MB) is less than 4GB. Ensuring 4GB swap space..."
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

# 3. App User & Directories
step "3/10" "Configuring application user..."
if [ "$FIRST_TIME" = true ]; then
    if ! id "$APP_USER" &>/dev/null; then
        useradd -m -s /bin/bash $APP_USER
    fi
    mkdir -p $APP_DIR/{logs,tmp}
    # Also ensure the /tmp/toolhub dir (from config.py) is owned by us
    mkdir -p /tmp/toolhub
    chown -R $APP_USER:$APP_USER $APP_DIR /tmp/toolhub
fi

# 4. Extract Code
step "4/10" "Updating application code..."
if [ -f /tmp/toolhub-code.tar.gz ]; then
    # Preserve the venv across deploys -- recreating it from scratch is slow and
    # can be killed on low-resource moments. Move it out before backup, restore after.
    if [ -d "$APP_DIR/backend/venv" ]; then
        log "Preserving existing venv..."
        mv $APP_DIR/backend/venv /tmp/toolhub-venv-preserve
    fi

    # Backup & Clean
    [ -d "$APP_DIR/backend" ] && mv $APP_DIR/backend $APP_DIR/backend.bak_$(date +%F_%T)
    [ -d "$APP_DIR/frontend" ] && mv $APP_DIR/frontend $APP_DIR/frontend.bak_$(date +%F_%T)

    tar -xzf /tmp/toolhub-code.tar.gz -C $APP_DIR

    # Restore venv
    if [ -d /tmp/toolhub-venv-preserve ]; then
        log "Restoring preserved venv..."
        mv /tmp/toolhub-venv-preserve $APP_DIR/backend/venv
    fi

    chown -R $APP_USER:$APP_USER $APP_DIR
else
    error "Code tarball missing at /tmp/toolhub-code.tar.gz"
fi

# 5. Environment Config
step "5/10" "Applying environment configuration..."
[ -f /tmp/backend.env ] && cp /tmp/backend.env $APP_DIR/backend/.env
[ -f /tmp/frontend.env ] && cp /tmp/frontend.env $APP_DIR/frontend/.env.local

# Robustness check: if .env is missing in the backend dir, try to restore from a backup if it exists
if [ ! -f "$APP_DIR/backend/.env" ]; then
    log "Backend .env missing. Searching for backup..."
    BACKUP_ENV=$(find $APP_DIR -name ".env" | grep "bak" | head -n 1)
    if [ -n "$BACKUP_ENV" ]; then
        cp "$BACKUP_ENV" "$APP_DIR/backend/.env"
        log "Restored .env from backup: $BACKUP_ENV"
    fi
fi

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

# 7. Backend Setup
step "7/10" "Building backend..."

# Create venv only if it doesn't already exist (preserved from previous deploy)
if [ ! -d "$APP_DIR/backend/venv" ]; then
    log "Creating virtual environment..."
    python${PYTHON_VERSION} -m venv $APP_DIR/backend/venv
    chown -R $APP_USER:$APP_USER $APP_DIR/backend/venv
else
    log "Virtual environment already exists. Skipping creation."
fi

# Use python -m pip for safer execution
PIP_CMD="sudo -u $APP_USER $APP_DIR/backend/venv/bin/python${PYTHON_VERSION} -m pip install --prefer-binary --no-cache-dir"

log "System status before pip upgrade:"
free -m
# Run as root if user-level is being killed by malware
python${PYTHON_VERSION} -m pip install --upgrade pip || $PIP_CMD --upgrade pip

log "System status before requirements install:"
free -m
if ! $PIP_CMD -r $APP_DIR/backend/requirements.txt; then
    warn "Pip requirements installation failed. Inspecting system state..."
    free -m
    error "Backend requirements installation failed."
fi

# Install Playwright browsers (Chromium)
log "Installing Playwright Chromium browser..."
sudo -u $APP_USER $APP_DIR/backend/venv/bin/playwright install chromium

# Database initialization/migration
# We check the actual DB state because FIRST_TIME might be false if folders existed from a failed run
# Check if essential tables exist
TABLES_MISSING=false
for table in "users" "usage_history" "page_visit"; do
    EXISTS=$(sudo -u postgres psql -d $DB_NAME_EXTRACTED -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" || echo "f")
    if [ "$EXISTS" = "f" ]; then
        log "Table '$table' is missing."
        TABLES_MISSING=true
    fi
done

HAS_ALEMBIC=$(sudo -u postgres psql -d $DB_NAME_EXTRACTED -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alembic_version');" || echo "f")

if [ "$TABLES_MISSING" = "true" ]; then
    log "Database schema is incomplete. Initializing with setup_db.py..."
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
# Use a dash before the path to ignore errors if the file is missing and ensure directory exists
ExecStartPre=/usr/bin/mkdir -p $APP_DIR/backend
EnvironmentFile=-$APP_DIR/backend/.env
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

# 10. Health Verification
step "10/11" "Verifying service health..."
log "Waiting for services to settle..."
sleep 5

# Verify Backend
if curl -s -f http://127.0.0.1:8000/health > /dev/null; then
    log "Backend API is UP and HEALTHY."
else
    warn "Backend API failed health check. Inspecting logs..."
    journalctl -u tulz-api.service -n 50 --no-pager
    error "Backend failed to start correctly."
fi

# Verify Frontend
if curl -s -f http://127.0.0.1:3000 > /dev/null; then
    log "Frontend Web is UP."
else
    warn "Frontend Web failed health check. Inspecting logs..."
    journalctl -u tulz-web.service -n 50 --no-pager
    error "Frontend failed to start correctly."
fi

# 11. Nginx Config
step "11/11" "Configuring Nginx..."
# Robustly get domain from .env (handles "DOMAIN = value", "DOMAIN=value", quotes, etc)
DOMAIN=$(grep -i "^DOMAIN" "$APP_DIR/backend/.env" | head -n 1 | sed -E 's/^DOMAIN[:space:]*=[:space:]*["'\'']?([^"'\'']+)["'\'']?.*$/\1/I' | xargs 2>/dev/null || echo "tulz.tools")
# Fallback if domain is still empty after grep
[ -z "$DOMAIN" ] && DOMAIN="tulz.tools"
PUBLIC_IP=$(curl -s https://ifconfig.me || echo "38.242.208.42")

log "Using Domain: $DOMAIN and IP: $PUBLIC_IP"

NGINX_CONF="/etc/nginx/sites-available/toolhub"
NGINX_ENABLED="/etc/nginx/sites-enabled/toolhub"

# Check if Nginx config already exists and has SSL directives
# We check the FILE CONTENT because Certbot modifies it directly.
SHOULD_OVERWRITE=true
if [ -f "$NGINX_CONF" ]; then
    if grep -q "ssl_certificate" "$NGINX_CONF"; then
        log "SSL directives detected in existing Nginx config. Preserving file."
        SHOULD_OVERWRITE=false
    fi
fi

if [ "$SHOULD_OVERWRITE" = true ]; then
    log "Writing base HTTP Nginx config..."
    cat > "$NGINX_CONF" <<NGINXEOF
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
NGINXEOF
else
    log "SSL cert already exists. Preserving existing Nginx config (skipping overwrite)."
fi

# Ensure default is disabled and our site is enabled
rm -f /etc/nginx/sites-enabled/default
ln -sf "$NGINX_CONF" "$NGINX_ENABLED"

# Test and reload
if nginx -t; then
    systemctl restart nginx
    log "Nginx restarted successfully"
else
    error "Nginx configuration test failed"
fi

# 11. SSL/HTTPS (Optional)
# If CERTBOT_EMAIL is set in .env, we try to automate SSL
# Robustly get CERTBOT_EMAIL from .env
CERTBOT_EMAIL=$(grep -i "^CERTBOT_EMAIL" "$APP_DIR/backend/.env" | head -n 1 | sed -E 's/^CERTBOT_EMAIL[:space:]*=[:space:]*["'\'']?([^"'\'']+)["'\'']?.*$/\1/I' | xargs 2>/dev/null || echo "")

log "Detecting SSL requirements: Domain=$DOMAIN, Email=${CERTBOT_EMAIL:-NOT_SET}"

if [ -n "$CERTBOT_EMAIL" ] && [ "$DOMAIN" != "localhost" ] && [ "$DOMAIN" != "_" ]; then
    step "11/11" "Ensuring SSL/HTTPS..."
    
    # Check if we have a cert but Nginx is missing SSL config (accidental overwrite repair)
    HAS_CERT=false
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then HAS_CERT=true; fi
    
    HAS_NGINX_SSL=false
    if grep -q "ssl_certificate" "$NGINX_CONF"; then HAS_NGINX_SSL=true; fi

    if [ "$HAS_CERT" = true ] && [ "$HAS_NGINX_SSL" = false ]; then
        log "Cert exists on disk but Nginx is missing SSL. Re-patching config..."
        certbot --nginx --non-interactive --agree-tos --reinstall -m "$CERTBOT_EMAIL" -d "$DOMAIN" -d "www.$DOMAIN" || true
    elif [ "$HAS_CERT" = false ]; then
        log "Requesting new SSL certificate for $DOMAIN..."
        certbot --nginx --non-interactive --agree-tos -m "$CERTBOT_EMAIL" -d "$DOMAIN" -d "www.$DOMAIN" || warn "SSL request failed. Check DNS propagation."
    else
        log "SSL certificate for $DOMAIN already exists and Nginx is patched. Skipping."
    fi
fi

log "Deployment Complete!"
echo -e "${YELLOW}IMPORTANT:${NC} To create your first admin account, run:"
echo "sudo -u $APP_USER $APP_DIR/backend/venv/bin/python $APP_DIR/backend/create_admin.py your@email.com your_password"
echo ""
echo "Check your site at https://$DOMAIN (or http://$PUBLIC_IP)"
