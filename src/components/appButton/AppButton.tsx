import React from "react";
import "./AppButton.css";

export type AppButtonProps = {
    label: string;
    className?: string;
    onClick?: () => void;
    style?: React.CSSProperties;
    type?: "button" | "submit" | "reset";
    children?: React.ReactNode;
    variant?: "green" | "white" | "beige";
    disabled?: boolean;
};

export const AppButton = ({
  label,
  className = "",
  onClick,
  style,
  type = "button",
  children,
  variant = "white",
  disabled = false,
}: AppButtonProps) => (
    <button
        className={`app-btn ${variant === "green" ? "green-btn" : variant === "white" ? "white-btn" : "beige-btn"} ${className}`}
        onClick={onClick}
        style={style}
        type={type}
        disabled={disabled}
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

export const BeigeButton = (props: Omit<AppButtonProps, "variant">) => (
    <AppButton {...props} variant="beige" />
);
