import { useEffect, useState } from "react";
import { Card, DatePicker, Table, Select } from "antd";
import { db } from "../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import dayjs from "dayjs";

const { MonthPicker } = DatePicker;

export default function SalaryReport() {
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [month, setMonth] = useState(dayjs());
    const [report, setReport] = useState(null);

    // ------------------------------------------------------------------
    // LOAD ALL EMPLOYEES
    // ------------------------------------------------------------------
    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        const snap = await getDocs(collection(db, "users"));
        const arr = [];

        snap.forEach((d) => {
            const user = d.data();
            if (user.role === "employee") {
                arr.push({ id: d.id, ...user });
            }
        });

        setEmployees(arr);
    };

    // ------------------------------------------------------------------
    // LOAD MONTHLY REPORT
    // ------------------------------------------------------------------
    const loadReport = async () => {
        if (!selectedEmp) return;

        const emp = employees.find((e) => e.id === selectedEmp);
        if (!emp) return;

        const daysInMonth = month.daysInMonth();
        let attendanceData = [];

        // Loop through uid -> attendance -> days subcollections
        const baseRef = collection(db, "attendance", selectedEmp, "days");
        const snap = await getDocs(baseRef);

        snap.forEach((d) => {
            const att = d.data();
            const day = d.id; // YYYY-MM-DD

            const attDate = dayjs(day, "YYYY-MM-DD");
            if (attDate.isSame(month, "month")) {
                attendanceData.push({
                    ...att,
                    date: attDate,
                });
            }
        });

        let totalWorkedMinutes = 0;
        let totalOvertimeMinutes = 0;
        let overtimePay = 0;
        let attendanceDays = 0;

        attendanceData.forEach((att) => {
            totalWorkedMinutes += att.workedMinutes || 0;
            totalOvertimeMinutes += att.overtimeMinutes || 0;

            if (att.workedMinutes > 0) attendanceDays++;
        });

        // ---------------------------------------------------------
        // SALARY LOGIC
        // ---------------------------------------------------------

        // Fetch correct allowed leaves
        const allowedLeaves =
            emp.allowedLeavesPerMonth !== undefined
                ? emp.allowedLeavesPerMonth
                : 0;

        console.log(emp)
        const actualLeaves = daysInMonth - attendanceDays;
        const excessLeaves = Math.max(0, actualLeaves - allowedLeaves);

        // Day salary
        const perDaySalary = emp.salaryBase / daysInMonth;

        // Deduction for excess leaves
        const leaveDeduction = excessLeaves * perDaySalary;

        // Bonus for extra days worked
        const extraWorkingDays = Math.max(
            0,
            attendanceDays - (daysInMonth - allowedLeaves)
        );
        const extraBonus = extraWorkingDays * perDaySalary;

        // Hour and minute pay
        const hourRate = emp.salaryBase / (daysInMonth * 10); // 10 hr shift assumption
        const minuteRate = hourRate / 60;

        overtimePay = (totalOvertimeMinutes * minuteRate).toFixed(3);

        const finalSalary = (
            emp.salaryBase -
            leaveDeduction +
            extraBonus +
            Number(overtimePay)
        ).toFixed(3);

        // Build report
        setReport({
            employeeName: emp.name,
            daysInMonth,
            attendanceDays,
            actualLeaves,
            allowedLeaves,
            excessLeaves,
            leaveDeduction: leaveDeduction.toFixed(3),
            extraWorkingDays,
            extraBonus: extraBonus.toFixed(3),
            workedHours: (totalWorkedMinutes / 60).toFixed(2),
            overtimeMinutes: totalOvertimeMinutes,
            overtimePay,
            salaryBase: emp.salaryBase.toFixed(3),
            finalSalary,
        });
    };

    useEffect(() => {
        loadReport();
    }, [selectedEmp, month, employees]);

    // ------------------------------------------------------------------
    // TABLE COLUMNS
    // ------------------------------------------------------------------
    const columns = [
        { title: "Employee", dataIndex: "employeeName", width: 120, fixed: "left" },
        { title: "Days", dataIndex: "daysInMonth", width: 60 },
        { title: "Attend", dataIndex: "attendanceDays", width: 70 },
        { title: "Actual Leaves", dataIndex: "actualLeaves", width: 90 },
        { title: "Allowed Leaves", dataIndex: "allowedLeaves", width: 90 },
        { title: "Excess", dataIndex: "excessLeaves", width: 70 },
        { title: "Leave Deduction", dataIndex: "leaveDeduction", width: 120 },
        { title: "Extra Days", dataIndex: "extraWorkingDays", width: 80 },
        { title: "Extra Bonus", dataIndex: "extraBonus", width: 100 },
        { title: "Worked Hours", dataIndex: "workedHours", width: 90 },
        { title: "OT Min", dataIndex: "overtimeMinutes", width: 70 },
        { title: "OT Pay", dataIndex: "overtimePay", width: 90 },
        { title: "Base Salary", dataIndex: "salaryBase", width: 100 },
        { title: "Final Salary", dataIndex: "finalSalary", width: 110 },
    ];

    // ------------------------------------------------------------------
    // UI
    // ------------------------------------------------------------------

    return (
        <div style={{ padding: 20, margin: "auto" }}>
            <Card title="Salary Report" style={{ borderRadius: 12 }}>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
                    <Select
                        placeholder="Select Employee"
                        style={{ width: 250 }}
                        onChange={setSelectedEmp}
                        options={employees.map((e) => ({
                            label: e.name,
                            value: e.id,
                        }))}
                    />

                    <MonthPicker value={month} onChange={setMonth} style={{ width: 150 }} />
                </div>

                {report && (
                    <div style={{ overflowX: "auto", borderRadius: 8 }}>
                        <Table
                            columns={columns}
                            dataSource={[report]}
                            pagination={false}
                            rowKey="employeeName"
                            scroll={{ x: "max-content" }}
                            size="small"
                            bordered
                        />
                    </div>
                )}

            </Card>
        </div>
    );
}
