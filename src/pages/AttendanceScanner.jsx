// ======================================================
// SECURE DYNAMIC QR ATTENDANCE SCANNER (FINAL VERSION WITH OVERNIGHT SHIFT SUPPORT)
// ======================================================

import { useEffect, useRef, useState, useCallback } from "react";
import QrScanner from "qr-scanner";
import { Alert } from "antd";
import dayjs from "dayjs";
import CryptoJS from "crypto-js";

import { db } from "../firebase/config";
import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp,
} from "firebase/firestore";

import "../styles/scanner.css";
import { calculateOvertimePay } from "../utils/calcOvertime";
import { updateMonthlySummary } from "../utils/updateMonthlySummary";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import { getUserCached } from "../utils/getUserCached";

const SECRET = "WORKLOG_SECRET_KEY_123";

QrScanner.WORKER_PATH = "/qr-scanner-worker.min.js";

export default function AttendanceScanner() {

    const navigate = useNavigate();

    const videoRef = useRef(null);
    const beepRef = useRef(null);

    const [paused, setPaused] = useState(false);
    const [status, setStatus] = useState("loading");

    const [employee, setEmployee] = useState(null);
    const [scanType, setScanType] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        beepRef.current = new Audio("/sound/beep.mp3");
        beepRef.current.load();
    }, []);

    const verifyToken = (token) => {
        try {
            const { uid, mode, ts, nonce, sig } = token;
            const now = Math.floor(Date.now() / 1000);

            if (now - ts > 20) return { valid: false, reason: "QR expired" };

            const payload = `${uid}|${mode}|${ts}|${nonce}`;
            const expected = CryptoJS.HmacSHA256(payload, SECRET).toString();

            if (expected !== sig) return { valid: false, reason: "Invalid signature" };

            return { valid: true, uid, mode };

        } catch {
            return { valid: false, reason: "Invalid QR format" };
        }
    };

    const handleQR = useCallback(async (data) => {

        if (paused) return;
        setPaused(true);

        let token;

        try {
            token = JSON.parse(data);
        } catch {
            setErrorMsg("Invalid QR Code");
            beepRef.current.play();
            setTimeout(() => setErrorMsg(null), 1500);
            setPaused(false);
            return;
        }

        const validation = verifyToken(token);
        if (!validation.valid) {
            setErrorMsg(validation.reason);
            beepRef.current.play();
            setTimeout(() => setErrorMsg(null), 1500);
            setPaused(false);
            return;
        }

        const { uid, mode } = validation;

        const user = await getUserCached(uid);
        if (!user) {
            setErrorMsg("User not found");
            setPaused(false);
            return;
        }

        setEmployee(user);

        const today = dayjs().format("YYYY-MM-DD");
        const ref = doc(db, "attendance", uid, "days", today);
        const todaySnap = await getDoc(ref);
        const record = todaySnap.exists() ? todaySnap.data() : {};

        // -----------------------------------------------------
        // CHECK-IN
        // -----------------------------------------------------
        if (mode === "check-in") {

            if (record.checkIn) {
                setScanType("Already Checked-In");
            } else {
                await setDoc(ref, {
                    uid,
                    employeeName: user.name,
                    date: today,
                    checkIn: serverTimestamp(),
                }, { merge: true });

                setScanType("Check-In");
            }

            beepRef.current.play();
        }

        // -----------------------------------------------------
        // CHECK-OUT  (OVERNIGHT SUPPORT ADDED)
        // -----------------------------------------------------
        if (mode === "check-out") {

            if (!record.checkIn) {
                setErrorMsg("Cannot Check-Out before Check-In");
                beepRef.current.play();
                setTimeout(() => setErrorMsg(null), 1500);
                setPaused(false);
                return;
            }

            // Convert times
            let checkInDT = record.checkIn.toDate();
            let checkOutDT = new Date();

            // OVERNIGHT SHIFT
            if (checkOutDT < checkInDT) {
                checkOutDT.setDate(checkOutDT.getDate() + 1);
            }

            // Calculate worked minutes
            const workedMinutes = Math.floor((checkOutDT - checkInDT) / 60000);

            // EARLY CHECKOUT PREVENTION
            const start = dayjs(today + " " + user.workStartTime);
            const end = dayjs(today + " " + user.workEndTime);
            const requiredMinutes = end.diff(start, "minute");

            if (workedMinutes < requiredMinutes) {
                setErrorMsg(
                    `Too early to Check-Out. Worked ${(workedMinutes / 60).toFixed(1)}h / Required ${(requiredMinutes / 60).toFixed(1)}h`
                );

                beepRef.current.play();
                setTimeout(() => setErrorMsg(null), 1800);
                setPaused(false);
                return;
            }

            if (record.checkOut) {
                setScanType("Already Checked-Out");
                beepRef.current.play();
            } else {

                // OT logic
                let overtimeMinutes = 0;
                let overtimePay = 0;

                const actual = dayjs(checkOutDT);
                if (actual.isAfter(end)) {
                    overtimeMinutes = actual.diff(end, "minute");
                    overtimePay = calculateOvertimePay(
                        overtimeMinutes,
                        user.overtimeSlabs || []
                    ).overtimePay;
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
                beepRef.current.play();
            }
        }

        setStatus("success");

        setTimeout(() => {
            setStatus("scanning");
            setPaused(false);
        }, 1500);

    }, [paused]);

    useEffect(() => {
        if (!videoRef.current) return;

        const scanner = new QrScanner(
            videoRef.current,
            (res) => !paused && handleQR(res.data),
            {
                preferredCamera: "environment",
                highlightScanRegion: true,
                highlightCodeOutline: false,
            }
        );

        scanner.start();
        setStatus("scanning");

        return () => scanner.stop();
    }, [handleQR, paused]);

    return (
        <div className="scanner-page">
            <div className="scanner-card">

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
