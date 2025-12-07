import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Alert } from "antd";
import dayjs from "dayjs";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    serverTimestamp,
    setDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { calculateOvertimePay } from "../utils/calcOvertime";
import { updateMonthlySummary } from "../utils/updateMonthlySummary";

QrScanner.WORKER_PATH = "/qr-scanner-worker.min.js";

export default function AttendanceScanner() {
    const videoRef = useRef(null);
    const scannerRef = useRef(null);
    const lock = useRef(false);

    const qrCache = useRef({});
    const userCache = useRef({});
    const beepRef = useRef(null);

    const [frozenFrame, setFrozenFrame] = useState(null);
    const [status, setStatus] = useState("loading");
    const [employee, setEmployee] = useState(null);
    const [scanType, setScanType] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    // --------------------------------------------------------
    // PRELOAD QR CODES
    // --------------------------------------------------------
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

    // --------------------------------------------------------
    // PRELOAD BEEP SOUND
    // --------------------------------------------------------
    useEffect(() => {
        beepRef.current = new Audio("/sound/beep.mp3");
        beepRef.current.load();
    }, []);

    // --------------------------------------------------------
    // START SCANNER ONCE
    // --------------------------------------------------------
    useEffect(() => {
        if (!videoRef.current) return;

        const scanner = new QrScanner(
            videoRef.current,
            (res) => onScan(res.data),
            {
                preferredCamera: "environment",
                highlightScanRegion: true,
            }
        );

        scannerRef.current = scanner;
        scanner.start().catch((err) => console.log("Camera error:", err));
        setStatus("scanning");

        return () => scanner.stop();
    }, []);

    // --------------------------------------------------------
    // HANDLE QR SCAN
    // --------------------------------------------------------
    const onScan = async (code) => {
        if (lock.current) return;
        lock.current = true;

        const scanner = scannerRef.current;
        if (scanner) scanner.stop();

        freezeCameraFrame();

        setStatus("verifying");

        const hit = qrCache.current[code];
        if (!hit) {
            setErrorMsg("Invalid QR Code");
            setTimeout(() => {
                cleanupAndRestart();
            }, 1200);
            return;
        }

        await processAttendance(hit);

        if (beepRef.current) {
            beepRef.current.currentTime = 0;
            beepRef.current.play().catch(() => { });
        }

        setStatus("success");

        setTimeout(() => {
            cleanupAndRestart();
        }, 800);
    };

    // --------------------------------------------------------
    // FREEZE CAMERA FRAME
    // --------------------------------------------------------
    const freezeCameraFrame = () => {
        const video = videoRef.current;
        if (!video) return;

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);

        setFrozenFrame(canvas.toDataURL("image/png"));
    };

    // --------------------------------------------------------
    // PROCESS ATTENDANCE
    // --------------------------------------------------------
    const processAttendance = async ({ uid, type }) => {
        let user = userCache.current[uid];
        if (!user) {
            const snap = await getDoc(doc(db, "users", uid));
            user = snap.data();
            userCache.current[uid] = user;
        }

        const today = dayjs().format("YYYY-MM-DD");
        const ref = doc(db, "attendance", uid, "days", today);

        const snap = await getDoc(ref);
        const rec = snap.exists() ? snap.data() : {};

        if (type === "Check-In") {
            await setDoc(
                ref,
                {
                    uid,
                    employeeName: user.name,
                    date: today,
                    checkIn: rec.checkIn || serverTimestamp(),
                },
                { merge: true }
            );
        }

        if (type === "Check-Out") {
            const now = new Date();
            let workedMinutes = 0;
            let overtimeMinutes = 0;
            let overtimePay = 0;

            if (rec.checkIn?.toDate) {
                const checkIn = rec.checkIn.toDate();
                workedMinutes = Math.floor((now - checkIn) / 1000 / 60);

                const shiftEnd = dayjs(today + " " + user.workEndTime);
                const actual = dayjs(now);

                if (actual.isAfter(shiftEnd)) {
                    overtimeMinutes = actual.diff(shiftEnd, "minute");

                    const { overtimePay: otResult } = calculateOvertimePay(
                        overtimeMinutes,
                        user.overtimeSlabs || []
                    );
                    overtimePay = otResult;
                }
            }

            await setDoc(
                ref,
                { checkOut: serverTimestamp(), workedMinutes, overtimeMinutes, overtimePay },
                { merge: true }
            );

            await updateMonthlySummary(db, uid, {
                date: today,
                workedMinutes,
                overtimeMinutes,
                overtimePay,
            });
        }

        setEmployee(user);
        setScanType(type);
    };

    // --------------------------------------------------------
    // CLEANUP & RESTART CAMERA
    // --------------------------------------------------------
    const cleanupAndRestart = () => {
        setFrozenFrame(null);
        setErrorMsg(null);
        lock.current = false;
        setStatus("scanning");

        scannerRef.current?.start();
    };

    return (
        <div className="scanner-page">
            <div className="scanner-card">
                <h2>Attendance Scanner</h2>

                {errorMsg && <Alert type="error" message={errorMsg} showIcon />}

                <div className="camera-frame">
                    {frozenFrame ? (
                        <img src={frozenFrame} className="frozen-frame" />
                    ) : (
                        <video ref={videoRef} className="cameraView" />
                    )}
                </div>

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
