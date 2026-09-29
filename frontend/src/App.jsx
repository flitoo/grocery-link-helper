import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import CustomerDashboard from "./pages/CustomerDashboard";
import Register from "./pages/Register";
import GroceryList from "./pages/GroceryList";
import StoreSelection from "./pages/StoreSelection";
import DeliveryTimeSlot from "./pages/DeliveryTimeSlot";
import OrderSummary from "./pages/OrderSummary";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Login />}
      />

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

      <Route
        path="/store-selection"
        element={<StoreSelection />}
      />

      <Route
        path="/delivery-time"
        element={<DeliveryTimeSlot />}
      />

      <Route
        path="/order-summary"
        element={<OrderSummary />}
      />
    </Routes>
  );
}

export default App;