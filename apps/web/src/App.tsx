import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { useAuth } from './lib/auth';
import CompetitionListPage from './pages/CompetitionListPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import PeerReviewPage from './pages/PeerReviewPage';
import ResultsPage from './pages/ResultsPage';
import ScoringPage from './pages/ScoringPage';
import TeamPage from './pages/TeamPage';

function RequireAuth() {
  const token = useAuth((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        {/* 全屏大屏，独立 header，无业务导航 */}
        <Route path="/dashboard" element={<DashboardPage />} />
        {/* 业务页：公共导航 + Outlet */}
        <Route element={<AppLayout />}>
          <Route path="/competitions" element={<CompetitionListPage />} />
          <Route path="/competitions/:id/team" element={<TeamPage />} />
          <Route path="/competitions/:id/scoring" element={<ScoringPage />} />
          <Route path="/competitions/:id/peer-review" element={<PeerReviewPage />} />
          <Route path="/competitions/:id/results" element={<ResultsPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/competitions" replace />} />
        <Route path="*" element={<Navigate to="/competitions" replace />} />
      </Route>
    </Routes>
  );
}
