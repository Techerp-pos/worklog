import { useState } from "react";
import { Card, Input, Button, message } from "antd";
import { db, auth } from "../firebase/config";
import { collection, addDoc, setDoc, doc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { nanoid } from "nanoid";
import { useNavigate, useLocation } from "react-router-dom";

export default function CreateOrganization() {
    const [name, setName] = useState("");
    const [step, setStep] = useState(1);

    const [adminEmail, setAdminEmail] = useState("");
    const [adminPassword, setAdminPassword] = useState("");

    const navigate = useNavigate();
    const location = useLocation();

    // Detect if superadmin is using this page
    const isSuperAdmin = location.pathname.includes("/superadmin");

    const goNextStep = () => {
        if (!name) return message.error("Please enter organization name");

        const email = `admin@${name.toLowerCase().replace(/\s+/g, "")}.com`;
        setAdminEmail(email);
        setStep(2);
    };

    const createOrganization = async () => {
        if (!adminPassword) return message.error("Enter admin password");

        try {
            const joinCode = "ORG-" + nanoid(6).toUpperCase();

            const orgRef = await addDoc(collection(db, "organizations"), {
                name,
                joinCode,
                createdAt: new Date(),
            });

            const orgId = orgRef.id;

            const adminUser = await createUserWithEmailAndPassword(
                auth,
                adminEmail,
                adminPassword
            );

            await setDoc(doc(db, "users", adminUser.user.uid), {
                name: `${name} Admin`,
                email: adminEmail,
                role: "admin",
                orgId,
            });

            message.success(`Organization Created!
Admin Email: ${adminEmail}`);

            setName("");
            setAdminPassword("");
            setStep(1);

            if (isSuperAdmin) {
                return navigate("/superadmin");
            }

        } catch (error) {
            console.error(error);
            message.error("Failed to create organization");
        }
    };

    return (
        <Card
            title="Create Organization"
            style={{ width: 400, margin: "40px auto" }}
            extra={
                isSuperAdmin && (
                    <Button onClick={() => navigate("/superadmin")}>
                        ⬅ Back to List
                    </Button>
                )
            }
        >
            {step === 1 && (
                <>
                    <Input
                        placeholder="Organization Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />

                    <Button
                        type="primary"
                        block
                        style={{ marginTop: 10 }}
                        onClick={goNextStep}
                    >
                        Next
                    </Button>
                </>
            )}

            {step === 2 && (
                <>
                    <p><b>Organization:</b> {name}</p>

                    <Input value={adminEmail} disabled style={{ marginBottom: 10 }} />

                    <Input.Password
                        placeholder="Enter Admin Password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                    />

                    <Button
                        type="primary"
                        block
                        style={{ marginTop: 10 }}
                        onClick={createOrganization}
                    >
                        Create Organization & Admin
                    </Button>

                    <Button
                        block
                        style={{ marginTop: 10 }}
                        onClick={() => setStep(1)}
                    >
                        Back
                    </Button>
                </>
            )}
        </Card>
    );
}
