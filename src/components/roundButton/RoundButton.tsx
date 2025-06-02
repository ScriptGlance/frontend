import React from "react";
import "./RoundButton.css";

export type RoundButtonProps = {
    icon: React.ReactNode;
    onClick?: () => void;
    className?: string;
    style?: React.CSSProperties;
    type?: "button" | "submit" | "reset";
    ariaLabel?: string;
};

export const RoundButton: React.FC<RoundButtonProps> = ({
                                                            icon,
                                                            onClick,
                                                            className = "",
                                                            style,
                                                            type = "button",
                                                            ariaLabel,
                                                        }) => (
    <button
        className={`round-button ${className}`}
        onClick={onClick}
        style={style}
        type={type}
        aria-label={ariaLabel}
    >
        {icon}
    </button>
);

export default RoundButton;