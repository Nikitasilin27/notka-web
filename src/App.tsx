import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@gravity-ui/uikit';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Header } from './components/Header';
import { LoginPage } from './pages/LoginPage';
import { CallbackPage } from './pages/CallbackPage';
import { FeedPage } from './pages/FeedPage';
import { UsersPage } from './pages/UsersPage';
import { ProfilePage } from './pages/ProfilePage';
import { Loader } from '@gravity-ui/uikit';

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

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <Header />
      <main className="main-content">{children}</main>
    </div>
  );
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
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider theme="dark">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
