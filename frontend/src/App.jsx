import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import CustomerDashboard from "./pages/CustomerDashboard";
import Register from "./pages/Register";
import GroceryList from "./pages/GroceryList";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/dashboard"
        element={<CustomerDashboard />}
      />

      <Route
        path="/grocery-list"
        element={<GroceryList />}
      />
    </Routes>
  );
}

export default App;