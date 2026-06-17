import { httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { auth, functions } from '../firebase';

/**
 * Фаза 0: мост Spotify-авторизации → Firebase Auth.
 *
 * Минтит Firebase custom token (uid == Spotify id) через Cloud Function
 * `exchangeSpotifyToken`, затем логинит в Firebase Auth. После этого
 * Firestore Rules могут проверять request.auth.uid.
 *
 * GRACEFUL на переходный период: если функция ещё не задеплоена или вход
 * не удался — логируем предупреждение и НЕ роняем приложение (оно продолжит
 * работать против текущих правил, пока не задеплоены защищённые правила).
 * После деплоя функции + правил вход в Firebase станет обязательным.
 *
 * @returns true, если Firebase-сессия установлена; иначе false.
 */
export async function signInToFirebaseWithSpotify(accessToken: string): Promise<boolean> {
  // Уже залогинены в Firebase — повторно не дёргаем функцию
  if (auth.currentUser) return true;

  try {
    const exchange = httpsCallable<
      { accessToken: string },
      { token: string; spotifyId: string }
    >(functions, 'exchangeSpotifyToken');

    const { data } = await exchange({ accessToken });
    await signInWithCustomToken(auth, data.token);
    return true;
  } catch (e) {
    console.warn(
      '[auth-bridge] Firebase sign-in пропущен (функция не задеплоена?):',
      e
    );
    return false;
  }
}
