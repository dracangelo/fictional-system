// Application configuration
export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000', 10),
  },
  auth: {
    jwtSecretKey: import.meta.env.VITE_JWT_SECRET_KEY || 'fallback-secret',
    refreshInterval: parseInt(
      import.meta.env.VITE_JWT_REFRESH_INTERVAL || '900000',
      10
    ),
  },
  external: {
    stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    googleAnalyticsId: import.meta.env.VITE_GOOGLE_ANALYTICS_ID || '',
  },
  websocket: {
    baseUrl: import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/ws',
  },
  upload: {
    maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '5242880', 10), // 5MB
    allowedFileTypes: (
      import.meta.env.VITE_ALLOWED_FILE_TYPES ||
      'image/jpeg,image/png,image/webp,video/mp4'
    ).split(','),
  },
  features: {
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    notifications: import.meta.env.VITE_ENABLE_NOTIFICATIONS === 'true',
    geolocation: import.meta.env.VITE_ENABLE_GEOLOCATION === 'true',
    pwa: import.meta.env.VITE_ENABLE_PWA === 'true',
  },
  development: {
    debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
    mockApi: import.meta.env.VITE_MOCK_API === 'true',
  },
  social: {
    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    facebookAppId: import.meta.env.VITE_FACEBOOK_APP_ID || '',
  },
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  },
} as const;
