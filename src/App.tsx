import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@gravity-ui/uikit';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeContextProvider, useTheme } from './hooks/useTheme';
import { I18nProvider } from './hooks/useI18n';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { CallbackPage } from './pages/CallbackPage';
import { FeedPage } from './pages/FeedPage';
import { UsersPage } from './pages/UsersPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { Loader } from '@gravity-ui/uikit';

// Custom theme - must be imported AFTER Gravity UI
import './styles/theme.css';
import './styles/error-boundary.css';



function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="login-page">
        <Loader size="l" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="login-page">
        <Loader size="l" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } 
      />
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <FeedPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <AppLayout>
              <UsersPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProfilePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/:odl"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProfilePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function ThemedApp() {
  const { theme } = useTheme();

  return (
    <ThemeProvider theme={theme}>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
          style: {
            background: theme === 'dark' ? '#333' : '#fff',
            color: theme === 'dark' ? '#fff' : '#333',
          },
          success: {
            iconTheme: {
              primary: '#4bb34b',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#e74c3c',
              secondary: '#fff',
            },
          },
        }}
      />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <ThemeContextProvider>
          <ThemedApp />
        </ThemeContextProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
