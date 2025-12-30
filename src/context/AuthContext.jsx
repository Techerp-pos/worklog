import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [effectiveOrgId, setEffectiveOrgId] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("worklog_user");
        if (!storedUser) return;

        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        // 🔥 IMPERSONATION LOGIC
        if (parsedUser.role === "superadmin") {
            const overrideOrg = localStorage.getItem("worklog_admin_override_org");

            // override org becomes THE org
            setEffectiveOrgId(overrideOrg || null);
        } else {
            setEffectiveOrgId(parsedUser.orgId || null);
        }
    }, []);

    // 🔄 Allow super admin to switch org dynamically
    const switchOrg = (orgId) => {
        if (user?.role !== "superadmin") return;

        localStorage.setItem("worklog_admin_override_org", orgId);
        setEffectiveOrgId(orgId);
    };

    const logout = () => {
        localStorage.removeItem("worklog_user");
        localStorage.removeItem("worklog_admin_override_org");
        setUser(null);
        setEffectiveOrgId(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                orgId: effectiveOrgId, // 👈 ONLY ORG USED BY APP
                isSuperAdmin: user?.role === "superadmin",
                switchOrg, // 👈 optional UI
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
