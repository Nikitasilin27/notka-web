import { useEffect, useState } from 'react';
import { logger } from '../utils/logger';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader } from '@gravity-ui/uikit';
import { exchangeCodeForTokens } from '../services/spotify';

export function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('Авторизация отменена');
      setTimeout(() => navigate('/'), 2000);
      return;
    }

    if (!code) {
      setError('Код авторизации не получен');
      setTimeout(() => navigate('/'), 2000);
      return;
    }

    exchangeCodeForTokens(code)
      .then(() => {
        // Force page reload to re-initialize auth context
        window.location.href = '/';
      })
      .catch((err) => {
        logger.error('Token exchange error:', err);
        setError('Ошибка авторизации');
        setTimeout(() => navigate('/'), 2000);
      });
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="login-page">
        <div className="login-logo">😕</div>
        <h2>{error}</h2>
        <p>Перенаправляем...</p>
      </div>
    );
  }

  return (
    <div className="login-page">
      <Loader size="l" />
      <h2>Авторизация...</h2>
    </div>
  );
}
