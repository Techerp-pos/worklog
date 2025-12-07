import { useState, useEffect } from "react";
import { Tabs, Form, Input, Button, message } from "antd";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider
} from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

export default function Login() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const provider = new GoogleAuthProvider();

    // ================================
    // ROLE-BASED REDIRECT
    // ================================
    const redirectUser = (u) => {
        if (u.role === "superadmin") return navigate("/superadmin");
        if (u.role === "admin")
            return u.orgId ? navigate("/admin") : navigate("/admin/setup");
        if (u.role === "employee")
            return u.orgId ? navigate("/employee") : navigate("/join-organization");
    };

    useEffect(() => {
        const raw = localStorage.getItem("worklog_user");
        if (!raw) return;

        try {
            const user = JSON.parse(raw);

            if (user.role === "superadmin") navigate("/superadmin");
            if (user.role === "admin") navigate(user.orgId ? "/admin" : "/admin/setup");
            if (user.role === "employee") navigate(user.orgId ? "/employee" : "/join-organization");

        } catch {
            localStorage.removeItem("worklog_user");
        }
    }, []);

    
    // ================================
    // GOOGLE SIGN-IN (POPUP) → WORKS
    // ================================
    const googleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const snap = await getDoc(doc(db, "users", user.uid));

            if (snap.exists()) {
                const userData = { uid: user.uid, ...snap.data() };
                localStorage.setItem("worklog_user", JSON.stringify(userData));
                return redirectUser(userData);
            }

            // NEW EMPLOYEE — must join org
            localStorage.setItem("pending_google_uid", user.uid);
            localStorage.setItem("pending_google_name", user.displayName || "");
            localStorage.setItem("pending_google_email", user.email || "");

            return navigate("/join-organization");

        } catch (err) {
            console.error(err);
            message.error("Google login failed");
        }
    };

    // ================================
    // EMAIL LOGIN
    // ================================
    const handleEmailLogin = async (v) => {
        try {
            setLoading(true);
            const res = await signInWithEmailAndPassword(auth, v.email, v.password);
            const snap = await getDoc(doc(db, "users", res.user.uid));

            if (!snap.exists()) return message.error("User not found");

            const userData = { uid: res.user.uid, ...snap.data() };
            localStorage.setItem("worklog_user", JSON.stringify(userData));
            redirectUser(userData);
        } catch (err) {
            message.error("Invalid credentials");
        } finally {
            setLoading(false);
        }
    };

    // ================================
    // EMAIL SIGN UP → employee
    // ================================
    const handleEmailSignup = async (v) => {
        try {
            setLoading(true);

            const res = await createUserWithEmailAndPassword(auth, v.email, v.password);

            // temporarily store details → join org
            localStorage.setItem("pending_google_uid", res.user.uid);
            localStorage.setItem("pending_google_name", v.name);
            localStorage.setItem("pending_google_email", v.email);

            message.success("Account created! Join your organization next.");
            navigate("/join-organization");

        } catch (err) {
            console.log(err);
            message.error("Signup failed");
        } finally {
            setLoading(false);
        }
    };

    // ================================
    // UI
    // ================================
    return (
        <div className="login-wrapper">

            <div className="mobile-header">WORKLOG</div>

            <div className="login-left">
                <div className="login-box">
                    <div style={{ display: "flex", justifyContent: "center", gap: 8, alignItems: 'center' }}>
                        <div className="logo-placeholder">W</div>
                        <h2 className="login-title">Welcome to WorkLog</h2>
                    </div>

                    <Tabs defaultActiveKey="login" centered>
                        {/* LOGIN TAB */}
                        <Tabs.TabPane tab="Log In" key="login">
                            <Button className="social-btn" icon={<img src="https://img.icons8.com/color/22/google-logo.png" alt="google" />} onClick={googleLogin}>
                                Continue with Google
                            </Button>

                            <div style={{ margin: "15px 0", opacity: 0.6, textAlign: "center" }}>
                                or login with email
                            </div>

                            <Form layout="vertical" onFinish={handleEmailLogin}>
                                <Form.Item name="email" label="Email" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>

                                <Form.Item name="password" label="Password" rules={[{ required: true }]}>
                                    <Input.Password />
                                </Form.Item>

                                <Button type="primary" htmlType="submit" block loading={loading}>
                                    Log In
                                </Button>
                            </Form>
                        </Tabs.TabPane>

                        {/* SIGNUP TAB */}
                        <Tabs.TabPane tab="Sign Up" key="signup">
                            <Button className="social-btn" icon={<img src="https://img.icons8.com/color/22/google-logo.png" alt="google" />} onClick={googleLogin}>
                                Sign up with Google
                            </Button>

                            <div style={{ margin: "15px 0", opacity: 0.6, textAlign: "center" }}>
                                or create account
                            </div>

                            <Form layout="vertical" onFinish={handleEmailSignup}>
                                <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>

                                <Form.Item name="email" label="Email" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>

                                <Form.Item name="password" label="Password" rules={[{ required: true }]}>
                                    <Input.Password />
                                </Form.Item>

                                <Button type="primary" htmlType="submit" block loading={loading}>
                                    Sign Up
                                </Button>
                            </Form>
                        </Tabs.TabPane>
                    </Tabs>
                </div>
            </div>

            <div className="login-right">
                <h1 className="worklog">WORKLOG</h1>
                <p className="brand-title">Every Attendance counts.</p>
                <p className="brand-subtitle">Every day you log matters.</p>
            </div>
        </div>
    );
}
