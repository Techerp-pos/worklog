import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import CryptoJS from "crypto-js";
import "../styles/MyQR.css";

const SECRET = "WORKLOG_SECRET_KEY_123"; // MUST match scanner

export default function MyQR() {
    const [qrImage, setQrImage] = useState(null);
    const [mode, setMode] = useState(null);
    const intervalRef = useRef(null);

    // --------------------------------------------
    // Read user instantly from localStorage
    // --------------------------------------------
    const getLocalUser = () => {
        try {
            const raw = localStorage.getItem("worklog_user");
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    };

    const user = getLocalUser();
    const uid = user?.uid;
    const orgId = user?.orgId;

    // --------------------------------------------
    // Auto-generate QR
    // --------------------------------------------
    useEffect(() => {
        if (!uid || !orgId || !mode) return;

        generateQR(uid, orgId, mode);

        intervalRef.current = setInterval(() => {
            generateQR(uid, orgId, mode);
        }, 15000);

        return () => clearInterval(intervalRef.current);
    }, [uid, orgId, mode]);

    // --------------------------------------------
    // Secure token generator
    // --------------------------------------------
    const generateToken = (uid, orgId, mode) => {
        const ts = Math.floor(Date.now() / 1000);
        const nonce = Math.random().toString(36).substring(2, 10);

        const payload = `${uid}|${orgId}|${mode}|${ts}|${nonce}`;
        const sig = CryptoJS.HmacSHA256(payload, SECRET).toString();

        return { uid, orgId, mode, ts, nonce, sig };
    };

    const generateQR = async (uid, orgId, mode) => {
        try {
            const token = generateToken(uid, orgId, mode);
            const json = JSON.stringify(token);

            const img = await QRCode.toDataURL(json, {
                width: 260,
                margin: 1,
            });

            setQrImage(img);
        } catch (err) {
            console.error("QR generation failed", err);
            setQrImage(null);
        }
    };

    // --------------------------------------------
    // UI
    // --------------------------------------------
    return (
        <div className="qr-wrapper">
            <h2 className="qr-title">My Attendance QR</h2>

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

            {mode && (
                <div className="qr-card">

                    {qrImage ? (
                        <img
                            src={qrImage}
                            alt="Attendance QR"
                            className="qr-img"
                        />
                    ) : (
                        <div className="qr-loading">
                            Generating QR…
                        </div>
                    )}

                    <p className="qr-mode">
                        Mode: <b>{mode.toUpperCase()}</b>
                    </p>

                    <p className="qr-company">
                        Company: <b>{orgId}</b>
                    </p>

                    <p className="refresh-note">
                        QR auto-refreshes every 15 seconds
                    </p>

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
