import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@gravity-ui/uikit';
import { toaster } from '@gravity-ui/uikit/toaster-singleton';
import { useI18n } from '../hooks/useI18n';
import '../styles/pwa.css';

/** Chrome/Android install event — not in the standard DOM lib types. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'notka-pwa-install-dismissed';

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
    !/crios|fxios/i.test(window.navigator.userAgent) // only real Safari can install
  );
}

/**
 * Phase 1 PWA glue:
 *  - registers the service worker and surfaces a "new version" toast on update;
 *  - shows a dismissible install banner (Android beforeinstallprompt, iOS hint).
 * Rendered once, near the app root. Renders nothing when there's nothing to show.
 */
export function PwaManager() {
  const { t } = useI18n();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  // --- Service worker update toast --------------------------------------
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!needRefresh) return;
    toaster.add({
      name: 'pwa-update',
      title: t.updateAvailable,
      theme: 'info',
      isClosable: true,
      autoHiding: false,
      actions: [{ label: t.updateAction, onClick: () => updateServiceWorker(true) }],
    });
  }, [needRefresh, t.updateAvailable, t.updateAction, updateServiceWorker]);

  // --- Install banner ----------------------------------------------------
  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return;

    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep our own banner instead of the mini-infobar
      setDeferred(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    // iOS never fires beforeinstallprompt — show the manual hint instead.
    if (isIos()) setShowBanner(true);

    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const dismiss = () => {
    setShowBanner(false);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  };

  if (!showBanner) return null;

  const iosMode = !deferred && isIos();

  return (
    <div className="pwa-install" role="dialog" aria-label={t.installTitle}>
      <div className="pwa-install__icon" aria-hidden="true">
        <img src="/pwa-192x192.png" alt="" width={48} height={48} />
      </div>
      <div className="pwa-install__text">
        <strong>{t.installTitle}</strong>
        <span>{iosMode ? t.installIosHint : t.installBody}</span>
      </div>
      <div className="pwa-install__actions">
        {!iosMode && (
          <Button view="action" size="m" onClick={install}>
            {t.installButton}
          </Button>
        )}
        <Button view="flat" size="m" onClick={dismiss}>
          {t.later}
        </Button>
      </div>
    </div>
  );
}
