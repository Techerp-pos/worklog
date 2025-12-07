import { useEffect, useState } from "react";
import {
    Card,
    DatePicker,
    Table,
    Select,
    Input,
    Button,
    Space,
    Skeleton,
    Grid
} from "antd";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { db } from "../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import dayjs from "dayjs";

const { MonthPicker } = DatePicker;
const { Search } = Input;
const { useBreakpoint } = Grid;

export default function SalaryReport() {
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    const [employees, setEmployees] = useState([]);
    const [month, setMonth] = useState(dayjs());
    const [reports, setReports] = useState([]);

    const [search, setSearch] = useState("");

    const defaultFilters = {
        minAttendance: null,
        maxLeaves: null,
        otMin: null,
        sortBy: null,
    };

    const [filters, setFilters] = useState(defaultFilters);
    const [prevFilters, setPrevFilters] = useState(defaultFilters);

    const [loading, setLoading] = useState(true);

    // Update filter with undo snapshot
    const updateFilters = (key, value) => {
        setPrevFilters(filters);
        setFilters((f) => ({ ...f, [key]: value }));
    };

    const resetFilters = () => {
        setPrevFilters(filters);
        setFilters(defaultFilters);
    };

    const undoFilters = () => {
        const temp = filters;
        setFilters(prevFilters);
        setPrevFilters(temp);
    };

    // Load employees
    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        const snap = await getDocs(collection(db, "users"));
        const arr = [];

        snap.forEach((d) => {
            const user = d.data();
            if (user.role === "employee") arr.push({ id: d.id, ...user });
        });

        setEmployees(arr);
    };

    // Load reports when employees or month changes
    useEffect(() => {
        if (employees.length > 0) loadAllReports();
    }, [employees, month]);

    // LOAD salary report for every employee
    const loadAllReports = async () => {
        setLoading(true);

        const results = [];

        for (let emp of employees) {
            const baseRef = collection(db, "attendance", emp.id, "days");
            const snap = await getDocs(baseRef);

            const daysInMonth = month.daysInMonth();
            let attendanceDays = 0;
            let totalWorkedMinutes = 0;
            let totalOT = 0;

            snap.forEach((d) => {
                const att = d.data();
                const day = d.id;
                const attDate = dayjs(day);

                if (!attDate.isSame(month, "month")) return;

                attendanceDays++;
                totalWorkedMinutes += att.workedMinutes || 0;
                totalOT += att.overtimeMinutes || 0;
            });

            const allowedLeaves = emp.allowedLeavesPerMonth || 0;
            const actualLeaves = daysInMonth - attendanceDays;
            const excessLeaves = Math.max(0, actualLeaves - allowedLeaves);

            const perDaySalary = emp.salaryBase / daysInMonth;
            const leaveDeduction = excessLeaves * perDaySalary;

            const extraDays = Math.max(
                0,
                attendanceDays - (daysInMonth - allowedLeaves)
            );
            const extraBonus = extraDays * perDaySalary;

            const hourRate = emp.salaryBase / (daysInMonth * 10);
            const minuteRate = hourRate / 60;
            const overtimePay = totalOT * minuteRate;

            const finalSalary =
                emp.salaryBase - leaveDeduction + extraBonus + overtimePay;

            results.push({
                key: emp.id,
                employeeName: emp.name,
                daysInMonth,
                attendanceDays,
                actualLeaves,
                allowedLeaves,
                excessLeaves,
                leaveDeduction: leaveDeduction.toFixed(3),
                extraWorkingDays: extraDays,
                extraBonus: extraBonus.toFixed(3),
                workedHours: (totalWorkedMinutes / 60).toFixed(2),
                overtimeMinutes: totalOT,
                overtimePay: overtimePay.toFixed(3),
                salaryBase: emp.salaryBase.toFixed(3),
                finalSalary: finalSalary.toFixed(3),
            });
        }

        setReports(results);
        setLoading(false);
    };

    // EXPORT PDF
    const exportPDF = () => {
        const doc = new jsPDF("landscape");
        doc.setFontSize(18);
        doc.text("Salary Report", 14, 20);

        autoTable(doc, {
            startY: 30,
            head: [
                [
                    "Employee",
                    "Days",
                    "Attend",
                    "Leaves",
                    "Excess",
                    "Deduction",
                    "Extra",
                    "Bonus",
                    "Hours",
                    "OT Min",
                    "OT Pay",
                    "Base",
                    "Final",
                ],
            ],
            body: reports.map((r) => [
                r.employeeName,
                r.daysInMonth,
                r.attendanceDays,
                r.actualLeaves,
                r.excessLeaves,
                r.leaveDeduction,
                r.extraWorkingDays,
                r.extraBonus,
                r.workedHours,
                r.overtimeMinutes,
                r.overtimePay,
                r.salaryBase,
                r.finalSalary,
            ]),
        });

        doc.save("salary_report.pdf");
    };

    // Columns
    const columns = [
        { title: "Employee", dataIndex: "employeeName", fixed: "left", width: 150 },
        { title: "Days", dataIndex: "daysInMonth" },
        { title: "Attend", dataIndex: "attendanceDays" },
        { title: "Leaves", dataIndex: "actualLeaves" },
        { title: "Excess", dataIndex: "excessLeaves" },
        { title: "Deduction", dataIndex: "leaveDeduction" },
        { title: "Extra Days", dataIndex: "extraWorkingDays" },
        { title: "Bonus", dataIndex: "extraBonus" },
        { title: "Hours", dataIndex: "workedHours" },
        { title: "OT Min", dataIndex: "overtimeMinutes" },
        { title: "OT Pay", dataIndex: "overtimePay" },
        { title: "Base Salary", dataIndex: "salaryBase" },
        { title: "Final Salary", dataIndex: "finalSalary" },
    ];

    // FILTERED DATA
    const filteredReports = reports
        .filter((r) =>
            r.employeeName.toLowerCase().includes(search.toLowerCase())
        )
        .filter((r) =>
            filters.minAttendance ? r.attendanceDays >= filters.minAttendance : true
        )
        .filter((r) =>
            filters.maxLeaves ? r.actualLeaves <= filters.maxLeaves : true
        )
        .filter((r) =>
            filters.otMin ? r.overtimeMinutes >= filters.otMin : true
        )
        .sort((a, b) => {
            if (filters.sortBy === "salary-high") return b.finalSalary - a.finalSalary;
            if (filters.sortBy === "salary-low") return a.finalSalary - b.finalSalary;
            if (filters.sortBy === "hours") return b.workedHours - a.workedHours;
            return 0;
        });

    return (
        <div style={{ padding: 20 }}>
            <Card title="Salary Report" style={{ borderRadius: 16 }}>

                {/* ---------------- MOBILE DROPDOWN FILTERS ---------------- */}
                {isMobile ? (
                    <Card
                        style={{
                            borderRadius: 14,
                            marginBottom: 15,
                            background: "rgba(255,255,255,0.6)",
                            backdropFilter: "blur(16px)",
                            border: "1px solid rgba(255,255,255,0.4)",
                        }}
                        bodyStyle={{ padding: 12 }}
                    >
                        <details>
                            <summary
                                style={{
                                    fontSize: 18,
                                    paddingBottom: 10,
                                    cursor: "pointer",
                                    fontWeight: 600,
                                }}
                            >
                                
                                <img src="https://img.icons8.com/glassmorphism/20/filter.png" alt="filter" /> Filters & Options
                            </summary>

                            <Space direction="vertical" style={{ width: "100%", marginTop: 12 }}>
                                <MonthPicker value={month} onChange={setMonth} style={{ width: "100%" }} />

                                <Search
                                    placeholder="Search employee..."
                                    allowClear
                                    onChange={(e) => setSearch(e.target.value)}
                                    style={{ width: "100%" }}
                                />

                                <Select
                                    placeholder="Min Attendance"
                                    value={filters.minAttendance}
                                    onChange={(v) => updateFilters("minAttendance", v)}
                                    options={[
                                        { label: "10+", value: 10 },
                                        { label: "15+", value: 15 },
                                        { label: "20+", value: 20 },
                                    ]}
                                    style={{ width: "100%" }}
                                />

                                <Select
                                    placeholder="Max Leaves"
                                    value={filters.maxLeaves}
                                    onChange={(v) => updateFilters("maxLeaves", v)}
                                    options={[
                                        { label: "≤ 5", value: 5 },
                                        { label: "≤ 3", value: 3 },
                                        { label: "≤ 1", value: 1 },
                                    ]}
                                    style={{ width: "100%" }}
                                />

                                <Select
                                    placeholder="OT Minutes ≥"
                                    value={filters.otMin}
                                    onChange={(v) => updateFilters("otMin", v)}
                                    options={[
                                        { label: "60+", value: 60 },
                                        { label: "120+", value: 120 },
                                        { label: "300+", value: 300 },
                                    ]}
                                    style={{ width: "100%" }}
                                />

                                <Select
                                    placeholder="Sort By"
                                    value={filters.sortBy}
                                    onChange={(v) => updateFilters("sortBy", v)}
                                    options={[
                                        { label: "Salary High → Low", value: "salary-high" },
                                        { label: "Salary Low → High", value: "salary-low" },
                                        { label: "Worked Hours", value: "hours" },
                                    ]}
                                    style={{ width: "100%" }}
                                />

                                <Button type="primary" onClick={exportPDF} block>
                                    📄 Export PDF
                                </Button>

                                <Button
                                    danger
                                    onClick={resetFilters}
                                    disabled={
                                        JSON.stringify(filters) === JSON.stringify(defaultFilters)
                                    }
                                    block
                                >
                                    Reset Filters
                                </Button>

                                <Button
                                    onClick={undoFilters}
                                    disabled={
                                        JSON.stringify(filters) === JSON.stringify(prevFilters)
                                    }
                                    block
                                >
                                    Undo
                                </Button>
                            </Space>
                        </details>
                    </Card>
                ) : (
                    /* ---------------- DESKTOP FILTERS ---------------- */
                    <Space wrap style={{ marginBottom: 20 }}>
                        <MonthPicker value={month} onChange={setMonth} />

                        <Search
                            placeholder="Search employee..."
                            allowClear
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ width: 200 }}
                        />

                        <Select
                            placeholder="Min Attendance"
                            value={filters.minAttendance}
                            onChange={(v) => updateFilters("minAttendance", v)}
                            options={[
                                { label: "10+", value: 10 },
                                { label: "15+", value: 15 },
                                { label: "20+", value: 20 },
                            ]}
                            style={{ width: 150 }}
                        />

                        <Select
                            placeholder="Max Leaves"
                            value={filters.maxLeaves}
                            onChange={(v) => updateFilters("maxLeaves", v)}
                            options={[
                                { label: "≤ 5", value: 5 },
                                { label: "≤ 3", value: 3 },
                                { label: "≤ 1", value: 1 },
                            ]}
                            style={{ width: 150 }}
                        />

                        <Select
                            placeholder="OT Minutes ≥"
                            value={filters.otMin}
                            onChange={(v) => updateFilters("otMin", v)}
                            options={[
                                { label: "60+", value: 60 },
                                { label: "120+", value: 120 },
                                { label: "300+", value: 300 },
                            ]}
                            style={{ width: 150 }}
                        />

                        <Select
                            placeholder="Sort By"
                            value={filters.sortBy}
                            onChange={(v) => updateFilters("sortBy", v)}
                            options={[
                                { label: "Salary High → Low", value: "salary-high" },
                                { label: "Salary Low → High", value: "salary-low" },
                                { label: "Worked Hours", value: "hours" },
                            ]}
                            style={{ width: 180 }}
                        />

                        <Button type="primary" onClick={exportPDF}>📄 Export PDF</Button>

                        <Button
                            danger
                            onClick={resetFilters}
                            disabled={
                                JSON.stringify(filters) === JSON.stringify(defaultFilters)
                            }
                        >
                            Reset Filters
                        </Button>

                        <Button
                            onClick={undoFilters}
                            disabled={JSON.stringify(filters) === JSON.stringify(prevFilters)}
                        >
                            Undo
                        </Button>
                    </Space>
                )}

                {/* ----------------------- TABLE OR LOADER ----------------------- */}
                {loading ? (
                    <Skeleton active paragraph={{ rows: 10 }} />
                ) : (
                    <div style={{ overflowX: "auto", borderRadius: 10 }}>
                        <Table
                            columns={columns}
                            dataSource={filteredReports}
                            size="small"
                            bordered
                            pagination={{ pageSize: 20 }}
                        />
                    </div>
                )}
            </Card>
        </div>
    );
}
