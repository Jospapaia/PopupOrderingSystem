import CustomerApp from "./components/customer/CustomerApp";
import AdminApp from "./components/admin/AdminApp";
import AboutPage from "./components/customer/AboutPage";

export default function App() {
  const path = window.location.pathname;
  if (path.startsWith("/admin")) return <AdminApp />;
  if (path === "/about") return <AboutPage />;
  return <CustomerApp />;
}
