import { useState, useEffect, useCallback } from "react";
import presentationsRepository from "../api/repositories/presentationsRepository";
import { useAuth } from "./useAuth";
import { Role } from "../types/role";

export function usePresentationVideoFile(videoId: number | null) {
    const { getToken } = useAuth();
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchVideo = useCallback(async () => {
        if (!videoId) return;
        try {
            setLoading(true); setError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            const blob = await presentationsRepository.getVideoFile(token, videoId);
            const url = URL.createObjectURL(blob);
            setVideoUrl(url);
        } catch (e: any) {
            console.error(e);
            setError("Не вдалося завантажити відео");
        } finally {
            setLoading(false);
        }
    }, [getToken, videoId]);

    useEffect(() => {
        fetchVideo();
        return () => {
            if (videoUrl) URL.revokeObjectURL(videoUrl);
        };
    }, [fetchVideo]);

    return { videoUrl, loading, error };
}
