import { useState, useEffect, useMemo } from "react";
import { Card, Tag, Tooltip, DatePicker, Input, Select } from "antd";
import { SearchOutlined, UserOutlined, CalendarOutlined } from "@ant-design/icons";
import { db } from "../firebase/config";
import { collection, onSnapshot } from "firebase/firestore";
import dayjs from "dayjs";
import "../styles/attendanceCalendar.css";

export default function AdminAttendance() {
    const [employees, setEmployees] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [selectedMonth, setSelectedMonth] = useState(dayjs());
    const [search, setSearch] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("");

    const daysInMonth = selectedMonth.daysInMonth();
    const todayMonthStr = selectedMonth.format("YYYY-MM");

    // ---------------------------
    // 1. Load employees
    // ---------------------------
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), (snap) => {
            const arr = [];
            snap.forEach((d) => {
                const data = d.data();
                if (data.role === "employee") arr.push({ id: d.id, ...data });
            });
            setEmployees(arr);
        });

        return () => unsub();
    }, []);

    // ---------------------------
    // 2. Load attendance per employee
    // ---------------------------
    useEffect(() => {
        if (employees.length === 0) return;

        const unsubs = [];
        employees.forEach((emp) => {
            const ref = collection(db, "attendance", emp.id, "days");

            const unsub = onSnapshot(ref, (snap) => {
                const empDays = {};
                snap.forEach((d) => {
                    empDays[d.id] = d.data();
                });

                setAttendance((prev) => ({
                    ...prev,
                    [emp.id]: empDays,
                }));
            });

            unsubs.push(unsub);
        });

        return () => unsubs.forEach((u) => u());
    }, [employees]);

    // ---------------------------
    // 3. Department filter options
    // ---------------------------
    const departmentOptions = useMemo(() => {
        const set = new Set();
        employees.forEach((e) => {
            if (e.department) set.add(e.department);
            else if (e.position) set.add(e.position);
        });
        return [...set];
    }, [employees]);

    // ---------------------------
    // 4. Filtering employees
    // ---------------------------
    const filteredEmployees = employees.filter((e) => {
        const matchesName = e.name?.toLowerCase().includes(search.toLowerCase());
        const matchesDept = departmentFilter
            ? (e.department || e.position) === departmentFilter
            : true;
        return matchesName && matchesDept;
    });

    return (
        <Card className="attendance-container">

            {/* ======= PAGE TITLE ======= */}
            <div className="attendance-title">
                <CalendarOutlined style={{ marginRight: 10 }} />
                Attendance Calendar
            </div>

            {/* ======= FILTER BAR ======= */}
            <div className="attendance-filters">

                <Input
                    placeholder="Search employee"
                    prefix={<SearchOutlined />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="filter-input"
                />

                <Select
                    placeholder="Department"
                    allowClear
                    value={departmentFilter}
                    onChange={(v) => setDepartmentFilter(v)}
                    className="filter-input"
                    options={departmentOptions.map((d) => ({
                        label: d,
                        value: d
                    }))}
                />

                <DatePicker
                    picker="month"
                    value={selectedMonth}
                    className="filter-input"
                    onChange={(v) => setSelectedMonth(v)}
                />

            </div>

            {/* ======= GRID WRAPPER ======= */}
            <div className="attendance-grid-wrapper">

                <div className="attendance-grid">

                    {/* HEADER */}
                    <div className="grid-row header-row">
                        <div className="emp-col sticky-col header-emp">
                            Employee
                        </div>

                        {[...Array(daysInMonth)].map((_, i) => (
                            <div key={i} className="day-col header-day">
                                {i + 1}
                            </div>
                        ))}
                    </div>

                    {/* EMPLOYEE ROWS */}
                    {filteredEmployees.map((emp) => {
                        const empDays = attendance[emp.id] || {};

                        return (
                            <div key={emp.id} className="grid-row">

                                {/* LEFT EMPLOYEE CELL */}
                                <div className="emp-col sticky-col employee-box">
                                    <div className="avatar">
                                        <UserOutlined />
                                    </div>
                                    <div className="emp-info">
                                        <div className="emp-name">{emp.name}</div>
                                        <div className="emp-role">
                                            {emp.department || emp.position || "Employee"}
                                        </div>
                                    </div>
                                </div>

                                {/* DAY CELLS */}
                                {[...Array(daysInMonth)].map((_, i) => {
                                    const dateKey = selectedMonth.date(i + 1).format("YYYY-MM-DD");
                                    const rec = empDays[dateKey];

                                    if (!rec)
                                        return (
                                            <div key={i} className="day-col absent-day">
                                                <span className="absent-dot"></span>
                                            </div>
                                        );

                                    const worked = rec.durationFormatted || `${rec.workedMinutes}m`;
                                    const isLate =
                                        rec.checkIn?.toDate &&
                                        dayjs(rec.checkIn.toDate()).isAfter(dayjs("09:15 AM", "hh:mm A"));

                                    const hasOT = rec.overtimeMinutes > 0;

                                    return (
                                        <Tooltip
                                            key={i}
                                            title={
                                                <div>
                                                    <b>{emp.name}</b><br />
                                                    IN: {rec.checkIn?.toDate ? dayjs(rec.checkIn.toDate()).format("hh:mm A") : "—"}<br />
                                                    OUT: {rec.checkOut?.toDate ? dayjs(rec.checkOut.toDate()).format("hh:mm A") : "—"}<br />
                                                    Worked: {worked}<br />
                                                    OT: {rec.overtimeMinutes || 0} min
                                                </div>
                                            }
                                        >
                                            <div className="day-col present-day">
                                                <Tag
                                                    color={isLate ? "red" : "green"}
                                                    style={{ margin: 0, padding: "0 6px" }}
                                                >
                                                    {worked}
                                                </Tag>

                                                {hasOT && (
                                                    <Tag color="purple" style={{ marginTop: 4 }}>
                                                        +{rec.overtimeMinutes}m
                                                    </Tag>
                                                )}
                                            </div>
                                        </Tooltip>
                                    );
                                })}

                            </div>
                        );
                    })}

                </div>
            </div>
        </Card>
    );
}
