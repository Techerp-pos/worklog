import { Card, Tabs } from "antd";
import MyQR from "../components/MyQR";
import MyAttendance from "../components/MyAttendance";
import MySalary from "../components/MySalary";

export default function EmployeeDashboard() {
    const items = [
        { key: "1", label: "My QR", children: <MyQR /> },
        { key: "2", label: "My Attendance", children: <MyAttendance /> },
        { key: "3", label: "My Salary", children: <MySalary /> },
    ];

    return (
        <Card title="Employee Dashboard">
            <Tabs items={items} />
        </Card>
    );
}
