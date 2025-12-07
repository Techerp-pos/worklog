import { useState } from "react";
import { auth } from "../firebase/config";
import MyQR from "../components/MyQR";
import MyAttendance from "../components/MyAttendance";
import MySalary from "../components/MySalary";
import "../styles/EmployeeDashboard.css";

export default function EmployeeDashboard() {
    const [tab, setTab] = useState("qr");

    const logout = async () => {
        await auth.signOut();
        localStorage.clear()
        window.location.href = "/";
    };

    return (
        <div className="ios-wrapper">

            {/* Header */}
            <div className="ios-header">
                <h1 className="ios-title">Employee Dashboard</h1>

                <button className="ios-logout-btn" onClick={logout}>
                    Logout
                </button>
            </div>

            {/* Segmented Control */}
            <div className="ios-segment">
                <div className="seg-indicator" data-tab={tab}></div>

                <button onClick={() => setTab("qr")} className="ios-btn">My QR</button>
                <button onClick={() => setTab("attendance")} className="ios-btn">Attendance</button>
                <button onClick={() => setTab("salary")} className="ios-btn">Salary</button>
            </div>

            {/* Page Content */}
            <div className="ios-content">
                {tab === "qr" && <MyQR />}
                {tab === "attendance" && <MyAttendance />}
                {tab === "salary" && <MySalary />}
            </div>
        </div>
    );
}
