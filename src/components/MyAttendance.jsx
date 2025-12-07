import { useEffect, useState } from "react";
import { db, auth } from "../firebase/config";
import {
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
} from "firebase/firestore";
import dayjs from "dayjs";
import "../styles/MyAttendance.css";

export default function MyAttendance() {
    const [rows, setRows] = useState([]);

    useEffect(() => {
        const unsub = auth.onAuthStateChanged((user) => {
            if (!user) return;

            // 🔥 Fetch attendance from attendance/{userId}/days
            const q = query(
                collection(db, "attendance", user.uid, "days"),
                orderBy("date", "desc")
            );

            const un = onSnapshot(q, (snap) => {
                const arr = [];
                snap.forEach((d) => {
                    const data = d.data();
                    arr.push({
                        id: d.id,
                        date: data.date,
                        checkIn: data.checkIn,
                        checkOut: data.checkOut,
                        worked: data.workedMinutes ?? 0,
                        ot: data.overtimeMinutes ?? 0,
                    });
                });
                setRows(arr);
            });

            return un;
        });

        return () => unsub();
    }, []);

    return (
        <div className="ios-attendance-wrapper">

            {rows.length === 0 && (
                <p className="no-records">No attendance records found.</p>
            )}

            {rows.map((day) => (
                <div key={day.id} className="ios-attendance-card">

                    <div className="header-row">
                        <div className="date">
                            {dayjs(day.date).format("DD MMM YYYY")}
                        </div>

                        <div className="status-badge"
                            style={{
                                background: day.checkIn ? "#e5f9ed" : "#ffe5e5",
                                color: day.checkIn ? "#0f8a38" : "#c62828",
                            }}>
                            {day.checkIn ? "Present" : "Absent"}
                        </div>
                    </div>

                    <div className="time-row">
                        <div className="time-box">
                            <span className="label">Check-In</span>
                            <span className="value">
                                {day.checkIn?.toDate
                                    ? dayjs(day.checkIn.toDate()).format("hh:mm A")
                                    : "—"}
                            </span>
                        </div>

                        <div className="time-box">
                            <span className="label">Check-Out</span>
                            <span className="value">
                                {day.checkOut?.toDate
                                    ? dayjs(day.checkOut.toDate()).format("hh:mm A")
                                    : "—"}
                            </span>
                        </div>
                    </div>

                    <div className="footer-row">
                        <div className="worked">
                            Worked: <strong>{day.worked} min</strong>
                        </div>

                        {day.ot > 0 && (
                            <div className="ot-badge">+{day.ot}m OT</div>
                        )}
                    </div>

                </div>
            ))}

        </div>
    );
}
