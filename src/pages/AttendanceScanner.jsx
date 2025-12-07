// ======================================================
// FAST SCANNER WITH DAILY + MONTHLY UPDATE + OT ENGINE
// ======================================================

import { useEffect, useRef, useState, useCallback } from "react";
import QrScanner from "qr-scanner";
import { Alert } from "antd";
import dayjs from "dayjs";

import { db } from "../firebase/config";
import {
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
} from "firebase/firestore";

import "../styles/scanner.css";
import { calculateOvertimePay } from "../utils/calcOvertime";
import { updateMonthlySummary } from "../utils/updateMonthlySummary";

QrScanner.WORKER_PATH = "/qr-scanner-worker.min.js";

export default function AttendanceScanner() {
    const videoRef = useRef(null);
    const qrCache = useRef({});
    const userCache = useRef({});
    const beepRef = useRef(null);

    const [status, setStatus] = useState("loading");
    const [employee, setEmployee] = useState(null);
    const [scanType, setScanType] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    const lock = useRef(false);
    const lastScan = useRef(0);

    // ----------------------------------------------------
    // PRELOAD QR CODES
    // ----------------------------------------------------
    useEffect(() => {
        getDocs(collection(db, "qrCodes")).then((snap) => {
            const map = {};
            snap.forEach((d) => {
                const v = d.data();
                if (v.codeCheckIn) map[v.codeCheckIn] = { uid: v.uid, type: "Check-In" };
                if (v.codeCheckOut) map[v.codeCheckOut] = { uid: v.uid, type: "Check-Out" };
            });
            qrCache.current = map;
        });
    }, []);

    // ----------------------------------------------------
    // PRELOAD SOUND
    // ----------------------------------------------------
    useEffect(() => {
        beepRef.current = new Audio("/sound/beep.mp3");
        beepRef.current.load();
    }, []);

    // ----------------------------------------------------
    // HANDLE SCAN RESULT
    // ----------------------------------------------------
    const handleQR = useCallback(async (code) => {
        if (lock.current) return;
        lock.current = true;

        setTimeout(() => (lock.current = false), 600);

        if (Date.now() - lastScan.current < 300) return;
        lastScan.current = Date.now();

        setStatus("verifying");

        const hit = qrCache.current[code];
        if (!hit) {
            setErrorMsg("Invalid QR Code");
            setStatus("scanning");
            setTimeout(() => setErrorMsg(null), 1500);
            return;
        }

        const { uid, type } = hit;

        // Load employee (cached)
        let user = userCache.current[uid];
        if (!user) {
            const snap = await getDoc(doc(db, "users", uid));
            user = snap.data();
            userCache.current[uid] = user;
        }

        const today = dayjs().format("YYYY-MM-DD");
        const ref = doc(db, "attendance", uid, "days", today);

        const todaySnap = await getDoc(ref);
        const record = todaySnap.exists() ? todaySnap.data() : {};

        // ----------------------------------------------------
        // CHECK-IN
        // ----------------------------------------------------
        if (type === "Check-In") {
            await setDoc(
                ref,
                {
                    uid,
                    employeeName: user.name,
                    date: today,
                    checkIn: record.checkIn || serverTimestamp(),
                },
                { merge: true }
            );
        }

        // ----------------------------------------------------
        // CHECK-OUT
        // ----------------------------------------------------
        if (type === "Check-Out") {
            const now = new Date();

            let workedMinutes = 0;
            let overtimeMinutes = 0;
            let overtimePay = 0;

            if (record.checkIn?.toDate) {
                const checkInDT = record.checkIn.toDate();
                workedMinutes = Math.floor((now - checkInDT) / 1000 / 60);

                // Shift end time
                const endTime = dayjs(today + " " + user.workEndTime, "YYYY-MM-DD HH:mm");
                const actual = dayjs(now);

                if (actual.isAfter(endTime)) {
                    overtimeMinutes = actual.diff(endTime, "minute");

                    // OT Slab Engine
                    const { overtimePay: otPay } = calculateOvertimePay(
                        overtimeMinutes,
                        user.overtimeSlabs || []
                    );

                    overtimePay = otPay;
                }
            }

            await setDoc(
                ref,
                {
                    checkOut: serverTimestamp(),
                    workedMinutes,
                    overtimeMinutes,
                    overtimePay,
                },
                { merge: true }
            );

            // UPDATE MONTH SUMMARY
            await updateMonthlySummary(db, uid, {
                date: today,
                workedMinutes,
                overtimeMinutes,
                overtimePay,
            });
        }

        // Play sound
        if (beepRef.current) {
            beepRef.current.currentTime = 0;
            beepRef.current.play().catch(() => { });
        }

        setEmployee(user);
        setScanType(type);
        setStatus("success");

        setTimeout(() => setStatus("scanning"), 900);
    }, []);

    // ----------------------------------------------------
    // START SCANNER
    // ----------------------------------------------------
    useEffect(() => {
        if (!videoRef.current) return;

        const scanner = new QrScanner(
            videoRef.current,
            (result) => handleQR(result.data),
            {
                preferredCamera: "environment",
                highlightScanRegion: true,
                highlightCodeOutline: true,
            }
        );

        scanner.start();
        setStatus("scanning");

        return () => scanner.stop();
    }, [handleQR]);

    // ----------------------------------------------------
    // UI
    // ----------------------------------------------------
    return (
        <div className="scanner-page">
            <div className="scanner-card">
                <h2>Attendance Scanner</h2>

                {errorMsg && <Alert type="error" message={errorMsg} showIcon />}

                {/* Camera */}
                <div
                    className="camera-frame"
                    style={{ display: status === "success" ? "none" : "block" }}
                >
                    <video ref={videoRef} className="cameraView" />
                    <div className="scan-highlight"></div>
                </div>

                {/* SUCCESS */}
                {status === "success" && (
                    <div className="success-box">
                        <div className="success-icon">✔</div>
                        <h3>{scanType} Recorded</h3>
                        <p>{employee?.name}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
