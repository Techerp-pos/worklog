import { db } from "../firebase/config";
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    updateDoc,
    doc,
    serverTimestamp,
    getDoc
} from "firebase/firestore";
import { Button, message } from "antd";
import { calculateAttendance } from "../utils/overtimeCalc";

export default function CheckButtons({ employeeId }) {

    // -------------------------------
    // CHECK-IN
    // -------------------------------
    const checkIn = async () => {
        // Prevent multiple open check-ins
        const q = query(
            collection(db, "attendance"),
            where("uid", "==", employeeId),
            where("checkOut", "==", null)
        );

        const snap = await getDocs(q);
        if (!snap.empty) {
            message.warning("You are already checked in!");
            return;
        }

        await addDoc(collection(db, "attendance"), {
            uid: employeeId,
            checkIn: serverTimestamp(),
            checkOut: null,
            date: new Date().toISOString().slice(0, 10)
        });

        message.success("Checked in successfully");
    };


    // -------------------------------
    // CHECK-OUT
    // -------------------------------
    const checkOut = async () => {
        const q = query(
            collection(db, "attendance"),
            where("uid", "==", employeeId),
            where("checkOut", "==", null)
        );

        const snap = await getDocs(q);
        if (snap.empty) {
            message.warning("You are not checked in!");
            return;
        }

        const entry = snap.docs[0];
        const entryData = entry.data();

        // Load employee profile
        const empRef = doc(db, "users", employeeId);
        const empSnap = await getDoc(empRef);
        const employee = empSnap.data();

        if (!employee) {
            message.error("Employee profile not found!");
            return;
        }

        // Ensure checkIn exists
        if (!entryData.checkIn) {
            message.error("Invalid attendance record");
            return;
        }

        // -------------------------------
        // PERFORM CALCULATION
        // -------------------------------
        const result = calculateAttendance(
            entryData.checkIn,                       // Firestore timestamp
            { toDate: () => new Date() },            // Actual checkout time
            employee                                  // Employee profile
        );

        await updateDoc(doc(db, "attendance", entry.id), {
            checkOut: new Date(),
            workedMinutes: result.workedMinutes,
            overtimeMinutes: result.overtimeMinutes,
            overtimePay: result.overtimePay,
            slabsUsed: result.slabsUsed
        });

        message.success("Checked out successfully");
    };


    return (
        <div>
            <Button type="primary" block onClick={checkIn}>
                Check In
            </Button>

            <Button danger block style={{ marginTop: 10 }} onClick={checkOut}>
                Check Out
            </Button>
        </div>
    );
}
