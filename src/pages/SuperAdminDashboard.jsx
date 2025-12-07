import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import {
    collection,
    query,
    onSnapshot,
    getDocs,
    where
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../styles/SuperAdminDashboard.css";

export default function SuperAdminDashboard() {
    const [orgs, setOrgs] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const q = query(collection(db, "organizations"));

        const unsub = onSnapshot(q, async (snap) => {
            const list = [];

            for (let d of snap.docs) {
                const org = { id: d.id, ...d.data() };

                // Fetch number of employees inside this org
                const empSnap = await getDocs(
                    query(collection(db, "users"), where("orgId", "==", d.id))
                );

                org.employeeCount = empSnap.docs.length;

                // Find admin of this org
                const adminData = empSnap.docs.find(
                    (u) => u.data().role === "admin"
                );
                org.adminEmail = adminData ? adminData.data().email : "Not Assigned";

                list.push(org);
            }

            setOrgs(list);
        });

        return () => unsub();
    }, []);

    return (
        <div className="sa-container">

            <div className="sa-header">
                <h1>Organizations</h1>
                <button
                    className="sa-add-btn"
                    onClick={() => navigate("/superadmin/create-org")}
                >
                    + Add Organization
                </button>
            </div>

            <div className="sa-table">
                <div className="sa-table-header">
                    <div>Organization</div>
                    <div>Employees</div>
                    <div>Admin Email</div>
                    <div>Created</div>
                    <div>Action</div>
                </div>

                {orgs.map((org) => (
                    <div key={org.id} className="sa-table-row">
                        <div className="bold">{org.name}</div>
                        <div>{org.employeeCount}</div>
                        <div>{org.adminEmail}</div>
                        <div>{new Date(org.createdAt?.seconds * 1000).toDateString()}</div>
                        <div>
                            <button
                                className="sa-view-btn"
                                onClick={() => navigate(`/superadmin/org/${org.id}`)}
                            >
                                View as Admin
                            </button>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}
