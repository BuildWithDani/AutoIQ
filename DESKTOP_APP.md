# AutoIQ Desktop Application

AutoIQ is built as a **standalone desktop application**, not a website. Here's how it works:

## Architecture

1. **Electron Shell**: Provides the desktop window and native OS integration
2. **React Frontend**: Built and bundled into static files, loaded directly by Electron
3. **Python Backend**: Automatically started as a child process when the app launches
4. **No External Servers**: Everything runs locally on your machine

## How It Works

### Development Mode

When you run `npm run dev`:
1. Frontend is built once (if needed)
2. Electron window opens
3. Backend automatically starts in the background
4. UI loads from built files (not a dev server)

### Production Build

When you build with `npm run build`:
1. Frontend is built and optimized
2. Everything is packaged into a single installer
3. Users install it like any other desktop app
4. No Node.js or Python installation required for end users

## Key Differences from Web App

✅ **Desktop App Approach:**
- Backend starts automatically
- Frontend loaded from file:// protocol
- Single executable/installer
- Works offline (once installed)
- Native OS integration

❌ **Not a Web App:**
- No separate dev servers needed
- No browser required
- No localhost URLs in production
- Everything bundled together

## Running the App

Simply run:
```bash
npm run dev
```

The app will:
- Build the frontend (first time only)
- Launch the Electron window
- Start the Python backend automatically
- Load the UI from built files

That's it! It's a desktop app, not a website.

