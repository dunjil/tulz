#!/bin/bash
# ToolHub - Automated Zombie Process Cleanup
# Kills hanging browser processes to free up system resources.

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 1. Kill Chromium instances older than 5 minutes
# -etime: elapsed time in seconds
# We use a 300 second (5 min) threshold
log "Starting zombie process cleanup..."

# Find pids for chromium and headless_shell
PIDS=$(pgrep -f "chromium|headless_shell")

if [ -z "$PIDS" ]; then
    log "No browser processes found."
    exit 0
fi

for pid in $PIDS; do
    # Get elapsed time in seconds
    ETIMES=$(ps -p "$pid" -o etimes= | tr -d ' ')
    
    if [ -n "$ETIMES" ] && [ "$ETIMES" -gt 300 ]; then
        CMD=$(ps -p "$pid" -o comm=)
        log "Killing zombie process $pid ($CMD) - Elapsed: ${ETIMES}s"
        kill -9 "$pid" 2>/dev/null || true
    fi
done

log "Cleanup complete."
