import {createContext, ReactNode, useState, useEffect} from "react";
import { useVideoUploadQueue } from "./videoUploadQueueHook.ts";
import Snackbar from "../components/snackbar/Snackbar.tsx";
import {useLocation} from "react-router-dom";

type VideoUploadQueueContextType = ReturnType<typeof useVideoUploadQueue>;

const VideoUploadQueueContext = createContext<VideoUploadQueueContextType | undefined>(undefined);

export function VideoUploadQueueProvider({
                                             token,
                                             children
                                         }: {
    token: string;
    children: ReactNode;
}) {
    const queueValue = useVideoUploadQueue(token);
    const { notUploadedCount, uploading, uploadAll } = queueValue;

    const [hideSnackbar, setHideSnackbar] = useState(false);

    const location = useLocation();

    useEffect(() => {
        setHideSnackbar(location.pathname.endsWith("/teleprompter"));
    }, [location.pathname]);

    return (
        <VideoUploadQueueContext.Provider value={queueValue}>
            {notUploadedCount > 0 && !hideSnackbar && (
                <div
                    style={{
                        position: "fixed",
                        right: 24,
                        bottom: 24,
                        zIndex: 2000,
                        maxWidth: 600,
                        width: "auto",
                        pointerEvents: "none",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end"
                    }}
                >
                    <div style={{ pointerEvents: "auto" }}>
                        <Snackbar
                            text={uploading
                                ? "Завантаження відео…"
                                : `У вас ${notUploadedCount} незавантажених відео`
                            }
                            mode="forever"
                            button1={{
                                text: uploading ? "Завантажуємо…" : "Завантажити всі",
                                onClick: uploadAll,
                            }}
                            button2={{
                                text: "Пізніше",
                                onClick: () => setHideSnackbar(true),
                            }}
                        />
                    </div>
                </div>
            )}
            {children}
        </VideoUploadQueueContext.Provider>
    );
}