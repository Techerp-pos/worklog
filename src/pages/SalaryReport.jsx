import { useEffect, useState, useMemo } from "react";
import {
    Card,
    DatePicker,
    Table,
    Select,
    Input,
    Button,
    Space,
    Skeleton
} from "antd";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { db } from "../firebase/config";
import {
    collection,
    onSnapshot,
    getDocs
} from "firebase/firestore";
import dayjs from "dayjs";
import { useAuth } from "../context/AuthContext";

const { MonthPicker } = DatePicker;
const { Search } = Input;

export default function SalaryReport() {
    const { orgId } = useAuth();

    const [employees, setEmployees] = useState([]);
    const [reports, setReports] = useState([]);
    const [month, setMonth] = useState(dayjs());
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const defaultFilters = {
        minAttendance: null,
        maxLeaves: null,
        otMin: null,
        sortBy: null,
    };

    const [filters, setFilters] = useState(defaultFilters);

    /* ---------------- EMPLOYEE SNAPSHOT ---------------- */
    useEffect(() => {
        if (!orgId) return;

        setEmployees([]);
        setReports([]);
        setLoading(true);

        const unsub = onSnapshot(collection(db, "users"), snap => {
            const list = [];

            snap.forEach(d => {
                const u = d.data();
                if (u.role === "employee" && u.orgId === orgId) {
                    list.push({ id: d.id, ...u });
                }
            });

            setEmployees(list);
        });

        return () => unsub();
    }, [orgId]);

    /* ---------------- LOAD REPORTS ---------------- */
    useEffect(() => {
        if (!employees.length || !month) {
            setLoading(false);
            return;
        }

        loadReports();
    }, [employees, month]);

    const loadReports = async () => {
        setLoading(true);

        const results = await Promise.all(
            employees.map(async emp => {
                const snap = await getDocs(
                    collection(db, "attendance", emp.id, "days")
                );

                const daysInMonth = month.daysInMonth();
                let attendanceDays = 0;
                let workedMinutes = 0;
                let otMinutes = 0;

                snap.forEach(d => {
                    const date = dayjs(d.id);
                    if (!date.isSame(month, "month")) return;

                    const att = d.data();
                    attendanceDays++;
                    workedMinutes += att.workedMinutes || 0;
                    otMinutes += att.overtimeMinutes || 0;
                });

                const allowedLeaves = emp.allowedLeavesPerMonth || 0;
                const actualLeaves = daysInMonth - attendanceDays;
                const excessLeaves = Math.max(0, actualLeaves - allowedLeaves);

                const perDay = emp.salaryBase / daysInMonth;
                const leaveDeduction = excessLeaves * perDay;

                const extraDays = Math.max(
                    0,
                    attendanceDays - (daysInMonth - allowedLeaves)
                );

                const extraBonus = extraDays * perDay;

                const minuteRate = emp.salaryBase / (daysInMonth * 10 * 60);
                const overtimePay = otMinutes * minuteRate;

                const finalSalary =
                    emp.salaryBase - leaveDeduction + extraBonus + overtimePay;

                return {
                    key: emp.id,
                    employeeName: emp.name,
                    attendanceDays,
                    actualLeaves,
                    excessLeaves,
                    workedHours: workedMinutes / 60,
                    overtimeMinutes: otMinutes,
                    overtimePay,
                    salaryBase: emp.salaryBase,
                    finalSalary,
                };
            })
        );

        setReports(results);
        setLoading(false);
    };

    /* ---------------- FILTER LOGIC ---------------- */
    const filteredReports = useMemo(() => {
        let data = [...reports];

        if (search) {
            data = data.filter(r =>
                r.employeeName.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (filters.minAttendance)
            data = data.filter(r => r.attendanceDays >= filters.minAttendance);

        if (filters.maxLeaves)
            data = data.filter(r => r.actualLeaves <= filters.maxLeaves);

        if (filters.otMin)
            data = data.filter(r => r.overtimeMinutes >= filters.otMin);

        if (filters.sortBy === "salary-high")
            data.sort((a, b) => b.finalSalary - a.finalSalary);

        if (filters.sortBy === "salary-low")
            data.sort((a, b) => a.finalSalary - b.finalSalary);

        if (filters.sortBy === "hours")
            data.sort((a, b) => b.workedHours - a.workedHours);

        return data;
    }, [reports, search, filters]);

    /* ---------------- PDF EXPORT ---------------- */
    const exportPDF = () => {
        const doc = new jsPDF("landscape");
        doc.text("Salary Report", 14, 20);

        autoTable(doc, {
            startY: 30,
            head: [[
                "Employee", "Attend", "Leaves",
                "OT Min", "OT Pay", "Base", "Final"
            ]],
            body: filteredReports.map(r => [
                r.employeeName,
                r.attendanceDays,
                r.actualLeaves,
                r.overtimeMinutes,
                r.overtimePay.toFixed(2),
                r.salaryBase.toFixed(2),
                r.finalSalary.toFixed(2),
            ]),
        });

        doc.save("salary_report.pdf");
    };

    const columns = [
        { title: "Employee", dataIndex: "employeeName" },
        { title: "Attend", dataIndex: "attendanceDays" },
        { title: "Leaves", dataIndex: "actualLeaves" },
        { title: "Hours", render: r => r.workedHours.toFixed(2) },
        { title: "OT Min", dataIndex: "overtimeMinutes" },
        { title: "OT Pay", render: r => r.overtimePay.toFixed(2) },
        { title: "Base", render: r => r.salaryBase.toFixed(2) },
        { title: "Final", render: r => r.finalSalary.toFixed(2) },
    ];

    return (
        <Card title="Salary Report" style={{ marginTop: 30 }}>
            <Space wrap style={{ marginBottom: 20 }}>
                <MonthPicker value={month} onChange={setMonth} />
                <Search placeholder="Search..." onChange={e => setSearch(e.target.value)} />
                <Button type="primary" onClick={exportPDF}>Export PDF</Button>
            </Space>

            {loading ? <Skeleton active /> : (
                <Table
                    columns={columns}
                    dataSource={filteredReports}
                    bordered
                    pagination={{ pageSize: 20 }}
                />
            )}
        </Card>
    );
}
