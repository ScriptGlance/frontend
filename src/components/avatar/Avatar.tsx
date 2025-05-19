import React from "react";
import defaultAvatar from "../../assets/default-avatar.svg";


export const Avatar: React.FC<{
    src?: string | null;
    alt?: string;
    size?: number;
    style?: React.CSSProperties;
    onClick?: () => void;
    className?: string;
}> = ({ src, alt, size = 40, style, onClick, className }) => (
    <img
        className={className ? className : "avatar"}
        src={src || defaultAvatar}
        alt={alt || "Аватар"}
        onClick={onClick}
        style={{
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover",
            background: "#D3DDD7",
            ...style,
        }}
    />
);
