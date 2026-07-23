import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HomePage } from './pages/HomePage';
import { EventDetailPage } from './pages/EventDetailPage';
import { OrderPage } from './pages/OrderPage';
import { MyOrdersPage } from './pages/MyOrdersPage';
import { MyTicketsPage } from './pages/MyTicketsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { OrganizerDashboardPage } from './pages/organizer/OrganizerDashboardPage';
import { EventManagePage } from './pages/organizer/EventManagePage';
import { CheckInPage } from './pages/organizer/CheckInPage';

function RequireAuth({ organizer = false }: { organizer?: boolean }) {
  const { user, initializing } = useAuth();
  if (initializing) {
    return <Spinner />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (organizer && user.role === 'ATTENDEE') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/events/:eventId" element={<EventDetailPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/orders" element={<MyOrdersPage />} />
          <Route path="/orders/:orderId" element={<OrderPage />} />
          <Route path="/tickets" element={<MyTicketsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>
        <Route element={<RequireAuth organizer />}>
          <Route path="/organizer" element={<OrganizerDashboardPage />} />
          <Route path="/organizer/events/:eventId" element={<EventManagePage />} />
          <Route path="/organizer/check-in" element={<CheckInPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
