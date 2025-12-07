import { useState } from "react";
import { Layout, Menu, Button } from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
    SettingOutlined,
    MobileOutlined,
    MenuUnfoldOutlined, // Added for the toggle button when collapsed
    MenuFoldOutlined,   // Added for the toggle button when open
} from "@ant-design/icons";
import "../styles/sidebar.css"; // Ensure this CSS file exists and is linked

const { Sider, Header, Content } = Layout;

export default function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    // State to manage sidebar collapse status
    const [collapsed, setCollapsed] = useState(false);

    // Extract key from path: /admin/qr → "qr"
    const selectedKey = location.pathname.replace("/admin/", "") || "";

    const items = [
        { key: "", icon: <img src="https://img.icons8.com/glassmorphism/48/doughnut-chart.png" alt="dashboard" style={{ width: 30 }}></img>, label: "Dashboard" },
        { key: "employees", icon: <img src="https://img.icons8.com/glassmorphism/48/gender-neutral-user.png" alt="dashboard" style={{ width: 30 }}></img>, label: "Employees" },
        { key: "salary-report", icon: <img src="https://img.icons8.com/glassmorphism/48/area-chart.png" alt="dashboard" style={{ width: 30 }}></img>, label: "Salary Report" },
        { key: "attendance", icon: <img src="https://img.icons8.com/glassmorphism/48/bar-chart.png" alt="dashboard" style={{ width: 30 }}></img>, label: "Attendance Overview" },
        // { key: "scan", icon: <img src="https://img.icons8.com/glassmorphism/48/barcode-scanner.png" alt="dashboard" style={{ width: 30 }}></img>, label: "Scan" }
    ];

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Sider
                width={200}
                className="sage-sider"
                collapsible // Enable collapsible behavior
                collapsed={collapsed} // Bind the state
                onCollapse={(value) => setCollapsed(value)} // Update state when collapsed
                breakpoint="lg" // Automatically collapse when viewport width is less than 992px (large screens)
                collapsedWidth="0" // When collapsed on mobile screens, make it 0 width (completely hidden)
            >
                {/* Logo Section - use a conditional class name to hide text when collapsed */}
                <div className={`sidebar-logo ${collapsed ? 'collapsed' : ''}`}>
                    <div className="logo-placeholder">W</div>
                    <h2 className="sidebar-title">WorkLog</h2>
                </div>

                {/* Menu */}
                <Menu
                    mode="inline"
                    items={items}
                    selectedKeys={[selectedKey]}
                    onClick={(e) => navigate(`/admin/${e.key}`)}
                    className="sage-menu"
                />

                {/* Footer Settings - use conditional rendering/class name to hide when collapsed */}
                {!collapsed && (
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
                )}
            </Sider>

            <Layout>
                <Header className="sage-header">
                    {/* Add a button to manually toggle the sidebar visibility */}
                    <Button
                        type="text"
                        onClick={() => setCollapsed(!collapsed)}
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        className="menu-toggle-button" // Add a class for potential styling
                    />
                    <h3>{items.find((i) => i.key === selectedKey)?.label}</h3>
                </Header>

                <Content style={{ margin: 20 }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}
