import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster } from "sonner";
import ProtectedRoute from "./auth/ProtectedRoute";
import { PageLoader } from "./components/ui";
import AppErrorBoundary from "./components/ui/AppErrorBoundary";
import { useTheme } from "./theme/context";
import "./App.css";
import './components/content/content.css';

const Workspace = lazy(() => import("./pages/Workspace"));
const Overview = lazy(() => import("./pages/workspace/Overview"));
const AssessmentLibrary = lazy(
  () => import("./pages/workspace/AssessmentLibrary"),
);
const CreateAssessment = lazy(
  () => import("./pages/workspace/CreateAssessment"),
);
const TakeAssessment = lazy(() => import("./pages/workspace/TakeAssessment"));
const InteractionLab = lazy(() => import('./pages/workspace/InteractionLab'));
const EngineLibrary = lazy(() => import('./pages/workspace/EngineLibrary'));
const Results = lazy(() => import("./pages/workspace/Results"));
const Admin = lazy(() => import("./pages/workspace/Admin"));
const Settings = lazy(() => import("./pages/workspace/Settings"));
const Help = lazy(() => import("./pages/workspace/Help"));
const TeamsManager = lazy(() => import("./pages/TeamsManager"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const JoinTeam = lazy(() => import("./pages/JoinTeam"));
const NotFound = lazy(() => import("./pages/NotFount"));
const HomePage = lazy(() => import("./pages/HomePage"));

export default function App() {
  const { resolvedTheme } = useTheme();
  return (
    <BrowserRouter>
      <AppErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Workspace />}>
                <Route index element={<Overview />} />
                <Route path="tests" element={<AssessmentLibrary />} />
                <Route path="create" element={<CreateAssessment />} />
                <Route path="take" element={<TakeAssessment />} />
                <Route path="labs" element={<InteractionLab />} />
                <Route path="engines" element={<EngineLibrary />} />
                <Route path="results" element={<Results />} />
                <Route path="admin" element={<Admin />} />
                <Route path="teams" element={<TeamsManager />} />
                <Route path="settings" element={<Settings />} />
                <Route path="help" element={<Help />} />
              </Route>
              <Route path="/test" element={<Dashboard />} />
              <Route path="/join" element={<JoinTeam />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster
          theme={resolvedTheme}
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{ style: { fontFamily: "inherit" } }}
        />
      </AppErrorBoundary>
    </BrowserRouter>
  );
}
