import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";

import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import Employees from "./pages/Employees";
import SalaryReport from "./pages/SalaryReport";
import AdminAttendance from "./pages/AdminAttendance";

import EmployeeDashboard from "./pages/EmployeeDashboard";
import AttendanceScanner from "./pages/AttendanceScanner";

import AuthGuard from "./utils/authGuard";

import CreateOrganization from "./pages/CreateOrganization";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SuperAdminOrgView from "./pages/SuperAdminOrgView";
import JoinOrganization from "./pages/JoinOrganization";
import FakeAttendanceGenerator from "./components/FakeAttendanceGenerator";
import { AuthProvider } from "./context/AuthContext";


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* LOGIN */}
          <Route path="/" element={<Login />} />

          {/* SUPERADMIN ROUTES */}
          <Route element={<AuthGuard allowed={["superadmin"]} />}>
            <Route path="/superadmin" element={<SuperAdminDashboard />} />
            <Route path="/superadmin/create-org" element={<CreateOrganization />} />
            <Route path="/superadmin/org/:orgId" element={<SuperAdminOrgView />} />
          </Route>

          {/* ADMIN ROUTES */}
          <Route element={<AuthGuard allowed={["admin", "superadmin"]} />}>

            {/* Admin with NO organization */}
            <Route path="/admin/setup" element={<CreateOrganization />} />

            {/* Admin with organization */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="employees" element={<Employees />} />
              <Route path="salary-report" element={<SalaryReport />} />
              <Route path="attendance" element={<AdminAttendance />} />
            </Route>
          </Route>

          {/* EMPLOYEE ROUTES */}
          <Route element={<AuthGuard allowed={["employee", "superadmin"]} />}>
            <Route path="/employee" element={<EmployeeDashboard />} />
          </Route>

          <Route path="/admin/scan" element={<AttendanceScanner />} />
          <Route path="/join-organization" element={<JoinOrganization />} />
          <Route path="/test" element={<FakeAttendanceGenerator />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
