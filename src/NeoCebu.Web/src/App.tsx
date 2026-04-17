import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import StudentLoginPage from './pages/Auth/StudentLoginPage';
import Dashboard from './pages/Dashboard/Dashboard';
import ClassroomHub from './pages/Classroom/ClassroomHub';
import './styles/global.css';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const isStudentPath = window.location.pathname.includes('/student');
  
  if (!isAuthenticated) {
    return <Navigate to={isStudentPath ? "/student-login" : "/login"} />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/student-login" element={<StudentLoginPage />} />
          
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/classroom/:classroomId" 
            element={
              <PrivateRoute>
                <ClassroomHub />
              </PrivateRoute>
            } 
          />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
