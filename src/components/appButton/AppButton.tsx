import React from "react";
import "./AppButton.css";

export type AppButtonProps = {
    label: string;
    className?: string;
    onClick?: () => void;
    style?: React.CSSProperties;
    type?: "button" | "submit" | "reset";
    children?: React.ReactNode;
    variant?: "green" | "white";
};

export const AppButton = ({
    label,
    className = "",
    onClick,
    style,
    type = "button",
    children,
    variant = "white",
}: AppButtonProps) => (
    <button
        className={`app-btn ${variant === "green" ? "green-btn" : "white-btn"} ${className}`}
        onClick={onClick}
        style={style}
        type={type}
    >
        {label}
        {children}
    </button>
);

export const GreenButton = (props: Omit<AppButtonProps, "variant">) => (
    <AppButton {...props} variant="green" />
);

export const WhiteButton = (props: Omit<AppButtonProps, "variant">) => (
    <AppButton {...props} variant="white" />
);
