import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { ProtectedRoute } from "./ProtectedRoute";

import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import JobPostingListPage from "../pages/JobPostingListPage";
import JobPostingFormPage from "../pages/JobPostingFormPage";
import JobPostingDetailPage from "../pages/JobPostingDetailPage";
import DocumentsPage from "../pages/DocumentsPage";
import InterviewAiPage from "../pages/InterviewAiPage";
import SchedulePage from "../pages/SchedulePage";
import RetrospectivePage from "../pages/RetrospectivePage";
import ProfilePage from "../pages/ProfilePage";

// UI-01~10 라우팅 (프론트엔드_뼈대_플랜.md §3)
export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/job-postings" element={<JobPostingListPage />} />
          <Route path="/job-postings/new" element={<JobPostingFormPage />} />
          <Route path="/job-postings/:id" element={<JobPostingDetailPage />} />
          <Route path="/job-postings/:id/interview-ai" element={<InterviewAiPage />} />
          <Route path="/job-postings/:id/retrospectives" element={<RetrospectivePage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/schedules" element={<SchedulePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
