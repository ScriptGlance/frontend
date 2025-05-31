import React, { useEffect, useRef, useState } from "react";
import "./Snackbar.css";

type SnackbarMode = "forever" | "timeout";

type ButtonProps = {
    text: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
};

export type SnackbarProps = {
    text: string;
    timer?: string;
    button1?: ButtonProps;
    button2?: ButtonProps;
    mode?: SnackbarMode;
    timeout?: number;
    onClose?: () => void;
};

const ANIMATION_DURATION = 380;

const Snackbar: React.FC<SnackbarProps> = ({
                                               text,
                                               timer,
                                               button1,
                                               button2,
                                               mode = "forever",
                                               timeout = 3500,
                                               onClose,
                                           }) => {
    const [visible, setVisible] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        if (mode === "timeout" && onClose) {
            timeoutRef.current = setTimeout(() => setLeaving(true), timeout);
        }
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            cancelAnimationFrame(raf);
        };
    }, [mode, timeout, onClose]);

    useEffect(() => {
        if (!leaving) return;
        const t = setTimeout(() => {
            if (onClose) onClose();
        }, ANIMATION_DURATION);
        return () => clearTimeout(t);
    }, [leaving, onClose]);

    return (
        <div
            className={
                "snackbar-root" +
                (visible ? " snackbar-in" : "") +
                (leaving ? " snackbar-out" : "")
            }
        >
            <div className="snackbar-content">
                <div className="snackbar-row">
                    <span className="snackbar-text">{text}</span>
                    {timer && <span className="snackbar-timer">{timer}</span>}
                </div>
                {(button1 || button2) && (
                    <div className="snackbar-actions">
                        {button1 && (
                            <button className="snackbar-btn" onClick={button1.onClick}>
                                {button1.text}
                            </button>
                        )}
                        {button2 && (
                            <button className="snackbar-btn" onClick={button2.onClick}>
                                {button2.text}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Snackbar;
