import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry error tracking
 * Only active in production builds
 *
 * Setup instructions:
 * 1. Create a free Sentry account at https://sentry.io/signup/
 * 2. Create a new project for React
 * 3. Copy your DSN from project settings
 * 4. Add VITE_SENTRY_DSN to your .env file
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  // Only initialize in production with a valid DSN
  if (!import.meta.env.PROD || !dsn) {
    console.log('Sentry: Disabled (development mode or missing DSN)');
    return;
  }

  Sentry.init({
    dsn,

    // Set environment
    environment: import.meta.env.MODE,

    // Performance monitoring (optional)
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Session replay for debugging (optional)
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance Monitoring sample rate
    // 0.1 = 10% of transactions (adjust based on traffic)
    tracesSampleRate: 0.1,

    // Session Replay sample rate
    // 0.1 = 10% of sessions will be recorded
    replaysSessionSampleRate: 0.1,

    // Error Replay sample rate
    // 1.0 = 100% of sessions with errors will be recorded
    replaysOnErrorSampleRate: 1.0,

    // Filter out sensitive data
    beforeSend(event) {
      // Don't send events from localhost
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return null;
      }

      // Remove sensitive data from request bodies
      if (event.request && event.request.data && typeof event.request.data === 'object') {
        const data = event.request.data as Record<string, any>;
        delete data.password;
        delete data.token;
      }

      return event;
    },

    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',

      // Network errors that are expected
      'NetworkError',
      'Network request failed',

      // Spotify API rate limiting (expected behavior)
      'RATE_LIMITED',
    ],
  });

  console.log('Sentry: Initialized');
}

/**
 * Manually capture an error to Sentry
 */
export function captureError(error: Error, context?: Record<string, any>) {
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.error('Captured error:', error, context);
  }
}

/**
 * Set user context for Sentry
 */
export function setUserContext(userId: string, email?: string) {
  if (import.meta.env.PROD) {
    Sentry.setUser({
      id: userId,
      email,
    });
  }
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  if (import.meta.env.PROD) {
    Sentry.setUser(null);
  }
}
