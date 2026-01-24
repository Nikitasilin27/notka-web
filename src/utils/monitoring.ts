/**
 * Performance Monitoring & Error Tracking
 *
 * This module provides:
 * - Sentry error tracking and performance monitoring
 * - Web Vitals metrics collection
 *
 * Configuration:
 * - Set VITE_SENTRY_DSN in your .env file to enable Sentry
 * - Metrics are logged to console in development
 */

import * as Sentry from '@sentry/react';
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

// Environment detection
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initSentry(): void {
  if (!sentryDsn) {
    if (isDevelopment) {
      console.info('[Monitoring] Sentry DSN not configured, skipping initialization');
    }
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: isProduction ? 'production' : 'development',

    // Performance Monitoring
    tracesSampleRate: isProduction ? 0.2 : 1.0, // 20% in prod, 100% in dev

    // Session Replay (optional, uncomment if needed)
    // replaysSessionSampleRate: 0.1,
    // replaysOnErrorSampleRate: 1.0,

    // Release tracking
    release: `notka-web@${import.meta.env.VITE_APP_VERSION ?? '0.2.0'}`,

    // Filter out common noise
    ignoreErrors: [
      // Browser extensions
      /extensions\//i,
      /^chrome-extension:\/\//i,
      // Network errors
      /Network request failed/i,
      /Failed to fetch/i,
      // ResizeObserver (common false positive)
      /ResizeObserver loop/i,
    ],

    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
  });

  console.info('[Monitoring] Sentry initialized');
}

/**
 * Report a Web Vital metric to analytics/monitoring
 */
function reportMetric(metric: Metric): void {
  const { name, value, rating, id } = metric;

  // Log to console in development
  if (isDevelopment) {
    const color = rating === 'good' ? '🟢' : rating === 'needs-improvement' ? '🟡' : '🔴';
    console.info(`[Web Vitals] ${color} ${name}: ${Math.round(value)}ms (${rating})`);
  }

  // Send to Sentry as custom measurement
  if (sentryDsn) {
    Sentry.setMeasurement(name, value, 'millisecond');
  }

  // Send to analytics (Google Analytics example)
  if (typeof window !== 'undefined' && 'gtag' in window) {
    const gtag = window.gtag as (
      command: string,
      eventName: string,
      params: Record<string, unknown>
    ) => void;

    gtag('event', name, {
      event_category: 'Web Vitals',
      event_label: id,
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      non_interaction: true,
    });
  }
}

/**
 * Initialize Web Vitals collection
 *
 * Collects:
 * - LCP (Largest Contentful Paint) - loading performance
 * - FCP (First Contentful Paint) - initial render
 * - CLS (Cumulative Layout Shift) - visual stability
 * - INP (Interaction to Next Paint) - interactivity
 * - TTFB (Time to First Byte) - server response
 */
export function initWebVitals(): void {
  onLCP(reportMetric);
  onFCP(reportMetric);
  onCLS(reportMetric);
  onINP(reportMetric);
  onTTFB(reportMetric);

  if (isDevelopment) {
    console.info('[Monitoring] Web Vitals collection initialized');
  }
}

/**
 * Capture a custom error with context
 */
export function captureError(error: Error, context?: Record<string, unknown>): void {
  if (sentryDsn) {
    Sentry.captureException(error, {
      extra: context,
    });
  }

  // Always log to console
  console.error('[Error]', error, context);
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; name?: string; email?: string } | null): void {
  if (sentryDsn) {
    Sentry.setUser(user);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string = 'action',
  data?: Record<string, unknown>
): void {
  if (sentryDsn) {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
    });
  }
}

/**
 * Initialize all monitoring
 */
export function initMonitoring(): void {
  initSentry();
  initWebVitals();
}

// Export Sentry for ErrorBoundary usage
export { Sentry };
