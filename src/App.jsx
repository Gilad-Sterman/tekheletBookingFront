import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import Calendar from './components/Calendar/Calendar';
import Dashboard from './components/Dashboard/Dashboard';
import Login from './components/Login/Login';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { LogOut } from 'lucide-react';

// Separate ProtectedRoute component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('tour_app_token');
  const location = useLocation();
  if (!token) {
    // Preserve query params (e.g. ?tourId=...) through login redirect
    const redirect = location.pathname + location.search;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  return children;
};

function AppContent() {
  const { user, logout } = useAuth();

  return (
    <div className="main-layout">
      <header className="main-header full flex-between">
        <Link to="/" className="logo-link">
          <div className="logo-section flex-center">
            <img
              src="https://res.cloudinary.com/dollaguij/image/upload/v1703232276/WhatsApp_Image_2023-12-21_at_17.15.46_tuubbf.jpg"
              alt="Logo"
            />
            <h1>
              <span>TEKHELET</span> TOURS
            </h1>
          </div>
        </Link>

        {user && (
          <nav className="user-nav flex-center">
            <div className="user-info">
              <p className="user-name">{user.name}</p>
              <p className="user-role">{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="btn-logout flex-center"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </nav>
        )}
      </header>

      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Calendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

// Root App component
function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
