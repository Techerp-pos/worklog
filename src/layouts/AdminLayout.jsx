import { useState } from "react";
import { Layout, Menu } from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
    SettingOutlined,
    MobileOutlined,
} from "@ant-design/icons";
import "../styles/sidebar.css";

const { Sider, Content } = Layout;

export default function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(true);

    const selectedKey = location.pathname.replace("/admin/", "") || "";

    const items = [
        { key: "", icon: <img src="https://img.icons8.com/glassmorphism/48/doughnut-chart.png" style={{ width: 30 }} />, label: "Dashboard" },
        { key: "employees", icon: <img src="https://img.icons8.com/glassmorphism/48/gender-neutral-user.png" style={{ width: 30 }} />, label: "Employees" },
        { key: "salary-report", icon: <img src="https://img.icons8.com/glassmorphism/48/area-chart.png" style={{ width: 30 }} />, label: "Salary Report" },
        { key: "attendance", icon: <img src="https://img.icons8.com/glassmorphism/48/bar-chart.png" style={{ width: 30 }} />, label: "Attendance Overview" },
        { key: "scan", icon: <img src="https://img.icons8.com/glassmorphism/50/iris-scan.png" style={{ width: 30 }} />, label: "Attendance Scanner" },
    ];

    return (
        <div className="overlay-layout">

            {/* 🔥 FIXED HEADER (Toggle + Logo) */}
            <div className="sidebar-top-fixed">
                <button
                    className="sidebar-toggle-btn"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    ☰
                </button>

                <div className="fixed-logo">
                    <div className="logo-placeholder"><img src="/icons/icon-72.png"></img></div>
                    <h2 className="sidebar-title">WorkLog</h2>
                </div>
            </div>

            {/* 🔥 OVERLAY SIDEBAR */}
            <Sider
                width={240}
                className={`sage-sider overlay-sider ${collapsed ? "collapsed" : ""}`}
                collapsed={false}
                collapsible={false}
            >
                <Menu
                    mode="inline"
                    items={items}
                    selectedKeys={[selectedKey]}
                    defaultSelectedKeys={[""]}   // 👈 ALWAYS selects first item on first load
                    onClick={(e) => navigate(`/admin/${e.key}`)}
                    className="sage-menu"
                />


                <div className="sidebar-footer-container">
                    <Menu
                        mode="inline"
                        items={[
                            { key: "settings", icon: <SettingOutlined />, label: "Settings" },
                            { key: "integration", icon: <MobileOutlined />, label: "Integration" }
                        ]}
                        className="sage-menu bottom-menu"
                    />

                    <div className="sidebar-theme-toggle">
                        <div className="toggle-button active">Light</div>
                        <div className="toggle-button">Dark</div>
                    </div>
                </div>
            </Sider>

            {/* MAIN CONTENT */}
            <Content className="overlay-content">
                <Outlet />
            </Content>
        </div>
    );
}
