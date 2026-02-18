# Celery Setup Guide

This document explains how to set up Celery for background job processing in Tulz.

## What is Celery?

Celery is a distributed task queue that allows you to run tasks asynchronously in the background. This is useful for:
- Heavy PDF processing (merge, split, compress)
- Image background removal (AI-powered)
- Email sending
- Any operation that might timeout or slow down the API

## Prerequisites

**You don't need to sign up for anything!** Celery uses Redis as a message broker, and Redis runs locally on your machine.

## Quick Start

### 1. Install Redis

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**macOS (with Homebrew):**
```bash
brew install redis
brew services start redis
```

**Windows (with WSL) or Docker:**
```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

### 2. Verify Redis is Running
```bash
redis-cli ping
# Should return: PONG
```

### 3. Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 4. Start the Celery Worker
```bash
cd backend
celery -A app.workers.celery_app worker --loglevel=info
```

For multiple queues (recommended for production):
```bash
celery -A app.workers.celery_app worker --loglevel=info -Q default,pdf,image,email
```

### 5. (Optional) Start Flower for Monitoring
Flower provides a web UI to monitor Celery tasks.
```bash
celery -A app.workers.celery_app flower --port=5555
```
Then open http://localhost:5555 in your browser.

## Configuration

All Celery settings are in `app/workers/celery_app.py`.

### Environment Variables

Add these to your `.env` file (optional - defaults work for local development):

```env
# Redis connection (default: localhost)
REDIS_URL=redis://localhost:6379/0

# Optional: Use different Redis DBs for broker and results
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
```

## Using Celery Tasks

### In Your Code

```python
from app.workers.tasks.pdf_tasks import process_pdf_split

# Synchronous call (waits for result)
result = process_pdf_split.delay(file_path, page_ranges, output_dir)
output = result.get(timeout=60)  # Wait up to 60 seconds

# Asynchronous call (fire and forget)
task = process_pdf_split.apply_async(
    args=[file_path, page_ranges, output_dir],
    queue='pdf',
)
task_id = task.id  # Store this to check status later

# Check task status later
from celery.result import AsyncResult
result = AsyncResult(task_id)
if result.ready():
    output = result.get()
```

### Available Tasks

| Task | Queue | Description |
|------|-------|-------------|
| `process_pdf_split` | pdf | Split PDF into multiple files |
| `process_pdf_merge` | pdf | Merge multiple PDFs |
| `process_pdf_compress` | pdf | Compress PDF file |
| `process_pdf_to_word` | pdf | Convert PDF to Word |
| `remove_background` | image | AI background removal |
| `resize_image` | image | Resize image |
| `convert_image_format` | image | Convert image format |
| `crop_image` | image | Crop image |
| `send_verification_email` | email | Send verification email |
| `send_password_reset_email` | email | Send password reset |
| `send_welcome_email` | email | Send welcome email |

## Production Deployment

### Systemd Service (Linux)

Create `/etc/systemd/system/celery-worker.service`:

```ini
[Unit]
Description=Tulz Celery Worker
After=network.target redis.service

[Service]
Type=forking
User=www-data
Group=www-data
WorkingDirectory=/var/www/toolhub/backend
ExecStart=/var/www/toolhub/venv/bin/celery -A app.workers.celery_app worker --loglevel=info -Q default,pdf,image,email --detach
ExecStop=/bin/kill -TERM $MAINPID
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable celery-worker
sudo systemctl start celery-worker
```

### Docker Compose

```yaml
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  celery-worker:
    build: ./backend
    command: celery -A app.workers.celery_app worker --loglevel=info
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379/0
    volumes:
      - ./backend:/app
      - /tmp/toolhub:/tmp/toolhub

  flower:
    build: ./backend
    command: celery -A app.workers.celery_app flower --port=5555
    depends_on:
      - redis
      - celery-worker
    ports:
      - "5555:5555"
    environment:
      - REDIS_URL=redis://redis:6379/0

volumes:
  redis_data:
```

## Troubleshooting

### "Connection refused" error
Make sure Redis is running:
```bash
redis-cli ping
```

### Tasks not executing
1. Check that the Celery worker is running
2. Check the worker logs for errors
3. Verify Redis connection in worker output

### Tasks stuck in "PENDING"
The task might be in a different queue. Make sure your worker is listening to the correct queues:
```bash
celery -A app.workers.celery_app worker -Q default,pdf,image,email
```

### Memory issues
If workers consume too much memory, reduce the number of tasks per child:
```python
# In celery_app.py
celery_app.conf.worker_max_tasks_per_child = 50
```

## Cost

**$0** - Celery and Redis are open source and run locally. No external services required for development or production.

For production, you may want to use a managed Redis service:
- **Redis Cloud**: Free tier available (30MB)
- **AWS ElastiCache**: Pay per hour
- **DigitalOcean Managed Redis**: $15/month

Or just run Redis on your own server for free.
