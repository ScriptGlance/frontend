import { useEffect, useState } from "react";

export function useComponentSize<T extends HTMLElement = HTMLElement>(ref: React.RefObject<T | null>) {
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!ref.current) return;
        setSize({
            width: ref.current.offsetWidth,
            height: ref.current.offsetHeight,
        });

        const observer = new window.ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.target === ref.current) {
                    const { width, height } = entry.target.getBoundingClientRect();
                    setSize({
                        width: Math.round(width),
                        height: Math.round(height),
                    });
                }
            }
        });
        observer.observe(ref.current);

        return () => {
            observer.disconnect();
        };
    }, [ref]);

    return size;
}
