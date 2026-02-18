"""Temporary file cleanup worker using APScheduler."""

import os
import time
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings

scheduler = BackgroundScheduler()


def cleanup_temp_files():
    """Remove temporary files older than TTL."""
    temp_dir = settings.temp_file_dir
    ttl_seconds = settings.temp_file_ttl_hours * 3600
    now = time.time()
    deleted_count = 0

    if not os.path.exists(temp_dir):
        return

    for filename in os.listdir(temp_dir):
        filepath = os.path.join(temp_dir, filename)

        try:
            if os.path.isfile(filepath):
                file_age = now - os.path.getmtime(filepath)

                if file_age > ttl_seconds:
                    os.unlink(filepath)
                    deleted_count += 1
        except Exception as e:
            print(f"[CLEANUP] Error deleting {filepath}: {e}")

    if deleted_count > 0:
        print(f"[CLEANUP] Deleted {deleted_count} expired files at {datetime.now(timezone.utc).isoformat()}")


def start_cleanup_scheduler():
    """Start the cleanup scheduler."""
    # Run cleanup every 15 minutes
    scheduler.add_job(
        cleanup_temp_files,
        "interval",
        minutes=15,
        id="cleanup_temp_files",
        replace_existing=True,
    )

    # Run immediately on startup
    scheduler.add_job(
        cleanup_temp_files,
        "date",
        run_date=datetime.now(timezone.utc),
        id="cleanup_startup",
    )

    scheduler.start()
    print("[CLEANUP] Scheduler started")


def stop_cleanup_scheduler():
    """Stop the cleanup scheduler."""
    scheduler.shutdown(wait=False)
    print("[CLEANUP] Scheduler stopped")
