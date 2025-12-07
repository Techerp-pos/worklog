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

                const empSnap = await getDocs(
                    query(collection(db, "users"), where("orgId", "==", d.id))
                );

                org.employeeCount = empSnap.docs.length;

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
        <div className="ios-wrapper">

            {/* Header */}
            <div className="ios-header">
                <div className="title-wrap">
                 <img src="https://img.icons8.com/glassmorphism/36/database.png" alt="organisations" />
                <h1 className="ios-title">Organizations</h1>   
                </div>
                

                <button
                    className="ios-add-btn"
                    onClick={() => navigate("/superadmin/create-org")}
                >
                    + Add Organization
                </button>
            </div>

            {/* List */}
            <div className="ios-list">
                {orgs.map((org) => (
                    <div
                        key={org.id}
                        className="ios-card"
                        onClick={() => navigate(`/superadmin/org/${org.id}`)}
                    >
                        <div className="ios-card-left">
                            
                            <div className="ios-org-name">{org.name}</div>
                            <div className="ios-org-sub">
                                {org.employeeCount} employees • {org.adminEmail}
                            </div>
                        </div>

                        <div className="ios-card-right">
                            <div className="ios-date">
                                {new Date(org.createdAt?.seconds * 1000).toLocaleDateString()}
                            </div>

                            <div className="ios-chevron">›</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
