#!/bin/bash
# ============================================================
# ToolHub - VPS Deployment Script (Streamlined)
# Handles setup and updates for Ubuntu 22.04+
# ============================================================
SCRIPT_VERSION="1.1.0 - Atomic Swap"
STAGING_DIR="/opt/toolhub-staging"

set -e

# Error handling - capture kernel logs on failure
error_handler() {
    local exit_code=$?
    local line_no=$1
    local command="$2"
    echo -e "\n${RED}[FATAL ERROR]${NC} Deployment failed at line $line_no"
    echo -e "${RED}[COMMAND]${NC} $command"
    
    # SYSTEM RECOVERY: If we failed during STAGING build, production is untouched.
    # Just clean up staging.
    if [ -d "$STAGING_DIR" ]; then
        log "Cleaning up failed staging directory..."
        rm -rf "$STAGING_DIR" || true
    fi

    # If we already stopped services, try to bring them back up
    echo "Ensuring production services are running..."
    systemctl start tulz-api tulz-web || true
    
    echo -e "\n--- Quick Diagnostics ---"
    free -m || echo "free command failed"
    df -h / || echo "df failed"
    exit $exit_code
}
trap 'error_handler $LINENO "$BASH_COMMAND"' ERR

# Non-destructive malware purge (Safe to run while app is online)
malware_purge() {
    log "[START] malware_purge"
    log "Performing NUCLEAR malware purge..."
    
    # 1. Clear LD_PRELOAD hijacking
    if [ -f /etc/ld.so.preload ]; then
        log "WARNING: /etc/ld.so.preload detected. Clearing it to remove rootkit hooks..."
        echo "" > /etc/ld.so.preload
    fi

    # 2. Kill any processes matching known malware signatures
    pkill -9 -f "kok" || true
    pkill -9 -f "x86_64" || true
    pkill -9 -f "logic.sh" || true
    
    # 3. Clean /tmp, /var/tmp and /dev/shm of suspicious files and hidden Unix folders
    log "Purging malicious files and hidden Unix folders..."
    rm -rf /tmp/.*.kok /tmp/*.kok /tmp/.b_* /tmp/kok* /tmp/.x /tmp/.monitor /tmp/logic.sh || true
    rm -rf /tmp/.XIM-unix /tmp/.ICE-unix /tmp/.font-unix || true
    rm -rf /var/tmp/.b_* /var/tmp/.monitor || true
    rm -rf /dev/shm/*.kok || true
    
    # 4. Reset toolhub user shell profiles to remove persistence
    if [ -d "/home/$APP_USER" ]; then
        log "Neutralizing shell profiles and crontabs for $APP_USER..."
        # Backup then clear
        [ -f "/home/$APP_USER/.bashrc" ] && cp "/home/$APP_USER/.bashrc" "/home/$APP_USER/.bashrc.bak" && echo -e "case \$- in *i*) ;; *) return;; esac\n[ -z \"\$PS1\" ] && return" > "/home/$APP_USER/.bashrc"
        [ -f "/home/$APP_USER/.profile" ] && cp "/home/$APP_USER/.profile" "/home/$APP_USER/.profile.bak" && echo "" > "/home/$APP_USER/.profile"
        
        # NUCLEAR: Clear crontab for the app user to remove re-infection hooks
        crontab -u "$APP_USER" -r 2>/dev/null || true
    fi

    # 5. KILL processes using port 25 (SMTP) or known malicious naming patterns
    if command -v lsof >/dev/null; then
        lsof -i :25 -t | xargs -r kill -9 2>/dev/null || true
    fi
    pkill -9 -f "kok" || true
    pkill -9 -f "x86_64" || true
    
    log "[END] malware_purge"
}

# Destructive cleanup (Only run during swap/when app is stopped)
production_cleanup() {
    log "[START] production_cleanup"
    log "Performing final production environment purge..."
    
    # Kill ALL processes owned by toolhub user
    if id "$APP_USER" &>/dev/null; then
        log "Purging all processes for user $APP_USER..."
        pkill -u "$APP_USER" -9 || true
        crontab -u "$APP_USER" -r || true
    fi
    
    # KILL zombie playwright/chromium processes
    log "Cleaning up zombie browser processes..."
    pkill -9 -f "headless_shell" || true
    pkill -9 -f "chromium" || true
    
    log "[END] production_cleanup"
}

# Set base firewall rules (SSH/Web)
setup_firewall_base() {
    log "[START] setup_firewall_base"
    step "Security" "Setting up base firewall rules..."
    if ! command -v ufw >/dev/null; then
        warn "ufw not found. Skipping firewall setup (it will be installed in step 2)."
        return 0
    fi

    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH and Web
    ufw allow ssh
    ufw allow 'Nginx Full'
    
    # Enable if not enabled
    ufw --force enable
    log "Base firewall enforced."
    log "[END] setup_firewall_base"
}

# Block Port 25 Outbound (Run after deployment)
block_smtp_outbound() {
    step "Security" "Locking down SMTP (Port 25/465/587)..."
    if ! command -v ufw >/dev/null; then
        warn "ufw not found. Cannot block SMTP ports."
        return 0
    fi

    # CRITICAL: BLOCK Port 25 Outbound (Stop the spam bot)
    ufw deny out 25/tcp
    ufw deny out 465/tcp
    ufw deny out 587/tcp
    
    # Re-enable to ensure rules apply
    ufw --force enable
    log "SMTP Outbound blocked."
}

# Audit Cgroup and Shell limits
audit_limits() {
    log "[START] audit_limits"
    log "Auditing resource limits (Cgroups)..."
    # Find current process cgroup
    CGROUP_PATH=$(cat /proc/self/cgroup 2>/dev/null | head -n 1 | cut -d: -f3 || echo "")
    log "Current Cgroup: ${CGROUP_PATH:-unknown}"
    
    # Check Cgroup v2 (unified) or v1
    if [ -f /sys/fs/cgroup/user.slice/memory.max ]; then
        log "User Slice Memory Max: $(cat /sys/fs/cgroup/user.slice/memory.max 2>/dev/null || echo 'unlimited')"
    elif [ -n "$CGROUP_PATH" ] && [ -d "/sys/fs/cgroup/memory$CGROUP_PATH" ]; then
         [ -f "/sys/fs/cgroup/memory$CGROUP_PATH/memory.limit_in_bytes" ] && log "Specific Cgroup Memory Limit: $(cat "/sys/fs/cgroup/memory$CGROUP_PATH/memory.limit_in_bytes" 2>/dev/null || echo 'unlimited')"
    fi
    
    # Check systemwide per-process limit if exists
    [ -f /sys/fs/cgroup/memory.max ] && log "Global Cgroup v2 Memory Max: $(cat /sys/fs/cgroup/memory.max 2>/dev/null || echo 'unlimited')"
    log "[END] audit_limits"
}

# Deep Malware Hunt - look for persistence
deep_malware_hunt() {
    log "[START] deep_malware_hunt"
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

# 0. Preparation
step "0/10" "Preparing deployment... (Script Version: $SCRIPT_VERSION)"
# NOTE: We NO LONGER stop services here. We build in staging first.

malware_purge
setup_firewall_base
# Audit limits and deep hunt can run while app is online
audit_limits
deep_malware_hunt

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
fi

# Ensure critical Python tools exist (non-first time check)
ensure_python_tools() {
    log "Ensuring critical Python tools (pip, distutils) are installed..."
    # On current Ubuntu, python3-pip and python3-venv are essential
    apt-get update -qq
    apt-get install -y python3-pip python3-venv python3-setuptools || warn "Failed to install some python tools"
}

ensure_python_tools

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
    mkdir -p $STAGING_DIR
fi

# 4. Build in Staging
step "4/10" "Preparing new version in staging..."
if [ -f /tmp/toolhub-code.tar.gz ]; then
    log "Creating staging environment..."
    rm -rf "$STAGING_DIR"
    mkdir -p "$STAGING_DIR"
    
    tar -xzf /tmp/toolhub-code.tar.gz -C "$STAGING_DIR"
    
    # Ensure structure exists even if tarball is flat or nested
    # More robust check for nesting: look for the directory containing 'backend'
    if [ ! -d "$STAGING_DIR/backend" ]; then
        NESTED_ROOT=$(find "$STAGING_DIR" -maxdepth 2 -name "backend" -type d -printf '%h\n' | head -n 1)
        if [ -n "$NESTED_ROOT" ] && [ "$NESTED_ROOT" != "$STAGING_DIR" ]; then
            log "Detected nested project structure at $NESTED_ROOT in tarball. Flattening..."
            mv "$NESTED_ROOT"/* "$STAGING_DIR/" 2>/dev/null || true
        fi
    fi

    # Explicitly ensure target directories exist for config seeding
    mkdir -p "$STAGING_DIR/backend" "$STAGING_DIR/frontend"
    
    # Sync existing configuration and environment
    log "Seeding staging from production..."
    [ -f "$APP_DIR/backend/.env" ] && cp "$APP_DIR/backend/.env" "$STAGING_DIR/backend/"
    [ -f "$APP_DIR/frontend/.env.local" ] && cp "$APP_DIR/frontend/.env.local" "$STAGING_DIR/frontend/"
    
    # Preserve/Copy venv to staging to speed up build
    if [ -d "$APP_DIR/backend/venv" ]; then
        log "Copying production virtualenv to staging for build..."
        cp -r "$APP_DIR/backend/venv" "$STAGING_DIR/backend/"
    fi

    chown -R $APP_USER:$APP_USER "$STAGING_DIR"
else
    error "Code tarball missing at /tmp/toolhub-code.tar.gz"
fi

# 5. Environment Config (to Staging)
step "5/10" "Applying environment configuration to staging..."
[ -f /tmp/backend.env ] && cp /tmp/backend.env "$STAGING_DIR/backend/.env"
[ -f /tmp/frontend.env ] && cp /tmp/frontend.env "$STAGING_DIR/frontend/.env.local"

# Robustness check: if .env is missing in the backend staging dir, try to restore from prod
if [ ! -f "$STAGING_DIR/backend/.env" ]; then
    log "Backend .env missing in staging. Searching for prod/backup..."
    if [ -f "$APP_DIR/backend/.env" ]; then
        cp "$APP_DIR/backend/.env" "$STAGING_DIR/backend/.env"
        log "Restored .env from prod."
    fi
fi

chown $APP_USER:$APP_USER "$STAGING_DIR/backend/.env" "$STAGING_DIR/frontend/.env.local"
chmod 600 "$STAGING_DIR/backend/.env" "$STAGING_DIR/frontend/.env.local"

# 6. Database Setup (Can run while system is alive as it is additive usually)
step "6/10" "Synchronizing database credentials..."
# Extract credentials from staging .env
DB_URL=$(grep "^DATABASE_URL=" "$STAGING_DIR/backend/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
# Extract user, pass, host, port, dbname from URL: postgresql+asyncpg://user:pass@host:port/dbname
DB_USER_EXTRACTED=$(echo $DB_URL | sed 's/.*:\/\/\([^:]*\):.*/\1/')
DB_PASS_EXTRACTED=$(echo $DB_URL | sed 's/.*:\/\/.*:\([^@]*\)@.*/\1/')
DB_NAME_EXTRACTED=$(echo $DB_URL | sed 's/.*\/\([^?\/]*\).*/\1/')

log "Syncing user: $DB_USER_EXTRACTED"
# Create or Update User
cd /tmp
sudo -u postgres psql -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER_EXTRACTED') THEN CREATE ROLE $DB_USER_EXTRACTED WITH LOGIN PASSWORD '$DB_PASS_EXTRACTED'; ELSE ALTER ROLE $DB_USER_EXTRACTED WITH PASSWORD '$DB_PASS_EXTRACTED'; END IF; END \$\$;"

# Create Database if missing
if [ "$FIRST_TIME" = true ] || ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME_EXTRACTED"; then
    log "Creating database: $DB_NAME_EXTRACTED"
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME_EXTRACTED OWNER $DB_USER_EXTRACTED;" || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME_EXTRACTED TO $DB_USER_EXTRACTED;" || true
fi

# Always ensure schema permissions
sudo -u postgres psql -d $DB_NAME_EXTRACTED -c "GRANT ALL ON SCHEMA public TO $DB_USER_EXTRACTED;" || true

# 7. Backend Setup (In Staging)
step "7/10" "Building backend in staging..."

# Create venv in staging if missing
if [ ! -d "$STAGING_DIR/backend/venv" ]; then
    log "Creating new virtual environment in staging..."
    python${PYTHON_VERSION} -m venv "$STAGING_DIR/backend/venv"
fi

# ROOT-BUILD STRATEGY: Run installations as root to bypass user-targeted watchdogs
# We will fix permissions afterwards.
PIP_CMD="$STAGING_DIR/backend/venv/bin/python${PYTHON_VERSION} -m pip install --prefer-binary --no-cache-dir"

log "System status before pip upgrade (Running as ROOT):"
free -m
$PIP_CMD --upgrade pip || python${PYTHON_VERSION} -m pip install --upgrade pip

log "Installing backend requirements in staging (Running as ROOT)..."
if ! $PIP_CMD -r "$STAGING_DIR/backend/requirements.txt"; then
    error "Backend requirements installation failed in staging."
fi

# Install Playwright browser
log "Installing Playwright Chromium in staging (Running as ROOT)..."
"$STAGING_DIR/backend/venv/bin/playwright" install chromium
"$STAGING_DIR/backend/venv/bin/playwright" install-deps chromium

# Database initialization (Runs against live DB)
log "Applying database schema changes..."
# Use root to run the scripts to ensure they aren't killed
cd $STAGING_DIR/backend
$STAGING_DIR/backend/venv/bin/python setup_db.py
$STAGING_DIR/backend/venv/bin/alembic upgrade head || true

# 8. Frontend Build (In Staging)
step "8/10" "Building frontend in staging (Running as ROOT)..."
rm -rf "$STAGING_DIR/frontend/.next"

log "Installing frontend dependencies in staging..."
(cd "$STAGING_DIR/frontend" && npm install)
log "Running frontend build in staging..."
(cd "$STAGING_DIR/frontend" && NODE_OPTIONS=--max-old-space-size=2048 npm run build)

# RESTORE PERMISSIONS BEFORE SWAP
log "Restoring staging permissions to $APP_USER..."
chown -R $APP_USER:$APP_USER "$STAGING_DIR"

# 9. ATOMIC SWAP PHASE
step "9/10" "Performing ATOMIC SWAP..."

# Now we stop the services
log "Stopping production services for swap..."
systemctl stop tulz-api tulz-web || true

# Perform destructive cleanup now that apps are stopped
production_cleanup

log "Swapping staging to production..."
# Backup current
rm -rf "$APP_DIR/backend.bak" "$APP_DIR/frontend.bak"
[ -d "$APP_DIR/backend" ] && mv "$APP_DIR/backend" "$APP_DIR/backend.bak"
[ -d "$APP_DIR/frontend" ] && mv "$APP_DIR/frontend" "$APP_DIR/frontend.bak"

# Move staging to prod
mv "$STAGING_DIR/backend" "$APP_DIR/backend"
mv "$STAGING_DIR/frontend" "$APP_DIR/frontend"

chown -R $APP_USER:$APP_USER $APP_DIR

# Update systemd services if needed
log "Updating systemd configurations..."
# (Previous systemd cat commands remain mostly the same, but let's ensure paths)
cat > /etc/systemd/system/tulz-api.service <<EOF
[Unit]
Description=Tulz API
After=network.target postgresql.service

[Service]
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR/backend
Environment="PATH=$APP_DIR/backend/venv/bin"
# Ensure directory exists
ExecStartPre=/usr/bin/mkdir -p $APP_DIR/backend
EnvironmentFile=-$APP_DIR/backend/.env
ExecStart=$APP_DIR/backend/venv/bin/gunicorn app.main:app \
    --workers 1 --worker-class uvicorn.workers.UvicornWorker \
    --preload --bind 127.0.0.1:8000 --timeout 300
Restart=always
RestartSec=5
# Give the app more time to start/stop before systemd kills it
TimeoutStartSec=60
TimeoutStopSec=60
# KillMode=mixed allows Gunicorn to try to shut down workers gracefully
KillMode=mixed

# RESOURCE LIMITS: Prevent crashes and OOM loops
MemoryMax=2G
CPUWeight=50
IOWeight=50

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
log "Waiting for services to settle (with retries)..."

# Robust Health Check Loop for Backend
MAX_RETRIES=6
RETRY_DELAY=5
BACKEND_UP=false

for i in $(seq 1 $MAX_RETRIES); do
    log "Backend health check attempt $i/$MAX_RETRIES..."
    if curl -s -f http://127.0.0.1:8000/health > /dev/null; then
        log "Backend API is UP and HEALTHY."
        BACKEND_UP=true
        break
    fi
    sleep $RETRY_DELAY
done

if [ "$BACKEND_UP" = false ]; then
    warn "Backend API failed health check after $(($MAX_RETRIES * $RETRY_DELAY))s. Inspecting logs..."
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
step "10/12" "Configuring Nginx..."
# Robustly get domain from .env (handles "DOMAIN = value", "DOMAIN=value", quotes, etc)
DOMAIN=$(grep -i "^DOMAIN" "$APP_DIR/backend/.env" | head -n 1 | sed -E 's/^DOMAIN[[:space:]]*=[[:space:]]*["'\'']?([^"'\'']+)["'\'']?.*$/\1/I' | xargs 2>/dev/null || echo "tulz.tools")
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
CERTBOT_EMAIL=$(grep -i "^CERTBOT_EMAIL" "$APP_DIR/backend/.env" | head -n 1 | sed -E 's/^CERTBOT_EMAIL[[:space:]]*=[[:space:]]*["'\'']?([^"'\'']+)["'\'']?.*$/\1/I' | xargs 2>/dev/null || echo "")

log "Detecting SSL requirements: Domain=$DOMAIN, Email=${CERTBOT_EMAIL:-NOT_SET}"

if [ -n "$CERTBOT_EMAIL" ] && [ "$DOMAIN" != "localhost" ] && [ "$DOMAIN" != "_" ]; then
    step "11/12" "Ensuring SSL/HTTPS..."
    
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

# 12. Setup Periodic Cleanup
step "12/12" "Scheduling periodic health maintenance..."
CLEANUP_SCRIPT="$APP_DIR/deploy/cleanup_zombies.sh"

# Robust copy with fallback to ensure deployment doesn't fail here
if [ -f "$STAGING_DIR/deploy/cleanup_zombies.sh" ]; then
    cp "$STAGING_DIR/deploy/cleanup_zombies.sh" "$CLEANUP_SCRIPT"
elif [ -f "$APP_DIR/deploy/cleanup_zombies.sh" ]; then
    log "cleanup_zombies.sh missing in staging, preserving existing production version."
elif [ -f "$(dirname "$0")/cleanup_zombies.sh" ]; then
    cp "$(dirname "$0")/cleanup_zombies.sh" "$CLEANUP_SCRIPT"
    log "cleanup_zombies.sh restored from deployment source directory."
else
    warn "cleanup_zombies.sh not found in staging or prod. Creating minimal script..."
    cat > "$CLEANUP_SCRIPT" <<EOF
#!/bin/bash
# Minimal fallback zombie reaper
pkill -9 -o chrome 2>/dev/null || true
pkill -9 -o chromium 2>/dev/null || true
EOF
fi
chmod +x "$CLEANUP_SCRIPT"
chown $APP_USER:$APP_USER "$CLEANUP_SCRIPT"

# Add to crontab if not already there (runs every 10 minutes)
if ! crontab -u "$APP_USER" -l 2>/dev/null | grep -q "cleanup_zombies.sh"; then
    (crontab -u "$APP_USER" -l 2>/dev/null; echo "*/10 * * * * $CLEANUP_SCRIPT >> $APP_DIR/logs/cleanup.log 2>&1") | crontab -u "$APP_USER" -
    log "Zombie cleanup cron job scheduled."
fi

block_smtp_outbound

log "Deployment Complete!"
echo -e "${YELLOW}IMPORTANT:${NC} To create your first admin account, run:"
echo "sudo -u $APP_USER $APP_DIR/backend/venv/bin/python $APP_DIR/backend/create_admin.py your@email.com your_password"
echo ""
echo "Check your site at https://$DOMAIN (or http://$PUBLIC_IP)"
