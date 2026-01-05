import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useI18n } from './useI18n';
import { showInfo } from '../utils/notifications';

const ONBOARDING_KEY = 'notka_onboarding_completed';

/**
 * Show onboarding messages for new users
 */
export function useOnboarding() {
  const { isAuthenticated, user } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Check if onboarding was already shown
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (completed) return;

    // Show welcome message after a short delay
    const timeout = setTimeout(() => {
      showInfo(t.welcomeToNotka.replace('Notka', `Notka, ${user.name}`));

      // Mark onboarding as completed
      localStorage.setItem(ONBOARDING_KEY, 'true');
    }, 1500);

    return () => clearTimeout(timeout);
  }, [isAuthenticated, user]);
}
