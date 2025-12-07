import { useEffect, useState } from "react";
import { Table, Tag } from "antd";
import { db, auth } from "../firebase/config";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import dayjs from "dayjs";

export default function MyAttendance() {
    const [rows, setRows] = useState([]);

    useEffect(() => {
        const unsub = auth.onAuthStateChanged((user) => {
            if (!user) return;

            const q = query(
                collection(db, "attendance"),
                where("userId", "==", user.uid),
                orderBy("time", "desc") // latest first
            );

            const un = onSnapshot(q, (snap) => {
                const arr = [];
                snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
                setRows(arr);
            });

            return un;
        });

        return () => unsub();
    }, []);

    const columns = [
        {
            title: "Date",
            dataIndex: "date",
            render: (val) => val || "—",
        },
        {
            title: "Time",
            render: (row) =>
                row.time?.toDate
                    ? dayjs(row.time.toDate()).format("hh:mm A")
                    : "—",
        },
        {
            title: "Type",
            dataIndex: "type",
            render: (type) => (
                <Tag color={type === "in" ? "green" : "red"}>
                    {type === "in" ? "Check-In" : "Check-Out"}
                </Tag>
            ),
        },
        {
            title: "Worked (min)",
            dataIndex: "workedMinutes",
            render: (val) => val ?? "—",
        },
    ];

    return (
        <Table
            columns={columns}
            dataSource={rows}
            rowKey="id"
            pagination={{ pageSize: 20 }}
        />
    );
}
