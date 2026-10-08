import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import CustomerDashboard from "./pages/CustomerDashboard";
import Register from "./pages/Register";
import GroceryList from "./pages/GroceryList";
import StoreSelection from "./pages/StoreSelection";
import DeliveryTimeSlot from "./pages/DeliveryTimeSlot";
import OrderSummary from "./pages/OrderSummary";
import Payment from "./pages/Payment";
import Orders from "./pages/Orders";
import OrderDetails from "./pages/OrderDetails";
import HelperDashboard from "./pages/HelperDashboard";
import HelperOrderDetails from "./pages/HelperOrderDetails";
function App() {
  return (
    <Routes>
      {/* Authentication */}
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

      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={<CustomerDashboard />}
      />

      {/* Grocery Order Flow */}
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

      <Route
        path="/payment"
        element={<Payment />}
      />

      {/* Orders */}
      <Route
        path="/orders"
        element={<Orders />}
      />

      <Route
        path="/order-details/:orderId"
        element={<OrderDetails />}
      />

      <Route
      path="/helper-dashboard"
      element={<HelperDashboard />}
      />

      <Route
      path="/helper/orders/:orderId"
      element={<HelperOrderDetails />}
      
      />

    </Routes>
    
  );
}

export default App;