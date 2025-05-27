import React from "react";
import logo from "../../assets/logo.png";
import "./Logo.css";

export interface LogoProps {
    onClick?: () => void;
    premium?: boolean;
}

const Logo: React.FC<LogoProps> = ({onClick, premium}) => (
    <div className="app-logo-block" onClick={onClick} style={onClick ? {cursor: "pointer"} : undefined}>
        <img src={logo} alt="Logo" className="logo"/>
        {premium && (
            <span className="logo-premium-label">Преміум</span>
        )}
    </div>
);

export default Logo;
