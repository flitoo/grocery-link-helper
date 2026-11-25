import { NavLink, useNavigate } from 'react-router-dom';
import { clearSession } from '../lib/api';

export default function AppHeader({ helper = false, children }) {
  const navigate = useNavigate();
  function logout() {
    clearSession(); // drafts and cached orders belong to the current account
    navigate('/');
  }
  return <header className="app-header">
    <NavLink className="app-brand" to={helper ? '/helper-dashboard' : '/dashboard'}>Grocery Link Helper</NavLink>
    <nav aria-label="Main navigation">
      {helper ? <NavLink to="/helper-dashboard">Dashboard</NavLink> : <>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/grocery-list">Grocery List</NavLink>
        <NavLink to="/collections">Collections</NavLink>
        <NavLink to="/orders">Orders</NavLink>
        <NavLink to="/notifications">Notifications</NavLink>
      </>}
      {children}
      <button type="button" onClick={logout}>Logout</button>
    </nav>
  </header>;
}
