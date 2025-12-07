import { Card, Row, Col, Statistic, List, Tag } from "antd";
import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import {
    collection,
    onSnapshot,
    collectionGroup,
    doc,
    getDoc,
} from "firebase/firestore";
import dayjs from "dayjs";

export default function AdminDashboard() {
    const [org, setOrg] = useState(null);
    const [users, setUsers] = useState({}); // uid → employee data

    const [stats, setStats] = useState({
        totalEmployees: 0,
        presentToday: 0,
        insideNow: 0,
        overtimeToday: 0,
        avgCheckIn: "--",
    });

    const [insideList, setInsideList] = useState([]);
    const [recentList, setRecentList] = useState([]);

    const today = dayjs().format("YYYY-MM-DD");

    // ========================= LOAD ORG =========================
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("worklog_user"));
        let orgId = user?.orgId;

        const override = localStorage.getItem("worklog_admin_override_org");
        if (override) orgId = override;

        if (!orgId) return;

        getDoc(doc(db, "organizations", orgId)).then((snap) => {
            if (snap.exists()) setOrg({ id: snap.id, ...snap.data() });
        });
    }, []);

    // ========================= LOAD USERS (EMPLOYEES) =========================
    useEffect(() => {
        onSnapshot(collection(db, "users"), (snap) => {
            let map = {};
            snap.forEach((d) => {
                const u = d.data();
                if (u.role === "employee") map[d.id] = u;
            });

            setUsers(map);
            setStats((s) => ({ ...s, totalEmployees: Object.keys(map).length }));
        });
    }, []);

    // ========================= LOAD TODAY ATTENDANCE =========================
    useEffect(() => {
        onSnapshot(collectionGroup(db, "days"), (snap) => {
            let present = 0;
            let inside = [];
            let recent = [];
            let overtime = 0;

            let totalCheckInMinutes = 0;

            snap.forEach((d) => {
                const att = d.data();
                if (d.id !== today) return;

                present++;

                const checkInDT = att.checkIn?.toDate?.();
                const checkOutDT = att.checkOut?.toDate?.();

                const checkIn = checkInDT ? dayjs(checkInDT) : null;
                const checkOut = checkOutDT ? dayjs(checkOutDT) : null;

                const emp = users[att.uid];

                // ================= INSIDE NOW =================
                if (checkIn && !checkOut) {
                    inside.push({
                        employeeName: att.employeeName,
                        checkIn: checkIn.format("hh:mm A"),
                    });
                }

                // ================= RECENT EVENTS =================
                if (checkIn) {
                    recent.push({
                        name: att.employeeName,
                        type: "Check-In",
                        time: checkIn.format("hh:mm A"),
                    });
                }

                if (checkOut) {
                    recent.push({
                        name: att.employeeName,
                        type: "Check-Out",
                        time: checkOut.format("hh:mm A"),
                    });
                }

                // ================= AVERAGE CHECK-IN =================
                if (checkIn)
                    totalCheckInMinutes += checkIn.hour() * 60 + checkIn.minute();

                // ================= OVERTIME CALC =================
                if (emp && att.durationMinutes) {
                    const required = (emp.shiftHoursPerDay ?? 0) * 60;
                    const worked = att.durationMinutes;

                    if (worked > required) {
                        overtime += worked - required;
                    }
                }
            });

            recent.sort((a, b) =>
                dayjs(b.time, "hh:mm A") - dayjs(a.time, "hh:mm A")
            );

            // ================= AVG CHECK-IN =================
            let avg = "--";
            if (present > 0 && totalCheckInMinutes > 0) {
                const avgMin = Math.round(totalCheckInMinutes / present);
                avg = dayjs().startOf("day").add(avgMin, "minutes").format("hh:mm A");
            }

            setStats((s) => ({
                ...s,
                presentToday: present,
                insideNow: inside.length,
                overtimeToday: overtime,
                avgCheckIn: avg,
            }));

            setInsideList(inside);
            setRecentList(recent.slice(0, 10));
        });
    }, [users]);

    return (
        <div className="dashboard-wrapper">

            {/* ================= ORGANIZATION HEADER ================= */}
            {org && (
                <Card
                    style={{
                        marginBottom: 25,
                        padding: "5px 20px",
                        borderLeft: "5px solid #ff8e31",
                    }}
                >
                    <h2 style={{ color: "#ff3131" }}>Company: {org.name}</h2>

                    <div>
                        <strong>Join Code:</strong> {org.joinCode}{" "}
                        <span style={{ color: "#999" }}>(give this to employees)</span>
                    </div>

                    <div>
                        <strong>Created:</strong>{" "}
                        {org.createdAt?.seconds
                            ? new Date(org.createdAt.seconds * 1000).toDateString()
                            : ""}
                    </div>
                </Card>
            )}

            {/* ================= STAT CARDS ================= */}
            <Row gutter={[16, 16]}>
                <Col xs={12} md={6}>
                    <Card>
                        <Statistic
                            title="Total Employees"
                            value={stats.totalEmployees}
                            prefix={
                                <img
                                    src="https://img.icons8.com/glassmorphism/48/group-background-selected.png"
                                    style={{ width: 30 }}
                                />
                            }
                        />
                    </Card>
                </Col>

                <Col xs={12} md={6}>
                    <Card>
                        <Statistic
                            title="Present Today"
                            value={stats.presentToday}
                            prefix={
                                <img
                                    src="https://img.icons8.com/glassmorphism/48/worker-male.png"
                                    style={{ width: 30 }}
                                />
                            }
                        />
                    </Card>
                </Col>

                <Col xs={12} md={6}>
                    <Card>
                        <Statistic
                            title="Inside Now"
                            value={stats.insideNow}
                            prefix={
                                <img
                                    src="https://img.icons8.com/glassmorphism/48/share-2.png"
                                    style={{ width: 30 }}
                                />
                            }
                        />
                    </Card>
                </Col>

                <Col xs={12} md={6}>
                    <Card>
                        <Statistic
                            title="Overtime Today"
                            value={stats.overtimeToday}
                            suffix="min"
                            prefix={
                                <img
                                    src="https://img.icons8.com/glassmorphism/48/clock.png"
                                    style={{ width: 30 }}
                                />
                            }
                        />
                    </Card>
                </Col>
            </Row>

            {/* ================= INSIDE NOW ================= */}
            <Card title="Employees Inside Now" style={{ marginTop: 20 }}>
                <List
                    dataSource={insideList}
                    renderItem={(item) => (
                        <List.Item>
                            <List.Item.Meta
                                title={item.employeeName}
                                description={`Check-In: ${item.checkIn}`}
                            />
                            <Tag color="blue">Inside</Tag>
                        </List.Item>
                    )}
                />
            </Card>

            {/* ================= RECENT ACTIVITY ================= */}
            <Card title="Recent Activity" style={{ marginTop: 20 }}>
                <List
                    dataSource={recentList}
                    renderItem={(item) => (
                        <List.Item>
                            <List.Item.Meta
                                title={
                                    <>
                                        {item.name}
                                        <Tag
                                            color={item.type === "Check-In" ? "green" : "red"}
                                            style={{ marginLeft: 10 }}
                                        >
                                            {item.type}
                                        </Tag>
                                    </>
                                }
                                description={`Time: ${item.time}`}
                            />
                        </List.Item>
                    )}
                />
            </Card>
        </div>
    );
}
