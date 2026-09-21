import { Routes, Route } from "react-router";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import CustomerDashboard from "./pages/CustomerDashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/dashboard" element={<CustomerDashboard />} />
    </Routes>
  );
}

export default App;