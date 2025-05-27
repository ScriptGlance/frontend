import React from "react";


export const Avatar: React.FC<{
    src?: string | null;
    name?: string | null;
    surname?: string | null;
    alt?: string;
    size?: number;
    style?: React.CSSProperties;
    onClick?: () => void;
    className?: string;
    bgColor?: string;
}> = ({
          src,
          name,
          surname,
          alt,
          size = 40,
          style,
          onClick,
          className,
          bgColor,
      }) => {
    const initials = (name && surname)
        ? `${name.charAt(0)}${surname.charAt(0)}`
        : name
            ? name.charAt(0)
            : surname
                ? surname.charAt(0)
                : "?";

    if (!src) {
        return (
            <div
                className={className ? className : "avatar"}
                onClick={onClick}
                style={{
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    backgroundColor: bgColor || "#5e7158",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    fontSize: size * 0.4,
                    color: "#ffffff",
                    userSelect: "none",
                    ...style,
                }}
                aria-label={alt || "Аватар"}
            >
                {initials.toUpperCase()}
            </div>
        );
    }

    return (
        <img
            className={className ? className : "avatar"}
            src={src}
            alt={alt || "Аватар"}
            onClick={onClick}
            style={{
                width: size,
                height: size,
                borderRadius: "50%",
                objectFit: "cover",
                background: bgColor || "#5e7158",
                ...style,
            }}
        />
    );
};