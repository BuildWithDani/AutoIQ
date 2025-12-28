const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the openExternal function and checkout window
contextBridge.exposeInMainWorld('electron', {
  // Hybrid setup: Expose backend URLs
  railwayUrl: 'https://autoiq-production.up.railway.app',
  localUrl: 'http://127.0.0.1:8001',
  
  openExternal: async (url) => {
    try {
      await ipcRenderer.invoke('open-external', url);
    } catch (error) {
      console.error('Error in preload openExternal:', error);
      // Fallback - this shouldn't happen but just in case
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  },
  openCheckout: async (checkoutUrl, successUrl, cancelUrl) => {
    try {
      return await ipcRenderer.invoke('open-checkout', {
        checkoutUrl,
        successUrl,
        cancelUrl
      });
    } catch (error) {
      console.error('Error in preload openCheckout:', error);
      throw error;
    }
  },
  openPortal: async (portalUrl, returnUrl) => {
    try {
      return await ipcRenderer.invoke('open-portal', {
        portalUrl,
        returnUrl
      });
    } catch (error) {
      console.error('Error in preload openPortal:', error);
      throw error;
    }
  }
});

