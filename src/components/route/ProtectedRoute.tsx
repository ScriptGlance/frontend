import React from "react";
import { Navigate } from "react-router-dom";
import {Role} from "../../types/role.ts";
import {useAuth} from "../../hooks/useAuth.ts";

interface ProtectedRouteProps {
    children: React.ReactElement;
    role: Role;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
    const { isAuthenticated} = useAuth();

    if (!isAuthenticated(role)) {
        return <Navigate to={getLoginRoute(role)} replace />;
    }

    return children;
};

function getLoginRoute(role: Role) {
    switch (role) {
        case Role.Moderator:
            return "/moderator/login";
        case Role.Admin:
            return "/admin/login";
        default:
            return "/login";
    }
}

export default ProtectedRoute;
