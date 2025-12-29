import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader } from '@gravity-ui/uikit';
import { exchangeCodeForTokens } from '../services/spotify';
import { useI18n } from '../hooks/useI18n';

export function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(t.authCancelled);
      setTimeout(() => navigate('/'), 2000);
      return;
    }

    if (!code) {
      setError(t.authCodeMissing);
      setTimeout(() => navigate('/'), 2000);
      return;
    }

    exchangeCodeForTokens(code)
      .then(() => {
        // Force page reload to re-initialize auth context
        window.location.href = '/';
      })
      .catch((err) => {
        console.error('Token exchange error:', err);
        setError(t.authError);
        setTimeout(() => navigate('/'), 2000);
      });
  }, [searchParams, navigate, t]);

  if (error) {
    return (
      <div className="login-page">
        <div className="login-logo">😕</div>
        <h2>{error}</h2>
        <p>{t.redirecting}</p>
      </div>
    );
  }

  return (
    <div className="login-page">
      <Loader size="l" />
      <h2>{t.authorizing}</h2>
    </div>
  );
}
