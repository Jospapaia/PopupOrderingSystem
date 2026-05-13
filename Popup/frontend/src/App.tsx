import CustomerApp from "./components/customer/CustomerApp";
import AdminApp from "./components/admin/AdminApp";

export default function App() {
  const isAdmin = window.location.pathname.startsWith("/admin");
  return isAdmin ? <AdminApp /> : <CustomerApp />;
}
