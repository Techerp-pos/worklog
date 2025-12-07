import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

export default function AuthGuard({ allowed }) {
    const [user, setUser] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const raw = localStorage.getItem("worklog_user");

        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                setUser(parsed);
                setLoaded(true);
                return;
            } catch {
                localStorage.removeItem("worklog_user");
            }
        }

        setLoaded(true);
    }, []);

    // ----------------------------
    // WAIT UNTIL USER IS LOADED
    // ----------------------------
    if (!loaded) return <div>Loading...</div>;

    // ----------------------------
    // IF NOT LOGGED IN
    // ----------------------------
    if (!user) {
        // allow join-organization for new users
        if (location.pathname === "/join-organization") return <Outlet />;

        return <Navigate to="/" replace />;
    }

    // -----------------------------------------
    // SPECIAL CASE: employee WITHOUT org → must join org
    // -----------------------------------------
    if (user.role === "employee" && !user.orgId) {
        if (location.pathname !== "/join-organization") {
            return <Navigate to="/join-organization" replace />;
        }
        return <Outlet />;
    }

    // -----------------------------------------
    // USER HAS ROLE BUT ACCESSING DISALLOWED ROUTES
    // -----------------------------------------
    if (!allowed.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    // All good → allow route
    return <Outlet />;
}
