"""Celery application configuration for background job processing.

SETUP INSTRUCTIONS:
==================
1. Install Redis (message broker):
   - Ubuntu/Debian: sudo apt-get install redis-server
   - macOS: brew install redis
   - Docker: docker run -d -p 6379:6379 redis:alpine

2. Start the Celery worker:
   cd backend
   celery -A app.workers.celery_app worker --loglevel=info

3. (Optional) Start Flower for monitoring:
   celery -A app.workers.celery_app flower --port=5555

No external signups required! Redis runs locally on your machine.
"""

from celery import Celery

from app.config import settings

# Create Celery app
celery_app = Celery(
    "toolhub",
    broker=settings.celery_broker,
    backend=settings.celery_backend,
    include=[
        "app.workers.tasks.pdf_tasks",
        "app.workers.tasks.image_tasks",
        "app.workers.tasks.email_tasks",
        "app.workers.tasks.ocr_tasks",
    ],
)

# Celery configuration
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # Task execution settings
    task_acks_late=True,  # Acknowledge after task completion
    task_reject_on_worker_lost=True,  # Requeue if worker dies
    worker_prefetch_multiplier=1,  # One task at a time per worker

    # Result settings
    result_expires=3600,  # Results expire after 1 hour

    # Task routing (optional - for scaling specific tasks)
    task_routes={
        "app.workers.tasks.pdf_tasks.*": {"queue": "pdf"},
        "app.workers.tasks.image_tasks.*": {"queue": "image"},
        "app.workers.tasks.email_tasks.*": {"queue": "email"},
        "app.workers.tasks.ocr_tasks.*": {"queue": "ocr"},
    },

    # Default queue
    task_default_queue="default",

    # Rate limits for specific tasks (prevents overload)
    task_annotations={
        "app.workers.tasks.pdf_tasks.process_pdf": {
            "rate_limit": "10/m",  # 10 per minute
        },
        "app.workers.tasks.image_tasks.remove_background": {
            "rate_limit": "5/m",  # 5 per minute (heavy task)
        },
        "app.workers.tasks.ocr_tasks.create_searchable_pdf_task": {
            "rate_limit": "5/m",  # 5 per minute (CPU intensive)
        },
        "app.workers.tasks.ocr_tasks.extract_text_from_pdf_task": {
            "rate_limit": "5/m",  # 5 per minute (CPU intensive)
        },
    },

    # Retry settings
    task_default_retry_delay=30,  # 30 seconds between retries
    task_max_retries=3,

    # Worker settings
    worker_max_tasks_per_child=100,  # Restart worker after 100 tasks (memory cleanup)
)


# Optional: Celery beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    "cleanup-temp-files": {
        "task": "app.workers.tasks.cleanup_tasks.cleanup_temp_files",
        "schedule": 900.0,  # Every 15 minutes
    },
    "reset-daily-usage": {
        "task": "app.workers.tasks.usage_tasks.reset_daily_usage",
        "schedule": 86400.0,  # Every 24 hours
        "options": {"expires": 3600},
    },
}
