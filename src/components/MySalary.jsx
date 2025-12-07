import { useEffect, useState } from "react";
import { Card, DatePicker, Skeleton } from "antd";
import { db, auth } from "../firebase/config";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import dayjs from "dayjs";
import "../styles/Salary.css";

const { MonthPicker } = DatePicker;

export default function MySalary() {
    const [month, setMonth] = useState(dayjs());
    const [salary, setSalary] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadMySalary = async () => {
        setLoading(true);
        const user = auth.currentUser;
        if (!user) return;

        const uid = user.uid;

        // Fetch user profile
        const snapUser = await getDoc(doc(db, "users", uid));
        const emp = snapUser.data();

        const baseSalary = emp.salaryBase || 0;
        const allowedLeaves = emp.allowedLeavesPerMonth || 0;

        // Fetch attendance
        const baseRef = collection(db, "attendance", uid, "days");
        const snap = await getDocs(baseRef);

        const daysInMonth = month.daysInMonth();
        let attendanceDays = 0;
        let workMin = 0;
        let totalOT = 0;

        snap.forEach((d) => {
            const att = d.data();
            const day = d.id;
            const attDate = dayjs(day);

            if (!attDate.isSame(month, "month")) return;

            attendanceDays++;
            workMin += att.workedMinutes || 0;
            totalOT += att.overtimeMinutes || 0;
        });

        // Salary Logic
        const actualLeaves = daysInMonth - attendanceDays;
        const excessLeaves = Math.max(0, actualLeaves - allowedLeaves);

        const perDay = baseSalary / daysInMonth;
        const leaveDeduction = excessLeaves * perDay;

        const extraDays = Math.max(0, attendanceDays - (daysInMonth - allowedLeaves));
        const extraBonus = extraDays * perDay;

        const hourRate = baseSalary / (daysInMonth * 10);
        const minuteRate = hourRate / 60;
        const overtimePay = totalOT * minuteRate;

        const finalSalary =
            baseSalary - leaveDeduction + extraBonus + overtimePay;

        setSalary({
            month: month.format("MMMM YYYY"),
            baseSalary,
            attendanceDays,
            daysInMonth,
            actualLeaves,
            allowedLeaves,
            excessLeaves,
            leaveDeduction: leaveDeduction.toFixed(3),
            extraDays,
            extraBonus: extraBonus.toFixed(3),
            workedHours: (workMin / 60).toFixed(2),
            overtimeMinutes: totalOT,
            overtimePay: overtimePay.toFixed(3),
            finalSalary: finalSalary.toFixed(3),
        });

        setLoading(false);
    };

    useEffect(() => {
        loadMySalary();
    }, [month]);

    return (
        <div className="ios-salary-page">

            <div className="ios-salary-header">
                <h2>My Salary</h2>
                <p>{salary?.month}</p>
            </div>

            <MonthPicker
                value={month}
                onChange={setMonth}
                className="ios-month-picker"
            />

            {loading ? (
                <Skeleton active paragraph={{ rows: 10 }} />
            ) : salary ? (
                <div className="ios-salary-card">

                    {/* TOTAL */}
                    <div className="ios-total-box">
                        <span>Total Salary</span>
                        <h1>{salary.finalSalary} OMR</h1>
                    </div>

                    {/* SECTIONS */}
                    <div className="ios-section">
                        <h3>Earnings</h3>

                        <div className="ios-row">
                            <span>Base Salary</span>
                            <b>{salary.baseSalary} OMR</b>
                        </div>

                        <div className="ios-row">
                            <span>Extra Bonus</span>
                            <b>{salary.extraBonus} OMR</b>
                        </div>

                        <div className="ios-row">
                            <span>Overtime Pay</span>
                            <b>{salary.overtimePay} OMR</b>
                        </div>
                    </div>

                    <div className="ios-section">
                        <h3>Deductions</h3>

                        <div className="ios-row">
                            <span>Excess Leaves</span>
                            <b>{salary.excessLeaves}</b>
                        </div>

                        <div className="ios-row">
                            <span>Leave Deduction</span>
                            <b>{salary.leaveDeduction} OMR</b>
                        </div>
                    </div>

                    <div className="ios-section">
                        <h3>Attendance Summary</h3>

                        <div className="ios-row">
                            <span>Present Days</span>
                            <b>{salary.attendanceDays}/{salary.daysInMonth}</b>
                        </div>

                        <div className="ios-row">
                            <span>Worked Hours</span>
                            <b>{salary.workedHours}</b>
                        </div>

                        <div className="ios-row">
                            <span>Overtime Minutes</span>
                            <b>{salary.overtimeMinutes}</b>
                        </div>

                        <div className="ios-row">
                            <span>Allowed Leaves</span>
                            <b>{salary.allowedLeaves}</b>
                        </div>

                        <div className="ios-row">
                            <span>Taken Leaves</span>
                            <b>{salary.actualLeaves}</b>
                        </div>

                    </div>
                </div>
            ) : (
                <p>No salary data available.</p>
            )}
        </div>
    );
}
