import { useState } from "react";
import { Card, Input, Button, message } from "antd";
import { db } from "../firebase/config";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../styles/joinOrg.css";

export default function JoinOrganization() {
    const [code, setCode] = useState("");
    const [org, setOrg] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // STEP 1 → Validate Join Code
    const handleContinue = async () => {
        if (!code.trim()) return message.error("Enter join code");

        setLoading(true);

        const orgSnap = await getDocs(collection(db, "organizations"));
        let found = null;

        orgSnap.forEach((d) => {
            if (d.data().joinCode === code.trim()) {
                found = { id: d.id, ...d.data() };
            }
        });

        setLoading(false);

        if (!found) return message.error("Invalid join code");

        setOrg(found); // show next UI
    };

    // STEP 2 → Join Organization
    const handleJoin = async () => {
        const uid = localStorage.getItem("pending_google_uid");
        const name = localStorage.getItem("pending_google_name");
        const email = localStorage.getItem("pending_google_email");

        if (!uid) return message.error("No signup in progress");

        await setDoc(doc(db, "users", uid), {
            name,
            email,
            role: "employee",
            orgId: org.id,
            createdAt: new Date(),
        });

        const userData = { uid, name, email, role: "employee", orgId: org.id };
        localStorage.setItem("worklog_user", JSON.stringify(userData));

        localStorage.removeItem("pending_google_uid");
        localStorage.removeItem("pending_google_name");
        localStorage.removeItem("pending_google_email");

        message.success("Joined successfully!");
        navigate("/employee");
    };

    return (
        <div className="join-container">

            {/* STEP 1 – ENTER CODE */}
            {!org && (
                <div className="join-card">
                    <h2>Enter join code</h2>
                    <p className="subtitle">Enter the unique code your organization gave you.</p>

                    <Input
                        className="join-input"
                        placeholder="e.g., ORG-XYZ123"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                    />

                    <Button
                        type="primary"
                        block
                        className="continue-btn"
                        onClick={handleContinue}
                        loading={loading}
                    >
                        Continue →
                    </Button>
                </div>
            )}

            {/* STEP 2 – SHOW ORGANIZATION */}
            {org && (
                <div className="org-card">
                    <div className="org-avatar">
                        <img
                            src={org.logo || "https://img.icons8.com/glassmorphism/96/company.png"}
                            alt="org"
                        />
                    </div>

                    <h2 className="org-name">{org.name}</h2>

                    <p className="subtitle">You are joining this organization.</p>

                    <Button
                        type="primary"
                        block
                        className="join-btn"
                        onClick={handleJoin}
                    >
                        Join Organization →
                    </Button>
                </div>
            )}
        </div>
    );
}
