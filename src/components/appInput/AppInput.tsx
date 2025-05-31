import React from "react";
import "./AppInput.css";

export type AppInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
};

export const AppInput: React.FC<AppInputProps> = ({
  className = "",
  ...props
}) => {
  return (
    <input
      className={`app-input ${className}`}
      {...props}
    />
  );
};
