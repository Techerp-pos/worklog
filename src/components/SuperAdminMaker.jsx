import { useState } from "react";
import { Card, Input, Button, message } from "antd";
import { db } from "../firebase/config";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export default function SuperAdminMaker() {
    const [uid, setUid] = useState("");
    const [loading, setLoading] = useState(false);

    const makeSuperAdmin = async () => {
        if (!uid.trim()) return message.error("Please enter a valid UID");

        try {
            setLoading(true);

            const userRef = doc(db, "users", uid);
            const snap = await getDoc(userRef);

            if (snap.exists()) {
                // 🔥 Update existing user
                await updateDoc(userRef, {
                    role: "superadmin",
                    orgId: "system"
                });

                message.success("Existing user upgraded to Superadmin!");
            } else {
                // 🔥 Create a new Firestore user document if needed
                await setDoc(userRef, {
                    uid,
                    name: "Superadmin",
                    email: "superadmin@system.com",
                    role: "superadmin",
                    orgId: "system",
                    createdAt: new Date()
                });

                message.success("Superadmin created successfully!");
            }

            setUid("");

        } catch (err) {
            console.error(err);
            message.error("Failed to make superadmin");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 80 }}>
            <Card title="Create Superadmin" style={{ width: 400 }}>
                <p>Enter the Firebase Auth User UID:</p>

                <Input
                    placeholder="Enter UID"
                    value={uid}
                    onChange={(e) => setUid(e.target.value)}
                    style={{ marginBottom: 12 }}
                />

                <Button
                    type="primary"
                    block
                    loading={loading}
                    onClick={makeSuperAdmin}
                >
                    Make Superadmin
                </Button>
            </Card>
        </div>
    );
}
