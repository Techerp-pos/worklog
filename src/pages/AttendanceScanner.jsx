// ======================================================
// SECURE DYNAMIC QR ATTENDANCE SCANNER
// ======================================================

import { useEffect, useRef, useState, useCallback } from "react";
import QrScanner from "qr-scanner";
import { Alert } from "antd";
import dayjs from "dayjs";
import CryptoJS from "crypto-js";

import { db } from "../firebase/config";
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
} from "firebase/firestore";

import "../styles/scanner.css";
import { calculateOvertimePay } from "../utils/calcOvertime";
import { updateMonthlySummary } from "../utils/updateMonthlySummary";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

// SAME SECRET AS MyQR.jsx
const SECRET = "WORKLOG_SECRET_KEY_123";

QrScanner.WORKER_PATH = "/qr-scanner-worker.min.js";

export default function AttendanceScanner() {

    const navigate = useNavigate();

    const videoRef = useRef(null);
    const beepRef = useRef(null);

    // UI states
    const [status, setStatus] = useState("loading");
    const [employee, setEmployee] = useState(null);
    const [scanType, setScanType] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    // Prevent rapid scanning
    const scanLock = useRef(false);

    // -----------------------------------------------------
    // PRELOAD SOUND
    // -----------------------------------------------------
    useEffect(() => {
        beepRef.current = new Audio("/sound/beep.mp3");
        beepRef.current.load();
    }, []);

    // -----------------------------------------------------
    // VERIFY TOKEN
    // -----------------------------------------------------
    const verifyToken = (token) => {
        try {
            const { uid, mode, ts, nonce, sig } = token;

            const now = Math.floor(Date.now() / 1000);

            // Expired (allow 20 sec window)
            if (now - ts > 20) {
                return { valid: false, reason: "QR expired" };
            }

            // Signature check
            const payload = `${uid}|${mode}|${ts}|${nonce}`;
            const expected = CryptoJS.HmacSHA256(payload, SECRET).toString();

            if (expected !== sig) {
                return { valid: false, reason: "Invalid signature" };
            }

            return { valid: true, uid, mode };

        } catch (err) {
            return { valid: false, reason: "Invalid QR format" };
        }
    };

    // -----------------------------------------------------
    // MAIN SCAN HANDLER
    // -----------------------------------------------------
    const handleQR = useCallback(async (data) => {

        if (scanLock.current) return;
        scanLock.current = true;
        setTimeout(() => (scanLock.current = false), 600);

        let token;
        try {
            token = JSON.parse(data);
        } catch {
            setErrorMsg("Invalid QR Code");
            setTimeout(() => setErrorMsg(null), 1500);
            return;
        }

        const validation = verifyToken(token);

        if (!validation.valid) {
            setErrorMsg(validation.reason);
            setTimeout(() => setErrorMsg(null), 1500);
            return;
        }

        const { uid, mode } = validation;

        // Load user info
        const snap = await getDoc(doc(db, "users", uid));
        if (!snap.exists()) {
            setErrorMsg("User not found");
            return;
        }

        const user = snap.data();
        setEmployee(user);

        // -----------------------
        // Attendance Logic
        // -----------------------
        const today = dayjs().format("YYYY-MM-DD");
        const ref = doc(db, "attendance", uid, "days", today);
        const todaySnap = await getDoc(ref);

        const record = todaySnap.exists() ? todaySnap.data() : {};

        // CHECK-IN
        if (mode === "check-in") {
            if (record.checkIn) setScanType("Already Checked-In");
            else {
                await setDoc(ref, {
                    uid,
                    employeeName: user.name,
                    date: today,
                    checkIn: serverTimestamp(),
                }, { merge: true });

                setScanType("Check-In");
            }
        }

        // CHECK-OUT
        else if (mode === "check-out") {
            if (record.checkOut) setScanType("Already Checked-Out");
            else {
                const nowDT = new Date();
                let workedMinutes = 0;
                let overtimeMinutes = 0;
                let overtimePay = 0;

                if (record.checkIn?.toDate) {
                    const checkInDT = record.checkIn.toDate();
                    workedMinutes = Math.floor((nowDT - checkInDT) / 60000);

                    const endTime = dayjs(today + " " + user.workEndTime);
                    const actual = dayjs(nowDT);

                    if (actual.isAfter(endTime)) {
                        overtimeMinutes = actual.diff(endTime, "minute");
                        const { overtimePay: ot } = calculateOvertimePay(
                            overtimeMinutes,
                            user.overtimeSlabs || []
                        );
                        overtimePay = ot;
                    }
                }

                await setDoc(ref, {
                    checkOut: serverTimestamp(),
                    workedMinutes,
                    overtimeMinutes,
                    overtimePay,
                }, { merge: true });

                await updateMonthlySummary(db, uid, {
                    date: today,
                    workedMinutes,
                    overtimeMinutes,
                    overtimePay,
                });

                setScanType("Check-Out");
            }
        }

        // Play sound
        beepRef.current.currentTime = 0;
        beepRef.current.play().catch(() => { });

        setStatus("success");
        setTimeout(() => setStatus("scanning"), 900);

    }, []);

    // -----------------------------------------------------
    // START CAMERA
    // -----------------------------------------------------
    useEffect(() => {
        if (!videoRef.current) return;

        const scanner = new QrScanner(videoRef.current, (res) => handleQR(res.data), {
            preferredCamera: "environment",
            highlightScanRegion: true,
            highlightCodeOutline: true,
        });

        scanner.start();
        setStatus("scanning");

        return () => scanner.stop();
    }, [handleQR]);

    // -----------------------------------------------------
    // UI
    // -----------------------------------------------------
    return (
        <div className="scanner-page">
            <div className="scanner-card">

                {/* 🔙 BACK BUTTON + TITLE */}
                <div className="scanner-header">
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <ArrowLeftOutlined />
                    </button>
                    <h2>Attendance Scanner</h2>
                </div>

                {errorMsg && <Alert type="error" message={errorMsg} showIcon />}

                <div className="camera-wrapper">
                    <video ref={videoRef} className="cameraView" />
                    {status !== "success" && <div className="scan-highlight"></div>}
                </div>

                {status === "success" && (
                    <div className="success-overlay">
                        <div className="success-box">
                            <div className="success-icon">✔</div>
                            <div className="success-message">
                                <h3>{scanType}</h3>
                                <p>{employee?.name}</p>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
