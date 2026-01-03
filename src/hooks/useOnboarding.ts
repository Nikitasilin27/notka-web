import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { showInfo } from '../utils/notifications';

const ONBOARDING_KEY = 'notka_onboarding_completed';

/**
 * Show onboarding messages for new users
 */
export function useOnboarding() {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Check if onboarding was already shown
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (completed) return;

    // Show welcome message after a short delay
    const timeout = setTimeout(() => {
      showInfo(`Welcome to Notka, ${user.name}! 🎵 Play music on Spotify to start scrobbling.`);

      // Mark onboarding as completed
      localStorage.setItem(ONBOARDING_KEY, 'true');
    }, 1500);

    return () => clearTimeout(timeout);
  }, [isAuthenticated, user]);
}
