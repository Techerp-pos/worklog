import { Card, Row, Col, Statistic, List, Tag, Button, Modal } from "antd";
import { useEffect, useState } from "react";
import { db, auth } from "../firebase/config";
import {
    collection,
    onSnapshot,
    collectionGroup,
    doc,
    getDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "../styles/iosDashboard.css"; // <-- IMPORTANT: include the CSS file

export default function AdminDashboard() {
    const [org, setOrg] = useState(null);
    const [users, setUsers] = useState({});

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
    const navigate = useNavigate();

    // ======================================================
    // LOGOUT WITH CONFIRMATION (iOS style)
    // ======================================================
    const askLogout = () => {
        Modal.confirm({
            title: "Confirm Logout",
            content: "Are you sure you want to logout?",
            okText: "Logout",
            cancelText: "Cancel",
            okButtonProps: { danger: true },
            centered: true,
            onOk: handleLogout,
        });
    };

    const handleLogout = async () => {
        await signOut(auth);

        localStorage.removeItem("worklog_user");
        localStorage.removeItem("pending_google_uid");
        localStorage.removeItem("pending_google_name");
        localStorage.removeItem("pending_google_email");
        localStorage.removeItem("worklog_admin_override_org");

        navigate("/", { replace: true });
    };

    // ======================================================
    // LOAD ORGANIZATION
    // ======================================================
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

    // ======================================================
    // LOAD USERS (employees)
    // ======================================================
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

    // ======================================================
    // LOAD TODAY'S ATTENDANCE
    // ======================================================
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

                if (checkIn && !checkOut) {
                    inside.push({
                        employeeName: att.employeeName,
                        checkIn: checkIn.format("hh:mm A"),
                    });
                }

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

                if (checkIn)
                    totalCheckInMinutes += checkIn.hour() * 60 + checkIn.minute();

                if (emp && att.durationMinutes) {
                    const required = (emp.shiftHoursPerDay ?? 0) * 60;
                    const worked = att.durationMinutes;

                    if (worked > required) overtime += worked - required;
                }
            });

            recent.sort(
                (a, b) => dayjs(b.time, "hh:mm A") - dayjs(a.time, "hh:mm A")
            );

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

            {/* ========== LOGOUT BUTTON ========== */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
                <Button className="ios-logout-btn" onClick={askLogout}>
                    Logout
                </Button>
            </div>

            {/* ========== ORGANIZATION HEADER ========== */}
            {org && (
                <Card className="dashboard-card ios-org-card">
                    <h2 style={{ color: "#ff3131", marginBottom: 8 }}>
                        Company: {org.name}
                    </h2>

                    <div><strong>Join Code:</strong> {org.joinCode}</div>
                    <div style={{ marginTop: 6 }}>
                        <strong>Created:</strong>{" "}
                        {org.createdAt?.seconds
                            ? new Date(org.createdAt.seconds * 1000).toDateString()
                            : ""}
                    </div>
                </Card>
            )}

            {/* ========== STAT CARDS ========== */}
            <Row gutter={[16, 16]} style={{ marginTop: 20 }}>

                <Col xs={12} md={6}>
                    <Card className="dashboard-card ios-stat-card">
                        <Statistic
                            title="Total Employees"
                            value={stats.totalEmployees}
                            prefix={<img src="https://img.icons8.com/glassmorphism/48/group-background-selected.png" style={{ width: 30 }} />}
                        />
                    </Card>
                </Col>

                <Col xs={12} md={6}>
                    <Card className="dashboard-card ios-stat-card">
                        <Statistic
                            title="Present Today"
                            value={stats.presentToday}
                            prefix={<img src="https://img.icons8.com/glassmorphism/48/worker-male.png" style={{ width: 30 }} />}
                        />
                    </Card>
                </Col>

                <Col xs={12} md={6}>
                    <Card className="dashboard-card ios-stat-card">
                        <Statistic
                            title="Inside Now"
                            value={stats.insideNow}
                            prefix={<img src="https://img.icons8.com/glassmorphism/48/share-2.png" style={{ width: 30 }} />}
                        />
                    </Card>
                </Col>

                <Col xs={12} md={6}>
                    <Card className="dashboard-card ios-stat-card">
                        <Statistic
                            title="Overtime Today"
                            value={stats.overtimeToday}
                            suffix="min"
                            prefix={<img src="https://img.icons8.com/glassmorphism/48/clock.png" style={{ width: 30 }} />}
                        />
                    </Card>
                </Col>

            </Row>

            {/* ========== INSIDE NOW ========== */}
            <Card className="dashboard-card ios-list-card" title="Employees Inside Now" style={{ marginTop: 25 }}>
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

            {/* ========== RECENT ACTIVITY ========== */}
            <Card className="dashboard-card ios-list-card" title="Recent Activity" style={{ marginTop: 25 }}>
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
