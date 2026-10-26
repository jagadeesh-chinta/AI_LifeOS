import React from 'react';
import { Navigate } from 'react-router-dom';

const Landing = () => {
  return <Navigate to="/login" replace />;
};

export default Landing;
