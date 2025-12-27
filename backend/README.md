# AutoIQ Backend

FastAPI backend for AutoIQ diagnostics application.

## Deployment

This backend is deployed to Railway. See main README.md for deployment instructions.

## Environment Variables

All environment variables are set in Railway dashboard. See main README.md for required variables.

## Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create `.env` file with required variables (see main README.md)

3. Run locally:
```bash
uvicorn main:app --reload --port 8001
```

