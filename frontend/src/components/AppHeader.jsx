import { Link, NavLink, useNavigate } from "react-router-dom";
import Icon from "./Icon";
import "./AppHeader.css";

function BrandMark() {
  return (
    <svg
      className="brand-mark"
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="16" fill="#1F5C3F" />
      <rect
        x="10"
        y="22"
        width="30"
        height="20"
        rx="10"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
      />
      <rect
        x="24"
        y="22"
        width="30"
        height="20"
        rx="10"
        fill="none"
        stroke="#FFD84D"
        strokeWidth="5"
      />
    </svg>
  );
}

const NAV_ITEMS = [
  { to: "/dashboard", label: "Home", icon: "home" },
  { to: "/grocery-list", label: "Shop", icon: "cart" },
  { to: "/orders", label: "Orders", icon: "box" },
];

function AppHeader() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link to="/dashboard" className="brand">
          <BrandMark />
          <span>Grocery Link Helper</span>
        </Link>

        <nav className="app-nav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="app-nav-link"
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}

          <button
            type="button"
            className="app-nav-link app-nav-logout"
            onClick={handleLogout}
          >
            <Icon name="logout" />
            <span>Log out</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

export { BrandMark };
export default AppHeader;
