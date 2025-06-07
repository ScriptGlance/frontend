import { useState, useCallback } from "react";
import presentationsRepository, {StartVideoRecordingResponse} from "../api/repositories/presentationsRepository";
import { useAuth } from "./useAuth";
import { Role } from "../types/role";

export function usePresentationVideo() {
    const { getToken } = useAuth();
    const [shareLink, setShareLink] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deleteVideo = useCallback(async (videoId: number) => {
        try {
            setLoading(true);
            setError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            await presentationsRepository.deleteVideo(token, videoId);
            return true;
        } catch (e: any) {
            console.error(e);
            setError("Не вдалося видалити відео");
            return false;
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    const getVideoShareLink = useCallback(async (videoId: number) => {
        try {
            setLoading(true);
            setError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            const response = await presentationsRepository.getVideoShareLink(token, videoId);
            const shareCode = response.shareCode;
            const shareUrl = `${window.location.origin}/shared-video/${shareCode}`;
            setShareLink(shareUrl);
            return shareUrl;
        } catch (e: any) {
            console.error(e);
            setError("Не вдалося отримати посилання для поширення");
            return null;
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    return {
        shareLink,
        loading,
        error,
        deleteVideo,
        getVideoShareLink
    };
}

export function useSharedVideo(shareCode: string | null) {
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSharedVideo = useCallback(async () => {
        if (!shareCode) return;
        try {
            setLoading(true);
            setError(null);
            const blob = await presentationsRepository.getSharedVideo(shareCode);
            const url = URL.createObjectURL(blob);
            setVideoUrl(url);
        } catch (e: any) {
            console.error(e);
            setError("Не вдалося завантажити поширене відео");
        } finally {
            setLoading(false);
        }
    }, [shareCode]);

    const cleanupVideoUrl = useCallback(() => {
        if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
            setVideoUrl(null);
        }
    }, [videoUrl]);

    return {
        videoUrl,
        loading,
        error,
        fetchSharedVideo,
        cleanupVideoUrl
    };
}

export function useStartVideoRecording() {
    const { getToken } = useAuth();
    const [startSession, setStartSession] = useState<StartVideoRecordingResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const startRecording = useCallback(async (presentationId: number) => {
        setLoading(true);
        setError(null);
        try {
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            const response = await presentationsRepository.startVideoRecording(token, presentationId);
            setStartSession(response);
            return response;
        } catch (e: any) {
            setError("Не вдалося почати запис");
            return null;
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    return {
        startSession,
        loading,
        error,
        startRecording,
    };
}