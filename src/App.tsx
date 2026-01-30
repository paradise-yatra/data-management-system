import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GlobalShortcuts } from "@/components/GlobalShortcuts";
import Index from "./pages/Index";
import DataManagement from "./pages/DataManagement";
import Login from "./pages/Login";
import Users from "./pages/Users";
import HumanResourceManagement from "./pages/HumanResourceManagement";
import Recruitment from "./pages/Recruitment";
import VoyaTrail from "./pages/VoyaTrail";
import Packages from "./pages/voya-trail/packages/Packages";
import PackageCategory from "./pages/voya-trail/packages/PackageCategory";
import PackageForm from "./pages/voya-trail/packages/PackageForm";
import Destinations from "./pages/voya-trail/packages/Destinations";
import RBACPage, { RBACRolesContent } from "./pages/RBAC";
import { AuthLogs } from "./pages/AuthLogs";
import { UserManagementPanel } from "@/components/user-management/UserManagementPanel";
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";
import Welcome from "./pages/Welcome";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <GlobalShortcuts />
            <Routes>

            <Route path="/login" element={<Login />} />
            <Route
              path="/welcome"
              element={
                <ProtectedRoute>
                  <Welcome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute resourceKey="dashboard" requiredLevel="view">
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/data-management"
              element={
                <ProtectedRoute resourceKey="data_management" requiredLevel="view">
                  <DataManagement />
                </ProtectedRoute>
              }
            />
            <Route path="/access-denied" element={<AccessDenied />} />
            <Route
              path="/users"
              element={
                <ProtectedRoute resourceKey="manage_users" requiredLevel="view">
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route path="/rbac" element={
              <ProtectedRoute resourceKey="rbac_system" requiredLevel="view">
                <RBACPage />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/rbac/roles" replace />} />
              <Route path="roles" element={<RBACRolesContent />} />
              <Route path="users" element={<UserManagementPanel embedded />} />
              <Route path="logs" element={<AuthLogs />} />
            </Route>
            <Route
              path="/human-resource-management"
              element={
                <ProtectedRoute resourceKey="hr_portal" requiredLevel="view">
                  <HumanResourceManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/human-resource-management/recruitment"
              element={
                <ProtectedRoute resourceKey="recruitment" requiredLevel="view">
                  <Recruitment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/voya-trail"
              element={
                <ProtectedRoute resourceKey="voya_trail" requiredLevel="view">
                  <VoyaTrail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/voya-trail/packages"
              element={
                <ProtectedRoute resourceKey="voya_trail_packages" requiredLevel="view">
                  <Packages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/voya-trail/packages/destinations"
              element={
                <ProtectedRoute resourceKey="voya_trail_destinations" requiredLevel="view">
                  <Destinations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/voya-trail/packages/category"
              element={
                <ProtectedRoute resourceKey="voya_trail_category" requiredLevel="view">
                  <PackageCategory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/voya-trail/packages/new"
              element={
                <ProtectedRoute resourceKey="voya_trail_package_form" requiredLevel="view">
                  <PackageForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/voya-trail/packages/:id"
              element={
                <ProtectedRoute resourceKey="voya_trail_package_form" requiredLevel="view">
                  <PackageForm />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
