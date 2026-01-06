import { toaster } from '@gravity-ui/uikit/toaster-singleton';
import { logger } from './logger';

/**
 * Show success notification
 */
export function showSuccess(message: string): void {
  toaster.add({
    name: 'success-toast',
    title: message,
    theme: 'success',
    isClosable: true,
    autoHiding: 4000,
  });
}

/**
 * Show error notification
 */
export function showError(message: string): void {
  toaster.add({
    name: 'error-toast',
    title: message,
    theme: 'danger',
    isClosable: true,
    autoHiding: 5000,
  });
}

/**
 * Show info notification
 */
export function showInfo(message: string): void {
  toaster.add({
    name: 'info-toast',
    title: message,
    theme: 'info',
    isClosable: true,
    autoHiding: 4000,
  });
}

/**
 * Show warning notification
 */
export function showWarning(message: string): void {
  toaster.add({
    name: 'warning-toast',
    title: message,
    theme: 'warning',
    isClosable: true,
    autoHiding: 4000,
  });
}

/**
 * Handle async operation with toast notifications
 */
export async function withToast<T>(
  operation: () => Promise<T>,
  options: {
    loading?: string;
    success?: string;
    error?: string | ((err: Error) => string);
  }
): Promise<T | null> {
  const { loading, success, error } = options;

  let loadingToastName: string | undefined;

  try {
    if (loading) {
      loadingToastName = 'loading-toast-' + Date.now();
      toaster.add({
        name: loadingToastName,
        title: loading,
        theme: 'info',
        isClosable: false,
        autoHiding: false,
      });
    }

    const result = await operation();

    if (loadingToastName) {
      toaster.remove(loadingToastName);
    }

    if (success) {
      showSuccess(success);
    }

    return result;
  } catch (err) {
    if (loadingToastName) {
      toaster.remove(loadingToastName);
    }

    const errorMessage = typeof error === 'function'
      ? error(err as Error)
      : error || 'An error occurred';

    showError(errorMessage);

    logger.error('Operation failed:', err);
    return null;
  }
}
