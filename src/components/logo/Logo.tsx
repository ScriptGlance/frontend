import React from "react";
import logo from "../../assets/logo.png";
import "./Logo.css";
import {Role} from "../../types/role.ts";

export interface LogoProps {
    onClick?: () => void;
    premium?: boolean;
    role?: Role;
}

const Logo: React.FC<LogoProps> = ({onClick, premium, role}) => (
    <div className="app-logo-block" onClick={onClick}>
        <img src={logo} alt="Logo" className="logo"/>
        {premium && (
            <span className="logo-label">Преміум</span>
        )}
        {role === Role.Moderator && (
            <span className="logo-label">Модератор</span>
        )}
        {role === Role.Admin && (
            <span className="logo-label">Адміністратор</span>
        )}
    </div>


);

export default Logo;
