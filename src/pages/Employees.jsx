import { useEffect, useState } from "react";
import { Table, Button, Modal, Input, Select } from "antd";
import { PlusOutlined, EditOutlined, SearchOutlined } from "@ant-design/icons";
import { db } from "../firebase/config";
// 1. Import query and where
import { collection, onSnapshot, query, where } from "firebase/firestore";
import EmployeeForm from "../components/EmployeeForm";
import "../styles/employee.css";
import { useAuth } from "../context/AuthContext";

export default function Employees() {
    const { orgId } = useAuth(); // 2. Get orgId from context
    const [data, setData] = useState([]);
    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [search, setSearch] = useState("");
    const [deptFilter, setDeptFilter] = useState("");

    useEffect(() => {
        // 3. Prevent running if orgId hasn't loaded yet
        if (!orgId) return;

        // 4. Filter by orgId and role directly in the Firestore query
        const q = query(
            collection(db, "users"),
            where("orgId", "==", orgId),
            where("role", "==", "employee")
        );

        const unsub = onSnapshot(q, (snap) => {
            const arr = [];
            snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
            setData(arr);
        });

        return () => unsub();
    }, [orgId]); // 5. Add orgId as a dependency

    const departments = [...new Set(data.map(d => d.department || d.position).filter(Boolean))];

    const filteredData = data.filter(e => {
        const matchName = e.name?.toLowerCase().includes(search.toLowerCase());
        const matchDept = deptFilter ? (e.department === deptFilter || e.position === deptFilter) : true;
        return matchName && matchDept;
    });

    const columns = [
        { title: "Name", dataIndex: "name", responsive: ["xs", "sm", "md", "lg"] },
        { title: "Email", dataIndex: "email", responsive: ["sm", "md", "lg"] },
        { title: "Salary", dataIndex: "salaryBase", responsive: ["md", "lg"] },
        {
            title: "Action",
            render: (record) => (
                <Button
                    icon={<EditOutlined />}
                    size="small"
                    type="default"
                    onClick={() => { setEditData(record); setOpen(true); }}
                />
            ),
            width: 80,
            align: "center"
        },
    ];

    return (
        <div className="employee-page">
            <div className="employee-header">
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => { setEditData(null); setOpen(true); }}
                    className="add-btn"
                >
                    Add
                </Button>

                <Input
                    placeholder="Search employee"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    prefix={<SearchOutlined />}
                    className="search-input"
                    allowClear
                />

                <Select
                    placeholder="Department"
                    allowClear
                    value={deptFilter}
                    onChange={(v) => setDeptFilter(v)}
                    className="dept-filter"
                    options={departments.map(d => ({ label: d, value: d }))}
                />
            </div>

            <div className="table-wrapper">
                <Table
                    columns={columns}
                    dataSource={filteredData}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: true }}
                />
            </div>

            <Modal
                open={open}
                onCancel={() => setOpen(false)}
                footer={false}
                destroyOnClose
            >
                <EmployeeForm data={editData} close={() => setOpen(false)} />
            </Modal>
        </div>
    );
}
