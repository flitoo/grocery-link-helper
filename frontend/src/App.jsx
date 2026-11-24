import { lazy, Suspense } from 'react';

import { Routes, Route } from "react-router-dom";
import PageAccessibility from './components/PageAccessibility';

import Login from "./pages/Login";
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));
const Register = lazy(() => import('./pages/Register'));
const GroceryList = lazy(() => import('./pages/GroceryList'));
const StoreSelection = lazy(() => import('./pages/StoreSelection'));
const DeliveryTimeSlot = lazy(() => import('./pages/DeliveryTimeSlot'));
const OrderSummary = lazy(() => import('./pages/OrderSummary'));
const Payment = lazy(() => import('./pages/Payment'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetails = lazy(() => import('./pages/OrderDetails'));
const RepeatOrder = lazy(() => import('./pages/RepeatOrder'));
const HelperDashboard = lazy(() => import('./pages/HelperDashboard'));
const HelperOrderDetails = lazy(() => import('./pages/HelperOrderDetails'));
const DeliveryStatusUpdate = lazy(() => import('./pages/DeliveryStatusUpdate'));
const CustomerChat = lazy(() => import('./pages/CustomerChat'));
const DeliveryNotifications = lazy(() => import('./pages/DeliveryNotifications'));
const RatingFeedback = lazy(() => import('./pages/RatingFeedback'));
const Collections = lazy(() => import('./pages/Collections'));
const SubstitutionRequests = lazy(() => import('./pages/SubstitutionRequests'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));

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
