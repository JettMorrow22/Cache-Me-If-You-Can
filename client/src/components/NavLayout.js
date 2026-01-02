import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/NavLayout.css";

function Layout() {
  const { user, isLeader, isAdmin } = useAuth();

  const getUserType = () => {
    if (isAdmin) return "Admin";
    if (isLeader) return "Leader";
    return "Runner";
  };
  return (
    <div className="layout-container">
      <nav className="navbar">
        <div className="navbar-left">
          <Link to="/home" className="navbar-brand">
            Cache Me If You Can
          </Link>
          <Link to="/home" className="nav-link">
            Home
          </Link>
          <Link to="/runfinder" className="nav-link">
            Find Runs
          </Link>
          <Link to="/my-runs" className="nav-link">
            {isLeader ? "Joined Runs" : "My Runs"}
          </Link>
          {/* Only show leader-specific links if the user is a leader */}
          {isLeader && (
            <Link to="/leader-dashboard" className="nav-link">
              Leader Dashboard
            </Link>
          )}
        </div>

        <div className="navbar-right">
          {user && (
            <>
              <span className="navbar-welcome">
                Welcome,{" "}
                <strong>
                  {user.first_name} {user.last_name}
                </strong>
              </span>
              <span className="navbar-user-type">{getUserType()}</span>
            </>
          )}
          <Link to="/profile" className="nav-link">
            Profile
          </Link>
        </div>
      </nav>
      <div className="content-area">
        <Outlet /> {/* This renders the child routes */}
      </div>
    </div>
  );
}

export default Layout;
