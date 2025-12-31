import toast from 'react-hot-toast';

/**
 * Show success notification
 */
export function showSuccess(message: string): void {
  toast.success(message);
}

/**
 * Show error notification
 */
export function showError(message: string): void {
  toast.error(message);
}

/**
 * Show info notification
 */
export function showInfo(message: string): void {
  toast(message, {
    icon: 'ℹ️',
  });
}

/**
 * Show loading notification with promise
 */
export function showLoading<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
): Promise<T> {
  return toast.promise(promise, messages);
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

  let toastId: string | undefined;

  try {
    if (loading) {
      toastId = toast.loading(loading);
    }

    const result = await operation();

    if (toastId) {
      toast.dismiss(toastId);
    }

    if (success) {
      showSuccess(success);
    }

    return result;
  } catch (err) {
    if (toastId) {
      toast.dismiss(toastId);
    }

    const errorMessage = typeof error === 'function'
      ? error(err as Error)
      : error || 'An error occurred';

    showError(errorMessage);

    console.error('Operation failed:', err);
    return null;
  }
}
