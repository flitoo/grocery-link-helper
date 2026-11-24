import { Suspense } from 'react';
import { lazyRoute } from './lib/routeLoading';

import { Routes, Route } from "react-router-dom";
import PageAccessibility from './components/PageAccessibility';

import Login from "./pages/Login";
const ForgotPassword = lazyRoute("/forgot-password", () => import('./pages/ForgotPassword'));
const CustomerDashboard = lazyRoute("/dashboard", () => import('./pages/CustomerDashboard'));
const Register = lazyRoute("/register", () => import('./pages/Register'));
const GroceryList = lazyRoute("/grocery-list", () => import('./pages/GroceryList'));
const StoreSelection = lazyRoute("/store-selection", () => import('./pages/StoreSelection'));
const DeliveryTimeSlot = lazyRoute("/delivery-time", () => import('./pages/DeliveryTimeSlot'));
const OrderSummary = lazyRoute("/order-summary", () => import('./pages/OrderSummary'));
const Payment = lazyRoute("/payment", () => import('./pages/Payment'));
const Orders = lazyRoute("/orders", () => import('./pages/Orders'));
const OrderDetails = lazyRoute("/order-details/:orderId", () => import('./pages/OrderDetails'));
const RepeatOrder = lazyRoute("/orders/:orderId/repeat", () => import('./pages/RepeatOrder'));
const HelperDashboard = lazyRoute("/helper-dashboard", () => import('./pages/HelperDashboard'));
const HelperOrderDetails = lazyRoute("/helper/orders/:orderId", () => import('./pages/HelperOrderDetails'));
const DeliveryStatusUpdate = lazyRoute("/helper/orders/:orderId/status", () => import('./pages/DeliveryStatusUpdate'));
const CustomerChat = lazyRoute(["/orders/:orderId/chat","/helper/orders/:orderId/chat"], () => import('./pages/CustomerChat'));
const DeliveryNotifications = lazyRoute("/notifications", () => import('./pages/DeliveryNotifications'));
const RatingFeedback = lazyRoute("/orders/:orderId/rate", () => import('./pages/RatingFeedback'));
const Collections = lazyRoute("/collections", () => import('./pages/Collections'));
const SubstitutionRequests = lazyRoute(["/orders/:orderId/substitutions","/helper/orders/:orderId/substitutions"], () => import('./pages/SubstitutionRequests'));
const OrderTracking = lazyRoute("/orders/:orderId/tracking", () => import('./pages/OrderTracking'));

function App() {
  return (
    <><PageAccessibility /><Suspense fallback={<main id="main-content" tabIndex={-1} data-loading="true" role="status">Loading page...</main>}><Routes>
      <Route path="/orders/:orderId/tracking" element={<OrderTracking />} />
      <Route path="/orders/:orderId/substitutions" element={<SubstitutionRequests />} />
      <Route path="/helper/orders/:orderId/substitutions" element={<SubstitutionRequests helper />} />
      <Route path="/collections" element={<Collections />} />
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

      {/* Repeat Order */}
      <Route
        path="/orders/:orderId/repeat"
        element={<RepeatOrder />}
      />

      {/* Delivery Notifications */}
      <Route
        path="/notifications"
        element={<DeliveryNotifications />}
      />

      {/* Rating & Feedback */}
      <Route
        path="/orders/:orderId/rate"
        element={<RatingFeedback />}
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
    </Routes></Suspense></>
  );
}

export default App;
