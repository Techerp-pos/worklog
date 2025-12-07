// ======================================================
// ULTRA FAST SCANNER (NO DUPLICATES, NO REPEAT SCANS)
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

    // Caches
    const qrCache = useRef({});
    const userCache = useRef({});

    const beepRef = useRef(null);

    // UI states
    const [status, setStatus] = useState("loading");
    const [employee, setEmployee] = useState(null);
    const [scanType, setScanType] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    // Prevent rapid re-scanning
    const scanLock = useRef(false);
    const lastCodeRef = useRef(null);
    const lastTimeRef = useRef(0);

    // -----------------------------------------------------
    // PRELOAD QR CODES
    // -----------------------------------------------------
    useEffect(() => {
        (async () => {
            const snap = await getDocs(collection(db, "qrCodes"));
            const map = {};

            snap.forEach((d) => {
                const v = d.data();

                if (v.codeCheckIn)
                    map[v.codeCheckIn] = { uid: v.uid, type: "Check-In" };

                if (v.codeCheckOut)
                    map[v.codeCheckOut] = { uid: v.uid, type: "Check-Out" };
            });

            qrCache.current = map;
            setStatus("scanning");
        })();
    }, []);

    // -----------------------------------------------------
    // PRELOAD SOUND
    // -----------------------------------------------------
    useEffect(() => {
        beepRef.current = new Audio("/sound/beep.mp3");
        beepRef.current.load();
    }, []);

    // -----------------------------------------------------
    // MAIN SCAN HANDLER (FASTEST POSSIBLE)
    // -----------------------------------------------------
    const handleQR = useCallback(async (code) => {
        const now = Date.now();

        // HARD DEBOUNCE (NO DUPLICATE SCANS)
        if (scanLock.current) return;
        scanLock.current = true;
        setTimeout(() => (scanLock.current = false), 500);

        // Prevent SAME CODE within 1 second
        if (lastCodeRef.current === code && now - lastTimeRef.current < 1000) {
            return;
        }

        lastCodeRef.current = code;
        lastTimeRef.current = now;

        const hit = qrCache.current[code];
        if (!hit) {
            setErrorMsg("Invalid QR Code");
            setTimeout(() => setErrorMsg(null), 1400);
            return;
        }

        const { uid, type } = hit;

        // Load user (cached)
        let user = userCache.current[uid];
        if (!user) {
            const snap = await getDoc(doc(db, "users", uid));
            if (!snap.exists()) {
                setErrorMsg("User not found");
                return;
            }
            user = snap.data();
            userCache.current[uid] = user;
        }

        const today = dayjs().format("YYYY-MM-DD");
        const ref = doc(db, "attendance", uid, "days", today);

        const todaySnap = await getDoc(ref);
        const record = todaySnap.exists() ? todaySnap.data() : {};

        // -----------------------------------------------------
        // CHECK-IN
        // -----------------------------------------------------
        if (type === "Check-In") {
            if (record.checkIn) {
                // Already checked in → show message only
                setScanType("Already Checked-In");
            } else {
                await setDoc(
                    ref,
                    {
                        uid,
                        employeeName: user.name,
                        date: today,
                        checkIn: serverTimestamp(),
                    },
                    { merge: true }
                );
                setScanType("Check-In");
            }
        }

        // -----------------------------------------------------
        // CHECK-OUT
        // -----------------------------------------------------
        if (type === "Check-Out") {
            if (record.checkOut) {
                setScanType("Already Checked-Out");
            } else {
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

        // Update UI
        setEmployee(user);
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
        return () => scanner.stop();
    }, [handleQR]);

    // -----------------------------------------------------
    // UI
    // -----------------------------------------------------
    return (
        <div className="scanner-page">
            <div className="scanner-card">
                <h2>Attendance Scanner</h2>

                {errorMsg && <Alert type="error" message={errorMsg} showIcon />}

                {/* CAMERA ALWAYS RUNNING */}
                <div className="camera-wrapper">
                    <video ref={videoRef} className="cameraView" />

                    {/* scan highlight visible only when scanning */}
                    {status !== "success" && (
                        <div className="scan-highlight"></div>
                    )}
                </div>

                {/* SUCCESS OVERLAY (camera still visible behind) */}
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

                {/* <div className="success-overlay">
                    <div className="success-box">
                        <div className="success-icon">✔</div>
                        <div className="success-message">
                            <h3>{scanType} hi</h3>
                            <p>{employee?.name} its success</p>
                        </div>

                    </div>
                </div> */}
            </div>
        </div>
    );

}
