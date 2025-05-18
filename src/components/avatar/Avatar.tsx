import React from "react";
import defaultAvatar from "../../assets/default-avatar.svg";

export const Avatar: React.FC<{
    src?: string | null;
    alt?: string;
    size?: number;
    style?: React.CSSProperties;
}> = ({ src, alt, size = 40, style }) => (
    <img
        className="avatar"
        src={src || defaultAvatar}
        alt={alt || "Аватар"}
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
