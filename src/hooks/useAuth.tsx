import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { getTokens, clearTokens, getCurrentUser } from '../services/spotify';
import { getUser, createOrUpdateUser } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  spotifyId: string | null;
  avatarUrl: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [spotifyId, setSpotifyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = async () => {
    const tokens = getTokens();
    if (!tokens) {
      setIsLoading(false);
      return;
    }

    try {
      // Get Spotify profile
      const spotifyUser = await getCurrentUser();
      if (!spotifyUser) {
        clearTokens();
        setIsLoading(false);
        return;
      }

      setSpotifyId(spotifyUser.id);

      // Get or create user in Firebase
      let firebaseUser = await getUser(spotifyUser.id);
      
      if (!firebaseUser) {
        // Create new user
        const newUser: User = {
          odl: spotifyUser.id,
          name: spotifyUser.display_name || 'Unknown',
          avatarURL: spotifyUser.images?.[0]?.url,
        };
        await createOrUpdateUser(newUser);
        firebaseUser = newUser;
      } else {
        // Update name and avatar from Spotify if changed
        const updatedUser: User = {
          odl: spotifyUser.id,
          name: spotifyUser.display_name || firebaseUser.name,
          avatarURL: spotifyUser.images?.[0]?.url || firebaseUser.avatarURL,
        };
        await createOrUpdateUser(updatedUser);
        firebaseUser = updatedUser;
      }

      setUser(firebaseUser);
    } catch (error) {
      console.error('Error loading user:', error);
      clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const logout = () => {
    clearTokens();
    setUser(null);
    setSpotifyId(null);
  };

  const refreshUser = async () => {
    if (spotifyId) {
      const firebaseUser = await getUser(spotifyId);
      setUser(firebaseUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        spotifyId,
        avatarUrl: user?.avatarURL || null,
        isLoading,
        isAuthenticated: !!user,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
