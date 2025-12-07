import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { auth, db } from "../firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { v4 as uuid } from "uuid";
import { Card, Button, Typography } from "antd";

const { Title } = Typography;

export default function MyQR() {
    const [qrImage, setQrImage] = useState("");
    const [mode, setMode] = useState("check-in"); // or "check-out"
    const [codes, setCodes] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = auth.onAuthStateChanged(async (user) => {
            if (!user) return;

            const uid = user.uid;
            const qrRef = doc(db, "qrCodes", uid);
            let snap = await getDoc(qrRef);

            let data;

            // If QR doesn't exist, generate new codes
            if (!snap.exists()) {
                data = {
                    uid,
                    codeCheckIn: uuid(),
                    codeCheckOut: uuid(),
                };
                await setDoc(qrRef, data);
            } else {
                data = snap.data();
            }

            setCodes(data);
            generateQR(data.codeCheckIn);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const generateQR = async (code) => {
        const img = await QRCode.toDataURL(code, {
            width: 260,
            margin: 1,
        });
        setQrImage(img);
    };

    const switchMode = () => {
        if (!codes) return;

        const newMode = mode === "check-in" ? "check-out" : "check-in";
        setMode(newMode);

        generateQR(
            newMode === "check-in"
                ? codes.codeCheckIn
                : codes.codeCheckOut
        );
    };

    if (loading) return <p>Loading QR...</p>;

    return (
        <Card style={{ textAlign: "center", width: 340, margin: "auto" }}>
            <Title level={4}>My Attendance QR</Title>

            <img
                src={qrImage}
                alt="Employee QR"
                style={{ width: 240, borderRadius: 10, marginBottom: 10 }}
            />

            <p style={{ marginBottom: 20 }}>
                <strong>Current Mode:</strong> {mode.toUpperCase()}
            </p>

            <Button type="primary" onClick={switchMode}>
                Switch to {mode === "check-in" ? "Check-Out QR" : "Check-In QR"}
            </Button>
        </Card>
    );
}
