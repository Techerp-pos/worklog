import { useState } from "react";
import { Card, Input, Button, message } from "antd";
import { auth, db } from "../firebase/config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";

export default function AdminCreateEmployee({ orgId }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const createEmployee = async () => {
        if (!email || !password) return message.error("Enter all fields");

        const res = await createUserWithEmailAndPassword(auth, email, password);

        await setDoc(doc(db, "users", res.user.uid), {
            name,
            email,
            role: "employee",
            orgId
        });

        message.success("Employee Created");
        setName("");
        setEmail("");
        setPassword("");
    };

    return (
        <Card title="Create Employee" style={{ width: 400 }}>
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Email" style={{ marginTop: 10 }} value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input.Password placeholder="Password" style={{ marginTop: 10 }} value={password} onChange={(e) => setPassword(e.target.value)} />

            <Button type="primary" block style={{ marginTop: 10 }} onClick={createEmployee}>
                Create Employee
            </Button>
        </Card>
    );
}
