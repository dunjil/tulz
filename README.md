# ToolHub - All-in-One Productivity Suite

A full-stack web application providing essential productivity tools: QR Code Generator, Advanced Calculator, Image Editor, PDF Toolkit, and Excel to CSV converter.

## Features

- **QR Code Generator**: Create customizable QR codes for URLs, WiFi, contacts, and more
- **Advanced Calculator**: Scientific calculations, loan/EMI calculator, unit converter
- **Image Editor**: AI-powered background removal, crop, resize, format conversion
- **PDF Toolkit**: Merge, split, compress PDFs, convert to Word
- **Excel to CSV**: Multi-sheet conversion with data cleaning

## Tech Stack

### Backend
- FastAPI 0.115+
- SQLModel (SQLAlchemy + Pydantic)
- PostgreSQL 15
- JWT Authentication
- Google OAuth
- ZeptoMail for emails
- Polar.sh payments

### Frontend
- Next.js 15+ (App Router)
- TypeScript
- TailwindCSS
- shadcn/ui components
- TanStack Query
- react-dropzone

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 22+
- PostgreSQL 15+

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Create database
createdb toolhub

# Run migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

### Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Project Structure

```
ToolHub/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # API endpoints
│   │   ├── core/            # Security, exceptions
│   │   ├── db/              # Database session
│   │   ├── models/          # SQLModel models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   └── workers/         # Background tasks
│   ├── migrations/          # Alembic migrations
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js pages
│   │   ├── components/     # React components
│   │   ├── lib/            # Utilities
│   │   ├── providers/      # Context providers
│   │   └── types/          # TypeScript types
│   └── public/
└── deploy/
    └── setup.sh            # VPS deployment script
```

## Deployment

### VPS Deployment (Ubuntu 22.04)

```bash
# Download and run setup script
curl -O https://raw.githubusercontent.com/your-repo/toolhub/main/deploy/setup.sh
chmod +x setup.sh
sudo DOMAIN=yourdomain.com ./setup.sh
```

The script installs:
- Python 3.12
- Node.js 22
- PostgreSQL 15
- Nginx with SSL
- UFW firewall
- Fail2Ban

### Manual Steps After Setup

1. Clone repository to `/home/toolhub/app`
2. Configure `.env` files
3. Run database migrations
4. Build frontend
5. Start services
6. Configure SSL with Certbot

## API Documentation

After starting the backend, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Pricing

| Plan | Price | Features |
|------|-------|----------|
| Free | $0 | 3 uses/day on premium tools, watermarked output, unlimited free tools (Calculator, Excel to CSV, Favicon, JSON Formatter, Markdown to PDF, Text Diff) |
| Pro | $10/month ($8/month annual) | Unlimited uses, no watermarks, highest quality output, batch processing, all paper sizes & formats, priority support |

## Environment Variables

See `.env.example` files in `backend/` and `frontend/` directories.

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT signing key
- `GOOGLE_CLIENT_ID/SECRET`: Google OAuth
- `POLAR_ACCESS_TOKEN`: Polar.sh payments
- `ZEPTOMAIL_API_KEY`: Email service

## License

MIT License
