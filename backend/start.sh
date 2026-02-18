#!/bin/bash
# Production startup script for Tulz Backend

set -e

# Default values
HOST=${HOST:-0.0.0.0}
PORT=${PORT:-8000}
WORKERS=${WORKERS:-$(( $(nproc) * 2 + 1 ))}
LOG_LEVEL=${LOG_LEVEL:-info}

echo "Starting Tulz Backend..."
echo "  Host: $HOST"
echo "  Port: $PORT"
echo "  Workers: $WORKERS"
echo "  CPU Cores: $(nproc)"
echo "  Log Level: $LOG_LEVEL"

# Run with Gunicorn (production)
exec gunicorn app.main:app \
    --config gunicorn.conf.py \
    --bind "$HOST:$PORT" \
    --workers "$WORKERS" \
    --log-level "$LOG_LEVEL"
