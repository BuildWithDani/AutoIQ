const { app, BrowserWindow, shell, ipcMain } = require('electron');
const { spawn, execSync } = require('child_process');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

let mainWindow = null;
let backendProcess = null;
const BACKEND_PORT = process.env.BACKEND_PORT || 8001;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;
// In development mode if not packaged, or if NODE_ENV is explicitly set
const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

function startBackend() {
  // Always start backend automatically for desktop app
  const backendPath = path.join(__dirname, '..', 'backend');
  const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
  
  console.log('Starting Python backend...');
  
  backendProcess = spawn(pythonPath, ['-m', 'uvicorn', 'main:app', '--port', BACKEND_PORT.toString(), '--host', '127.0.0.1'], {
    cwd: backendPath,
    stdio: isDev ? 'inherit' : 'pipe',
    shell: false,
  });

  backendProcess.on('error', (error) => {
    console.error('Failed to start backend:', error);
    if (mainWindow) {
      mainWindow.webContents.send('backend-error', error.message);
    }
  });

  backendProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Backend process exited with code ${code}`);
    }
  });

  // Wait for backend to be ready
  return waitForBackend();
}

function waitForBackend(maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const checkBackend = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/status`, { timeout: 2000 });
        console.log('Backend is ready');
        resolve();
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          reject(new Error('Backend failed to start'));
        } else {
          setTimeout(checkBackend, 1000);
        }
      }
    };
    checkBackend();
  });
}

function ensureFrontendBuilt() {
  // In dev mode, build frontend if dist doesn't exist
  if (isDev) {
    const distPath = path.join(__dirname, '..', 'frontend', 'dist');
    if (!fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, 'index.html'))) {
      console.log('Building frontend for first time...');
      try {
        execSync('npm run build:frontend', { 
          cwd: path.join(__dirname, '..'),
          stdio: 'inherit' 
        });
      } catch (error) {
        console.error('Failed to build frontend:', error);
      }
    }
  }
}

function createWindow() {
  ensureFrontendBuilt();
  
  // Try to load icon if it exists
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
  const icon = fs.existsSync(iconPath) ? iconPath : undefined;

  // Preload script path
  const preloadPath = path.join(__dirname, 'preload.js');
  
  // Verify preload script exists
  if (!fs.existsSync(preloadPath)) {
    console.error('Preload script not found at:', preloadPath);
  } else {
    console.log('Preload script found at:', preloadPath);
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'AutoIQ - Smart Vehicle Diagnostics & Performance',
    icon: icon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow loading local files
      allowRunningInsecureContent: true,
      preload: preloadPath,
    },
    show: false, // Don't show until ready
  });

  // Load from built files (desktop app approach)
  const indexPath = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
  
  // Enable console logging for debugging
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log(`[Renderer ${level}]:`, message);
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      // Only allow file:// and localhost backend URLs
      if (parsedUrl.protocol !== 'file:' && parsedUrl.hostname !== '127.0.0.1' && parsedUrl.hostname !== 'localhost') {
        event.preventDefault();
        shell.openExternal(navigationUrl);
      }
    } catch (e) {
      // Invalid URL, allow navigation
    }
  });

  mainWindow.loadFile(indexPath).then(() => {
    console.log('Frontend loaded successfully');
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  }).catch((error) => {
    console.error('Failed to load frontend:', error);
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AutoIQ - Error</title>
          <style>
            body { font-family: system-ui; padding: 40px; text-align: center; }
            h1 { color: #dc2626; }
            pre { background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Failed to load application</h1>
          <p>Error loading frontend files. Please check the console for details.</p>
          <pre>${error.toString()}</pre>
          <p>Path attempted: ${indexPath}</p>
        </body>
      </html>
    `;
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle IPC for opening external links
ipcMain.handle('open-external', async (event, url) => {
  try {
    console.log('Opening external URL:', url);
    await shell.openExternal(url);
    console.log('Successfully opened external URL');
  } catch (error) {
    console.error('Error opening external URL:', error);
  }
});

// Handle IPC for opening checkout in app window
ipcMain.handle('open-checkout', async (event, { checkoutUrl, successUrl, cancelUrl }) => {
  return new Promise((resolve) => {
    let resolved = false; // Prevent multiple resolutions
    
    const checkoutWindow = new BrowserWindow({
      width: 900,
      height: 700,
      parent: mainWindow || undefined, // Only set parent if mainWindow exists
      modal: true, // Make it modal so it feels integrated
      resizable: true,
      minimizable: false,
      maximizable: true,
      frame: true, // Keep frame for security (Stripe requires it)
      autoHideMenuBar: true, // Hide menu bar for cleaner look
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true, // Enable web security for Stripe
      },
      title: 'Complete Your Payment - AutoIQ',
      show: false, // Don't show until ready
    });

    // Center the window on the parent
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      const x = bounds.x + (bounds.width / 2) - (900 / 2);
      const y = bounds.y + (bounds.height / 2) - (700 / 2);
      checkoutWindow.setPosition(Math.round(x), Math.round(y));
    }

    // Helper function to safely resolve promise only once
    const safeResolve = (result) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
    };

    // Helper function to check if URL matches success/cancel
    const urlMatches = (url, targetUrl) => {
      if (!targetUrl) return false;
      try {
        const urlObj = new URL(url);
        const targetObj = new URL(targetUrl);
        // Match hostname and pathname (ignore query params and hash)
        return urlObj.hostname === targetObj.hostname && 
               urlObj.pathname === targetObj.pathname;
      } catch (e) {
        // Fallback to string matching
        const cleanTarget = targetUrl.replace(/^https?:\/\//, '').split('?')[0].split('#')[0];
        const cleanUrl = url.replace(/^https?:\/\//, '').split('?')[0].split('#')[0];
        return cleanUrl.includes(cleanTarget) || cleanTarget.includes(cleanUrl);
      }
    };

    // Monitor navigation for success/cancel URLs
    checkoutWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      console.log('Checkout window navigating to:', navigationUrl);
      
      // Check if navigation is to success or cancel URL
      if (successUrl && urlMatches(navigationUrl, successUrl)) {
        event.preventDefault();
        checkoutWindow.close();
        safeResolve({ success: true, url: navigationUrl });
      } else if (cancelUrl && urlMatches(navigationUrl, cancelUrl)) {
        event.preventDefault();
        checkoutWindow.close();
        safeResolve({ success: false, cancelled: true, url: navigationUrl });
      }
    });

    // Also listen for did-navigate (after navigation completes)
    checkoutWindow.webContents.on('did-navigate', (event, url) => {
      console.log('Checkout window navigated to:', url);
      
      if (successUrl && urlMatches(url, successUrl)) {
        setTimeout(() => {
          checkoutWindow.close();
          safeResolve({ success: true, url });
        }, 1000);
      } else if (cancelUrl && urlMatches(url, cancelUrl)) {
        setTimeout(() => {
          checkoutWindow.close();
          safeResolve({ success: false, cancelled: true, url });
        }, 1000);
      }
    });

    // Handle window closed
    checkoutWindow.on('closed', () => {
      safeResolve({ success: false, closed: true });
    });

    // Show window when ready
    checkoutWindow.once('ready-to-show', () => {
      checkoutWindow.show();
    });

    // Load checkout URL
    checkoutWindow.loadURL(checkoutUrl);
  });
});

// Handle IPC for opening Stripe Customer Portal in app window
ipcMain.handle('open-portal', async (event, { portalUrl, returnUrl }) => {
  return new Promise((resolve) => {
    let resolved = false; // Prevent multiple resolutions
    
    const portalWindow = new BrowserWindow({
      width: 1000,
      height: 750,
      parent: mainWindow || undefined, // Only set parent if mainWindow exists
      modal: true, // Make it modal so it feels integrated
      resizable: true,
      minimizable: false,
      maximizable: true,
      frame: true, // Keep frame for security (Stripe requires it)
      autoHideMenuBar: true, // Hide menu bar for cleaner look
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true, // Enable web security for Stripe
      },
      title: 'Manage Subscription - AutoIQ',
      show: false, // Don't show until ready
    });

    // Center the window on the parent
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      const x = bounds.x + (bounds.width / 2) - (1000 / 2);
      const y = bounds.y + (bounds.height / 2) - (750 / 2);
      portalWindow.setPosition(Math.round(x), Math.round(y));
    }

    // Helper function to safely resolve promise only once
    const safeResolve = (result) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
    };

    // Helper function to check if URL matches return URL
    const urlMatches = (url, targetUrl) => {
      if (!targetUrl) return false;
      try {
        const urlObj = new URL(url);
        const targetObj = new URL(targetUrl);
        // Match hostname and pathname (ignore query params and hash)
        return urlObj.hostname === targetObj.hostname && 
               urlObj.pathname === targetObj.pathname;
      } catch (e) {
        // Fallback to string matching
        const cleanTarget = targetUrl.replace(/^https?:\/\//, '').split('?')[0].split('#')[0];
        const cleanUrl = url.replace(/^https?:\/\//, '').split('?')[0].split('#')[0];
        return cleanUrl.includes(cleanTarget) || cleanTarget.includes(cleanUrl);
      }
    };

    // Monitor navigation for return URL (when user finishes managing subscription)
    portalWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      console.log('Portal window navigating to:', navigationUrl);
      
      // Check if navigation is to return URL (user finished managing subscription)
      if (returnUrl && urlMatches(navigationUrl, returnUrl)) {
        event.preventDefault();
        portalWindow.close();
        safeResolve({ success: true, url: navigationUrl, completed: true });
      }
    });

    // Also listen for did-navigate (after navigation completes)
    portalWindow.webContents.on('did-navigate', (event, url) => {
      console.log('Portal window navigated to:', url);
      
      if (returnUrl && urlMatches(url, returnUrl)) {
        setTimeout(() => {
          portalWindow.close();
          safeResolve({ success: true, url, completed: true });
        }, 1000);
      }
    });

    // Handle window closed
    portalWindow.on('closed', () => {
      safeResolve({ success: false, closed: true });
    });

    // Show window when ready
    portalWindow.once('ready-to-show', () => {
      portalWindow.show();
    });

    // Load portal URL
    portalWindow.loadURL(portalUrl);
  });
});

app.whenReady().then(async () => {
  try {
    // Start backend (Appwrite is remote, no local server needed)
    await startBackend();
    createWindow();
  } catch (error) {
    console.error('Failed to start:', error);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (backendProcess) {
      backendProcess.kill();
    }
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

