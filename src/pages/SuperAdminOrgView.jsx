import { useParams } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import AdminDashboard from "./AdminDashboard";

export default function SuperAdminOrgView() {
    const { orgId } = useParams();

    // Store override
    localStorage.setItem("worklog_admin_override_org", orgId);

    return (
        <AdminLayout superadminMode={true}>
            <AdminDashboard superadminMode={true} overrideOrgId={orgId} />
        </AdminLayout>
    );
}
