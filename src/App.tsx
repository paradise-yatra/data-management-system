import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GlobalShortcuts } from "@/components/GlobalShortcuts";
import Index from "./pages/Index";
import DataManagement from "./pages/DataManagement";
import TelecallerPanel from "./pages/TelecallerPanel";
import TelecallerDestinations from "./pages/telecaller/TelecallerDestinations";
import Login from "./pages/Login";
import Users from "./pages/Users";
import Sales from "./pages/Sales";
import VoyaTrail from "./pages/VoyaTrail";
import Packages from "./pages/voya-trail/packages/Packages";
import PackageCategory from "./pages/voya-trail/packages/PackageCategory";
import PackageForm from "./pages/voya-trail/packages/PackageForm";
import Destinations from "./pages/voya-trail/packages/Destinations";
import RBACPage, { RBACRolesContent } from "./pages/RBAC";
import { AuthLogs } from "./pages/AuthLogs";
import { UserManagementPanel } from "@/components/user-management/UserManagementPanel";
import { DepartmentsPanel } from "@/components/user-management/DepartmentsPanel";
import Blogs from "./pages/Blogs";
import AddBlog from "./pages/AddBlog";
import EditBlog from "./pages/EditBlog";
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";
import Welcome from "./pages/Welcome";
import { CostLibrary } from "./pages/itinerary-builder/CostLibrary";
import { ItineraryList } from "./pages/itinerary-builder/ItineraryList";
import { ItineraryForm } from "./pages/itinerary-builder/ItineraryForm";
import BackupsPanel from "./pages/BackupsPanel";
import Notifications from "./pages/Notifications";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
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
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <Notifications />
                    </ProtectedRoute>
                  }
                />
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
                  <Route path="departments" element={<DepartmentsPanel />} />
                  <Route path="logs" element={<AuthLogs />} />
                </Route>
                {/* Sales Routes */}
                <Route
                  path="/sales"
                  element={
                    <ProtectedRoute>
                      <Sales />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sales/itinerary-builder"
                  element={
                    <ProtectedRoute>
                      <ItineraryList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sales/itinerary-builder/cost-library"
                  element={
                    <ProtectedRoute>
                      <CostLibrary />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sales/itinerary-builder/new"
                  element={
                    <ProtectedRoute>
                      <ItineraryForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sales/itinerary-builder/:id"
                  element={
                    <ProtectedRoute>
                      <ItineraryForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sales/itinerary-builder/:id/edit"
                  element={
                    <ProtectedRoute>
                      <ItineraryForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sales/telecaller"
                  element={
                    <ProtectedRoute resourceKey="telecaller_panel" requiredLevel="view">
                      <TelecallerPanel />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sales/telecaller/assigned"
                  element={
                    <ProtectedRoute resourceKey="telecaller_assigned" requiredLevel="view">
                      <TelecallerPanel />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sales/telecaller/destinations"
                  element={
                    <ProtectedRoute resourceKey="telecaller_panel" requiredLevel="view">
                      <TelecallerDestinations />
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
                  path="/voya-trail/blogs"
                  element={
                    <ProtectedRoute resourceKey="voya_trail" requiredLevel="view">
                      <Blogs />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/voya-trail/blogs/add"
                  element={
                    <ProtectedRoute resourceKey="voya_trail" requiredLevel="view">
                      <AddBlog />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/voya-trail/blogs/edit/:id"
                  element={
                    <ProtectedRoute resourceKey="voya_trail" requiredLevel="view">
                      <EditBlog />
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
                {/* Backups Panel */}
                <Route
                  path="/backups"
                  element={
                    <ProtectedRoute resourceKey="backup_management" requiredLevel="view">
                      <BackupsPanel />
                    </ProtectedRoute>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ThemeProvider>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
