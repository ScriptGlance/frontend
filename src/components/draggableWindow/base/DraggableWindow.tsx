import React, { useRef, useEffect, useState } from "react";
import {useComponentSize} from "../../../hooks/useComponentSize.ts";

interface DraggableWindowProps {
    children: React.ReactNode;
    initialPosition?: { x: number; y: number };
    width?: number | string;
    style?: React.CSSProperties;
    handleSelector?: string;
}

const DEFAULT_WIDTH = 400;


export const DraggableWindow: React.FC<DraggableWindowProps> = ({
                                                                    children,
                                                                    initialPosition = { x: 120, y: 120 },
                                                                    width = DEFAULT_WIDTH,
                                                                    style = {},
                                                                    handleSelector = ".draggable-window__handle",
                                                                }) => {
    const windowRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState(initialPosition);
    const [dragging, setDragging] = useState(false);
    const offset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    const windowSize = useComponentSize(windowRef);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragging) return;

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let newX = e.clientX - offset.current.x;
            let newY = e.clientY - offset.current.y;

            if (newX < 0) newX = 0;
            if (newY < 0) newY = 0;
            if (newX + windowSize.width > viewportWidth)
                newX = viewportWidth - windowSize.width;
            if (newY + windowSize.height > viewportHeight)
                newY = viewportHeight - windowSize.height;

            setPos({ x: newX, y: newY });
        };

        const handleMouseUp = () => setDragging(false);

        if (dragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [dragging, windowSize.width, windowSize.height]);

    useEffect(() => {
        if (!windowRef.current) return;
        const handle = windowRef.current.querySelector(handleSelector) as HTMLElement | null;
        if (!handle) return;

        const startDrag = (e: MouseEvent) => {
            if (windowRef.current) {
                const rect = windowRef.current.getBoundingClientRect();
                offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            }
            setDragging(true);
        };

        handle.addEventListener("mousedown", startDrag);
        return () => handle.removeEventListener("mousedown", startDrag);
    }, [handleSelector]);

    return (
        <div
            ref={windowRef}
            className="draggable-window"
            style={{
                left: pos.x,
                top: pos.y,
                width,
                position: "fixed",
                zIndex: 3000,
                ...style,
            }}
        >
            {children}
        </div>
    );
};
