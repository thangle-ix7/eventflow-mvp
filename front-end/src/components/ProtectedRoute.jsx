import { Navigate, Outlet, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ user }) => {
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
