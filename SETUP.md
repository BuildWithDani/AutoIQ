# AutoIQ Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
# Install root and frontend dependencies
npm run install:all

# Install backend dependencies
cd backend
pip install -r requirements.txt
cd ..
```

Or with a Python virtual environment (recommended):

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 2. Environment Setup

Create a `.env` file in the `backend/` directory:

```bash
cd backend
cp .env.example .env  # If .env.example exists
# Or create .env manually with:
# BACKEND_PORT=8001
cd ..
```

### 3. Run in Development

```bash
npm run dev
```

This will:
- Start the FastAPI backend on port 8001
- Start the Vite frontend dev server on port 5173
- Launch Electron pointing to the dev servers

### 4. Connect OBD Device

1. Connect your OBD2 device (OBDLink EX, ELM327, etc.) via USB
2. The app will automatically attempt to connect on startup
3. Check the Dashboard for connection status

## Troubleshooting

### Backend Port Already in Use

If port 8001 is already in use, either:
- Change `BACKEND_PORT` in `backend/.env`
- Or kill the process using port 8001

### OBD Device Not Detected

- Ensure device is connected via USB
- Check Device Manager (Windows) or System Information (macOS) for COM port
- Some devices require drivers - check manufacturer website
- Try manually specifying the port in `backend/obd_service.py` if needed

### Python Not Found

- Ensure Python 3.8+ is installed and in PATH
- On Windows, you may need to use `py` instead of `python`
- Update `electron/main.js` if your Python command differs

## Testing Plan Switching

1. Go to Settings
2. Click on `free`, `plus`, or `pro_plus` to switch plans
3. Navigate to different screens to see plan-based feature gating

