
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
import DeliveryStatusUpdate from "./pages/DeliveryStatusUpdate";
import CustomerChat from "./pages/CustomerChat";

function App() {
  return (
    <Routes>
      {/* Authentication */}
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      {/* Customer Dashboard */}
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

      {/* Customer Orders */}
      <Route
        path="/orders"
        element={<Orders />}
      />
      <Route
        path="/order-details/:orderId"
        element={<OrderDetails />}
      />

      {/* Customer Chat */}
      <Route
        path="/orders/:orderId/chat"
        element={<CustomerChat />}
      />

      {/* Helper Dashboard */}
      <Route
        path="/helper-dashboard"
        element={<HelperDashboard />}
      />

      {/* Helper Order Details */}
      <Route
        path="/helper/orders/:orderId"
        element={<HelperOrderDetails />}
      />

      {/* Helper Delivery Status */}
      <Route
        path="/helper/orders/:orderId/status"
        element={<DeliveryStatusUpdate />}
      />

      {/* Helper Chat */}
      <Route
        path="/helper/orders/:orderId/chat"
        element={<CustomerChat isHelper={true} />}
      />
    </Routes>
  );
}

export default App;
