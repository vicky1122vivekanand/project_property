import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Maintenance from "./pages/Maintenance";
import Amenities from "./pages/Amenities";
import ManageAmenities from "./pages/ManageAmenities";
import PropertySettings from "./pages/PropertySettings";
import Messages from "./pages/Messages";
import FeedbackOverview from "./pages/FeedbackOverview";

const Layout = ({ children }) => (
  <div className="min-h-screen bg-gray-50">
    <Navbar />
    {children}
  </div>
);

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
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
      <Route
        path="/maintenance"
        element={
          <ProtectedRoute>
            <Layout>
              <Maintenance />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/amenities"
        element={
          <ProtectedRoute>
            <Layout>
              <Amenities />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Layout>
              <Messages />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/feedback"
        element={
          <ProtectedRoute>
            {["staff", "owner", "admin"].includes(user?.role) ? (
              <Layout>
                <FeedbackOverview />
              </Layout>
            ) : (
              <Navigate to="/dashboard" replace />
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/manage-amenities"
        element={
          <ProtectedRoute>
            {["owner", "admin"].includes(user?.role) ? (
              <Layout>
                <ManageAmenities />
              </Layout>
            ) : (
              <Navigate to="/dashboard" replace />
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/property-settings"
        element={
          <ProtectedRoute>
            {["owner", "admin"].includes(user?.role) ? (
              <Layout>
                <PropertySettings />
              </Layout>
            ) : (
              <Navigate to="/dashboard" replace />
            )}
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
