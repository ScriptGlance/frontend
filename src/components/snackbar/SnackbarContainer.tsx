import React from "react";
import Snackbar from "./Snackbar";
import "./Snackbar.css";

export type SnackbarItem = {
    key: string;
    text: string;
    mode?: "timeout" | "forever";
    timeout?: number;
    onClose?: () => void;
    timer?: string;
    button1?: {
        text: string;
        onClick: () => void;
        variant?: "primary" | "secondary";
    };
    button2?: {
        text: string;
        onClick: () => void;
        variant?: "primary" | "secondary";
    };
};

type Props = {
    snackbars: SnackbarItem[];
};

const SnackbarContainer: React.FC<Props> = ({ snackbars }) => (
    <div className="snackbar-stack-container">
        {snackbars.map((snackbar) => (
            <Snackbar {...snackbar} />
        ))}
    </div>
);

export default SnackbarContainer;
