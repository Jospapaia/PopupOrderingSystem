import CustomerApp from "./components/customer/CustomerApp";
import AdminApp from "./components/admin/AdminApp";
import AboutPage from "./components/customer/AboutPage";
import SurveyPage from "./components/customer/SurveyPage";

export default function App() {
  const path = window.location.pathname;
  if (path.startsWith("/admin")) return <AdminApp />;
  if (path === "/about") return <AboutPage />;
  const surveyMatch = path.match(/^\/survey\/([0-9a-f-]{36})$/);
  if (surveyMatch) return <SurveyPage eventId={surveyMatch[1]} />;
  return <CustomerApp />;
}
