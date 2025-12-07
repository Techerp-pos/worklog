import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { auth, db } from "../firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { v4 as uuid } from "uuid";
import "../styles/MyQR.css";

export default function MyQR() {
    const [qrImage, setQrImage] = useState("");
    const [mode, setMode] = useState("check-in");
    const [codes, setCodes] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = auth.onAuthStateChanged(async (user) => {
            if (!user) return;

            const uid = user.uid;
            const qrRef = doc(db, "qrCodes", uid);
            let snap = await getDoc(qrRef);

            let data;

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
            width: 250,
            margin: 1,
        });
        setQrImage(img);
    };

    const switchMode = () => {
        const newMode = mode === "check-in" ? "check-out" : "check-in";
        setMode(newMode);

        generateQR(newMode === "check-in" ? codes.codeCheckIn : codes.codeCheckOut);
    };

    if (loading) return <p>Loading QR…</p>;

    return (
        <div className="ios-card-qr">
            <h2>My Attendance QR</h2>
            <img src={qrImage} alt="QR" className="qr-img" />

            <p className="mode-text">
                <b>Mode:</b> {mode.toUpperCase()}
            </p>

            <button className="ios-btn-primary" onClick={switchMode}>
                Switch to {mode === "check-in" ? "Check-Out QR" : "Check-In QR"}
            </button>
        </div>
    );
}
