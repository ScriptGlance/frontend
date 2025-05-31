import React from "react";
import "./AppButton.css";

export type ButtonVariant = "green" | "white" | "beige" | "gray" | "red";

export type AppButtonProps = {
    label: string;
    className?: string;
    onClick?: () => void;
    style?: React.CSSProperties;
    type?: "button" | "submit" | "reset";
    children?: React.ReactNode;
    variant?: ButtonVariant;
    disabled?: boolean;
};

function getButtonClassName(variant: ButtonVariant) {
    switch (variant) {
        case "green":
            return "green-btn";
        case "white":
            return "white-btn";
        case "gray":
            return "gray-btn";
        case "beige":
            return "beige-btn";
        case "red":
            return "red-btn";
        default:
            return "";
    }
}

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
        className={`app-btn ${getButtonClassName(variant)} ${className}`}
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

export const GrayButton = (props: Omit<AppButtonProps, "variant">) => (
    <AppButton {...props} variant="gray" />
);

export const BeigeButton = (props: Omit<AppButtonProps, "variant">) => (
    <AppButton {...props} variant="beige" />
);

export const RedButton = (props: Omit<AppButtonProps, "variant">) => (
    <AppButton {...props} variant="red" />
);
