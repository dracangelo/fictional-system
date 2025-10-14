/// <reference types="vite/client" />

interface ImportMetaEnv {
  // API Configuration
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_TIMEOUT: string;

  // Authentication
  readonly VITE_JWT_SECRET_KEY: string;
  readonly VITE_JWT_REFRESH_INTERVAL: string;

  // External Services
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_GOOGLE_ANALYTICS_ID: string;

  // WebSocket Configuration
  readonly VITE_WS_BASE_URL: string;

  // File Upload Configuration
  readonly VITE_MAX_FILE_SIZE: string;
  readonly VITE_ALLOWED_FILE_TYPES: string;

  // Feature Flags
  readonly VITE_ENABLE_ANALYTICS: string;
  readonly VITE_ENABLE_NOTIFICATIONS: string;
  readonly VITE_ENABLE_GEOLOCATION: string;
  readonly VITE_ENABLE_PWA: string;

  // Development Configuration
  readonly VITE_DEBUG_MODE: string;
  readonly VITE_MOCK_API: string;

  // Social Login
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_FACEBOOK_APP_ID: string;

  // Notification Services
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
