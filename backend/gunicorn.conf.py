"""Gunicorn configuration for production deployment."""

import multiprocessing
import os

# Server socket
bind = os.getenv("BIND", "0.0.0.0:8000")
backlog = 2048

# Worker processes
# Formula: (2 × CPU cores) + 1 for I/O bound apps
# For 8GB RAM with heavy ML/Chromium tools, a more conservative (CPU cores + 1) is safer
import multiprocessing
cpu_count = multiprocessing.cpu_count()
workers = int(os.getenv("WORKERS", min(cpu_count + 1, 4))) # Cap at 4 workers for 8GB RAM
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
max_requests = 1000  # Restart workers after this many requests (prevents memory leaks)
max_requests_jitter = 100  # Add randomness to prevent all workers restarting at once
timeout = 120  # Kill workers that don't respond within this time
keepalive = 5  # Seconds to wait for requests on a Keep-Alive connection
graceful_timeout = 30  # Timeout for graceful worker restart

# Process naming
proc_name = "tulz-backend"

# Logging
accesslog = "-"  # Log to stdout
errorlog = "-"  # Log to stderr
loglevel = os.getenv("LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Security
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# Preload app for faster worker spawning (shares memory between workers)
preload_app = True

# Hooks
def on_starting(server):
    """Called just before the master process is initialized."""
    pass

def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    pass

def worker_int(worker):
    """Called when a worker receives SIGINT or SIGQUIT."""
    pass

def worker_abort(worker):
    """Called when a worker receives SIGABRT (usually timeout)."""
    pass
