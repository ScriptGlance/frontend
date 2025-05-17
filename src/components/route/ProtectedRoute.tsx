import { Navigate } from 'react-router-dom';
import React, { JSX } from 'react';
import { useAuth } from "../../hooks/useAuth.ts";
import { Role } from "../../types/role.ts";

interface ProtectedRouteProps {
    children: JSX.Element;
    role: Role;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
    const { isAuthenticated } = useAuth();

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
