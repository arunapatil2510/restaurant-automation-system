import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to /admin/login while saving the attempted URL
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
};
