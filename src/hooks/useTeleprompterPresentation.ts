import {useState, useEffect, useCallback} from "react";
import teleprompterPresentationRepository, {
    ParticipantVideoCount,
} from "../api/repositories/teleprompterPresentationRepository";
import presentationsRepository, {
    PresentationActiveData,
} from "../api/repositories/presentationsRepository";
import {useAuth} from "./useAuth";
import {Role} from "../types/role";
import {DEFAULT_ERROR_MESSAGE} from "../contstants";

export function useActiveTeleprompterData(presentationId: number, autoFetch: boolean = true) {
    const {getToken} = useAuth();
    const [activeData, setActiveData] = useState<PresentationActiveData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");


            const data = await presentationsRepository.getActivePresentation(token, presentationId);
            setActiveData(data);
            //eslint-disable-next-line
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return;
            console.error("Error fetching active teleprompter data:", e);
            setError(e.message || DEFAULT_ERROR_MESSAGE);
        } finally {
            setLoading(false);
        }
    }, [getToken, presentationId]);

    useEffect(() => {
        if (!autoFetch) return;
        if (presentationId) {
            fetchData();
        } else {
            setLoading(false);
            setActiveData(null);
        }
    }, [fetchData, presentationId, autoFetch]);

    return {activeData, loading, error, refetch: fetchData};
}

export function useStartPresentation() {
    const {getToken} = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isStarted, setIsStarted] = useState(false);

    const startPresentation = useCallback(
        async (presentationId: number) => {
            try {
                setLoading(true);
                setError(null);
                setIsStarted(false);
                const token = getToken(Role.User);
                if (!token) {
                    throw new Error("Not authenticated");
                }
                await teleprompterPresentationRepository.startPresentation(token, presentationId);
                setIsStarted(true);
                return true;
                //eslint-disable-next-line
            } catch (e: any) {
                console.error("Error starting presentation:", e);
                setError(e.message || DEFAULT_ERROR_MESSAGE);
                setIsStarted(false);
                return false;
            } finally {
                setLoading(false);
            }
        },
        [getToken]
    );

    return {loading, error, isStarted, startPresentation};
}

export function useStopPresentation() {
    const {getToken} = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isStopped, setIsStopped] = useState(false);

    const stopPresentation = useCallback(
        async (presentationId: number) => {
            try {
                setLoading(true);
                setError(null);
                setIsStopped(false);
                const token = getToken(Role.User);
                if (!token) throw new Error("Not authenticated");
                await teleprompterPresentationRepository.stopPresentation(token, presentationId);
                setIsStopped(true);
                return true;
                //eslint-disable-next-line
            } catch (e: any) {
                console.error("Error stopping presentation:", e);
                setError(e.message || DEFAULT_ERROR_MESSAGE);
                setIsStopped(false);
                return false;
            } finally {
                setLoading(false);
            }
        },
        [getToken]
    );

    return {loading, error, isStopped, stopPresentation};
}

export function useSetTeleprompterRecordingMode() {
    const {getToken} = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const setRecordingMode = useCallback(
        async (presentationId: number, isActive: boolean) => {
            try {
                setLoading(true);
                setError(null);
                setIsSuccess(false);
                const token = getToken(Role.User);
                if (!token) throw new Error("Not authenticated");
                await teleprompterPresentationRepository.setRecordingMode(token, presentationId, isActive);
                setIsSuccess(true);
                return true;
                //eslint-disable-next-line
            } catch (e: any) {
                console.error("Error setting recording mode:", e);
                setError(e.message || DEFAULT_ERROR_MESSAGE);
                setIsSuccess(false);
                return false;
            } finally {
                setLoading(false);
            }
        },
        [getToken]
    );

    return {loading, error, isSuccess, setRecordingMode};
}

export function useParticipantsVideosLeft(presentationId: number, options?: {
    onSet?: (v: ParticipantVideoCount[]) => void
}) {
    const {getToken} = useAuth();
    const [videosLeft, setVideosLeft] = useState<ParticipantVideoCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchVideosLeft = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            const data = await teleprompterPresentationRepository.getParticipantsVideosLeft(token, presentationId);
            setVideosLeft(data);
            options?.onSet?.(data);
            //eslint-disable-next-line
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return;
            console.error("Error fetching participants videos left:", e);
            setError(e.message || DEFAULT_ERROR_MESSAGE);
        } finally {
            setLoading(false);
        }
    }, [getToken, presentationId]);

    useEffect(() => {
        if (presentationId) {
            fetchVideosLeft();
        } else {
            setLoading(false);
            setVideosLeft([]);
        }
    }, [fetchVideosLeft, presentationId]);

    useEffect(() => {
        options?.onSet?.(videosLeft);
    }, [videosLeft, options]);

    return {videosLeft, loading, error, refetch: fetchVideosLeft};
}

export function useSetActiveReader() {
    const {getToken} = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const setActiveReader = useCallback(
        async (presentationId: number, newReaderId: number) => {
            try {
                setLoading(true);
                setError(null);
                setIsSuccess(false);
                const token = getToken(Role.User);
                if (!token) throw new Error("Not authenticated");
                await teleprompterPresentationRepository.setActiveReader(token, presentationId, newReaderId);
                setIsSuccess(true);
                return true;
                //eslint-disable-next-line
            } catch (e: any) {
                console.error("Error setting active reader:", e);
                setError(e.message || DEFAULT_ERROR_MESSAGE);
                setIsSuccess(false);
                return false;
            } finally {
                setLoading(false);
            }
        },
        [getToken]
    );

    return {loading, error, isSuccess, setActiveReader};
}

export function useConfirmActiveReader() {
    const {getToken} = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const confirmActiveReader = useCallback(
        async (presentationId: number, isFromStartPosition: boolean) => {
            try {
                setLoading(true);
                setError(null);
                setIsSuccess(false);
                const token = getToken(Role.User);
                if (!token) throw new Error("Not authenticated");
                await teleprompterPresentationRepository.confirmActiveReader(token, presentationId, isFromStartPosition);
                setIsSuccess(true);
                return true;
                //eslint-disable-next-line
            } catch (e: any) {
                console.error("Error confirming active reader:", e);
                setError(e.message || DEFAULT_ERROR_MESSAGE);
                setIsSuccess(false);
                return false;
            } finally {
                setLoading(false);
            }
        },
        [getToken]
    );

    return {loading, error, isSuccess, confirmActiveReader};
}