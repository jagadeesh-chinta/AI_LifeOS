import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ActiveTimeProvider } from './context/ActiveTimeContext';
import { ThemeProvider } from './context/ThemeContext';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import About from './pages/About';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Goals from './pages/Goals';
import Habits from './pages/Habits';
import Schedule from './pages/Schedule';
import CalendarView from './pages/CalendarView';
import Notes from './pages/Notes';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import AdminPage from './pages/admin/AdminPage';
import CareerGuidance from './pages/CareerGuidance';
import TimetablePage from './pages/TimetablePage';
import Connections from './pages/Connections';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-textSecondary">Loading AI LifeOS...</span>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  
  return children;
};

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ActiveTimeProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-background text-textPrimary">
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/about" element={<About />} />
                  
                  {/* Protected Routes */}
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Dashboard />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  {/* Additional routes will be added here */}
                  <Route path="/tasks" element={<ProtectedRoute><Layout><Tasks /></Layout></ProtectedRoute>} />
                  <Route path="/goals" element={<ProtectedRoute><Layout><Goals /></Layout></ProtectedRoute>} />
                  <Route path="/habits" element={<ProtectedRoute><Layout><Habits /></Layout></ProtectedRoute>} />
                  <Route path="/calendar" element={<ProtectedRoute><Layout><CalendarView /></Layout></ProtectedRoute>} />
                  <Route path="/schedule" element={<ProtectedRoute><Layout><Schedule /></Layout></ProtectedRoute>} />
                  <Route path="/notes" element={<ProtectedRoute><Layout><Notes /></Layout></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />

                  {/* Dedicated AI Career Guidance Route */}
                  <Route path="/career-guidance" element={<ProtectedRoute><CareerGuidance /></ProtectedRoute>} />
                  <Route path="/goals/:id/guidance" element={<ProtectedRoute><CareerGuidance /></ProtectedRoute>} />

                  {/* Dedicated Timetable Builder Route (Full Screen, Same Tab) */}
                  <Route path="/timetable" element={<ProtectedRoute><TimetablePage /></ProtectedRoute>} />

                  {/* Dedicated Connections & Encrypted Messaging Route */}
                  <Route path="/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />

                  {/* Dedicated Admin Dashboard Route */}
                  <Route path="/admin" element={<AdminPage />} />
                </Routes>
              </ErrorBoundary>
            </div>
          </BrowserRouter>
        </ActiveTimeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
