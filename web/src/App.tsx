import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { Catalog } from './pages/Catalog';
import { Detail } from './pages/Detail';
import { Read } from './pages/Read';
import { Shelf } from './pages/Shelf';
import { SourceManager } from './pages/SourceManager';
import { UserManager } from './pages/UserManager';
import { Login } from './pages/Login';
import { useAuthStore } from './stores/auth';
import { Spinner } from './components/ui/Spinner';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/catalog" element={<Catalog />} />
                  <Route path="/detail" element={<Detail />} />
                  <Route path="/read" element={<Read />} />
                  <Route path="/shelf" element={<Shelf />} />
                  <Route path="/sources" element={<SourceManager />} />
                  <Route path="/users" element={<UserManager />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
