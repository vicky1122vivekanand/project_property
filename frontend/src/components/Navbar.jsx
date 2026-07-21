import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navLinkClass = ({ isActive }) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive ? "bg-primary-600 text-white" : "text-gray-600 hover:bg-gray-100"
  }`;

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold">
                P
              </div>
              <span className="font-semibold text-lg text-gray-900">PropertyHub</span>
            </div>
            {user && (
              <nav className="hidden md:flex items-center gap-1">
                <NavLink to="/dashboard" className={navLinkClass}>
                  Dashboard
                </NavLink>
                <NavLink to="/maintenance" className={navLinkClass}>
                  Maintenance
                </NavLink>
                <NavLink to="/amenities" className={navLinkClass}>
                  Amenities
                </NavLink>
                <NavLink to="/messages" className={navLinkClass}>
                  Messages
                </NavLink>
                {["staff", "owner", "admin"].includes(user.role) && (
                  <NavLink to="/feedback" className={navLinkClass}>
                    Feedback
                  </NavLink>
                )}
                {["owner", "admin"].includes(user.role) && (
                  <NavLink to="/manage-amenities" className={navLinkClass}>
                    Manage Amenities
                  </NavLink>
                )}
                {["owner", "admin"].includes(user.role) && (
                  <NavLink to="/property-settings" className={navLinkClass}>
                    Property Settings
                  </NavLink>
                )}
              </nav>
            )}
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
              <button onClick={handleLogout} className="btn-secondary text-sm">
                Log out
              </button>
            </div>
          )}
        </div>
        {user && (
          <nav className="flex md:hidden items-center gap-1 pb-3 flex-wrap">
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/maintenance" className={navLinkClass}>
              Maintenance
            </NavLink>
            <NavLink to="/amenities" className={navLinkClass}>
              Amenities
            </NavLink>
            <NavLink to="/messages" className={navLinkClass}>
              Messages
            </NavLink>
            {["staff", "owner", "admin"].includes(user.role) && (
              <NavLink to="/feedback" className={navLinkClass}>
                Feedback
              </NavLink>
            )}
            {["owner", "admin"].includes(user.role) && (
              <NavLink to="/manage-amenities" className={navLinkClass}>
                Manage Amenities
              </NavLink>
            )}
            {["owner", "admin"].includes(user.role) && (
              <NavLink to="/property-settings" className={navLinkClass}>
                Property Settings
              </NavLink>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Navbar;
