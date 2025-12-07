import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import FullPageLoader from "../components/FullPageLoader";

export default function AuthGuard({ allowed }) {
    const [user, setUser] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const location = useLocation();

    useEffect(() => {
        // Wait for Firebase auth to confirm login state
        const unsub = onAuthStateChanged(auth, () => {
            setTimeout(() => {
                const raw = localStorage.getItem("worklog_user");

                if (raw) {
                    try {
                        const parsed = JSON.parse(raw);
                        setUser(parsed);
                    } catch {
                        localStorage.removeItem("worklog_user");
                    }
                }

                setLoaded(true);
            }, 50); // small delay prevents race-condition redirect
        });

        return unsub;
    }, []);

    // --------------------------
    // LOADING PHASE
    // --------------------------
    if (!loaded) return <FullPageLoader />;


    // --------------------------
    // NOT LOGGED IN
    // --------------------------
    if (!user) {
        // allow join-organization
        if (location.pathname === "/join-organization") return <Outlet />;

        return <Navigate to="/" replace />;
    }

    // --------------------------
    // EMPLOYEE WITHOUT ORG → must join org
    // --------------------------
    if (user.role === "employee" && !user.orgId) {
        if (location.pathname !== "/join-organization") {
            return <Navigate to="/join-organization" replace />;
        }
        return <Outlet />;
    }

    // --------------------------
    // ADMIN WITHOUT ORG → must complete setup
    // --------------------------
    if (user.role === "admin" && !user.orgId) {
        if (location.pathname !== "/admin/setup") {
            return <Navigate to="/admin/setup" replace />;
        }
        return <Outlet />;
    }

    // --------------------------
    // ROLE NOT ALLOWED ON THIS ROUTE
    // --------------------------
    if (!allowed.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    // --------------------------
    // ALL GOOD → allow access
    // --------------------------
    return <Outlet />;
}
