/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_RAILWAY_API_URL?: string;
  readonly VITE_DEV_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Electron window extensions for hybrid setup
declare global {
  interface Window {
    electron?: {
      railwayUrl?: string;
      localUrl?: string;
      openExternal?: (url: string) => Promise<void>;
      openCheckout?: (checkoutUrl: string, successUrl: string, cancelUrl: string) => Promise<any>;
      openPortal?: (portalUrl: string, returnUrl: string) => Promise<{ success: boolean; completed?: boolean; closed?: boolean; url?: string }>;
    };
  }
}

// Export empty object to make this a module (required for declare global to work)
export {};
