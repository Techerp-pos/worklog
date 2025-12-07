import { useState } from "react";
import { Card, Input, Button, message } from "antd";
import { db } from "../firebase/config";
import {
    collection,
    getDocs,
    doc,
    setDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function JoinOrganization() {
    const [code, setCode] = useState("");
    const navigate = useNavigate();

    const handleJoin = async () => {
        if (!code.trim()) return message.error("Enter join code");

        // Check organization exists
        const orgSnap = await getDocs(collection(db, "organizations"));
        let org = null;

        orgSnap.forEach((d) => {
            if (d.data().joinCode === code.trim()) {
                org = { id: d.id, ...d.data() };
            }
        });

        if (!org) return message.error("Invalid join code");

        // Get pending google user info
        const uid = localStorage.getItem("pending_google_uid");
        const name = localStorage.getItem("pending_google_name");
        const email = localStorage.getItem("pending_google_email");

        if (!uid) return message.error("No signup in progress");

        // Create user in /users
        await setDoc(doc(db, "users", uid), {
            name,
            email,
            role: "employee",
            orgId: org.id,
            createdAt: new Date(),
        });

        const userData = { uid, name, email, role: "employee", orgId: org.id };
        localStorage.setItem("worklog_user", JSON.stringify(userData));

        // Cleanup
        localStorage.removeItem("pending_google_uid");
        localStorage.removeItem("pending_google_name");
        localStorage.removeItem("pending_google_email");

        message.success("Joined successfully!");
        navigate("/employee");
    };

    return (
        <div style={{ display: "flex", height: "100vh", justifyContent: "center", alignItems: "center" }}>
            <Card title="Join Organization" style={{ width: 350 }}>
                <Input
                    placeholder="Enter Join Code (e.g., ORG-ABCD12)"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                />

                <Button type="primary" block style={{ marginTop: 10 }} onClick={handleJoin}>
                    Join Organization
                </Button>
            </Card>
        </div>
    );
}
