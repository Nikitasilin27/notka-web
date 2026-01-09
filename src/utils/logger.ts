import { captureError } from './sentry';

/**
 * Development-only logger utility
 * In production, logs are suppressed to prevent data leaks and reduce bundle size
 * Errors are always logged and sent to Sentry in production
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  error: (...args: any[]) => {
    // Always log errors to console
    console.error(...args);

    // Send to Sentry in production if first arg is an Error object
    if (import.meta.env.PROD && args[0] instanceof Error) {
      captureError(args[0], {
        context: args.slice(1),
      });
    }
  },

  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};
