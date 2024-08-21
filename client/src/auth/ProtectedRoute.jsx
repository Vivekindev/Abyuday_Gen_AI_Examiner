import { Outlet, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

const ProtectedRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    axios.post('/api/auth/check', {}, { withCredentials: true })
      .then(response => {
        setIsAuthenticated(true);
      })
      .catch(error => {
        if (error.response && error.response.status === 403) {
          setIsAuthenticated(false);
        } else {
          console.error("An unexpected error occurred:", error);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return <div style={{backgroundColor:'black',width:'100vw',height:'100vh'}}>.</div>;
  }

  return (
    isAuthenticated ? <Outlet /> : <Navigate to="/login" />
  );
}

export default ProtectedRoute;
