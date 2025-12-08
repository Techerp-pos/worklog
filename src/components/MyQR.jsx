import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import CryptoJS from "crypto-js";
import { auth } from "../firebase/config";
import "../styles/MyQR.css";

const SECRET = "WORKLOG_SECRET_KEY_123"; // change to a long random key

export default function MyQR() {
    const [qrImage, setQrImage] = useState("");
    const [mode, setMode] = useState(null); // no mode until user picks
    const [userId, setUserId] = useState(null);
    const intervalRef = useRef(null);

    useEffect(() => {
        const unsub = auth.onAuthStateChanged((user) => {
            if (!user) return;
            setUserId(user.uid);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!userId || !mode) return;

        // Start auto-refresh when mode selected
        generateQR(userId, mode);
        intervalRef.current = setInterval(() => {
            generateQR(userId, mode);
        }, 15000); // refresh every 15 seconds

        return () => clearInterval(intervalRef.current);
    }, [userId, mode]);

    // Create secure signed token
    const generateToken = (uid, mode) => {
        const ts = Math.floor(Date.now() / 1000);
        const nonce = Math.random().toString(36).substring(2, 10);

        const payload = `${uid}|${mode}|${ts}|${nonce}`;
        const sig = CryptoJS.HmacSHA256(payload, SECRET).toString();

        return { uid, mode, ts, nonce, sig };
    };

    const generateQR = async (uid, mode) => {
        const token = generateToken(uid, mode);
        const json = JSON.stringify(token);

        const img = await QRCode.toDataURL(json, {
            width: 260,
            margin: 1,
        });
        setQrImage(img);
    };

    return (
        <div className="qr-wrapper">

            {/* TITLE */}
            <h2 className="qr-title">My Attendance QR</h2>

            {/* If no mode selected yet → show two buttons */}
            {!mode && (
                <div className="mode-select">
                    <button
                        className="btn-checkin"
                        onClick={() => setMode("check-in")}
                    >
                        🟢 Generate Check-In QR
                    </button>

                    <button
                        className="btn-checkout"
                        onClick={() => setMode("check-out")}
                    >
                        🔴 Generate Check-Out QR
                    </button>
                </div>
            )}

            {/* After selecting mode → show QR */}
            {mode && (
                <div className="qr-card">
                    <img src={qrImage} alt="QR" className="qr-img" />

                    <p className="qr-mode">
                        Mode: <b>{mode.toUpperCase()}</b>
                    </p>

                    <p className="refresh-note">QR auto-refreshes every 15 seconds</p>

                    {/* Allow switching mode */}
                    <div className="mode-switch">
                        <button
                            className="btn-checkin-small"
                            onClick={() => setMode("check-in")}
                        >
                            Check-In
                        </button>

                        <button
                            className="btn-checkout-small"
                            onClick={() => setMode("check-out")}
                        >
                            Check-Out
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
