import { useEffect, useState } from 'react';
import presentationsRepository, {
    GetPresentationsParams,
    PresentationItem,
    PresentationStats
} from "../api/repositories/presentationsRepository.ts";
import {useAuth} from "./useAuth.ts";
import {Role} from "../types/role.ts";

export const useDashboardData = (queryParams: GetPresentationsParams) => {
    const { getToken } = useAuth();
    const [stats, setStats] = useState<PresentationStats | null>(null);
    const [presentations, setPresentations] = useState<PresentationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const token = getToken(Role.User);
                if (!token) throw new Error("Not authenticated");

                const stats = await presentationsRepository.getStats(token);
                setStats(stats);

                const list = await presentationsRepository.getPresentations(token, queryParams, controller.signal);
                setPresentations(list);
            } catch (e: any) {
                if (e.name === 'CanceledError' || e.name === 'AbortError') return;
                setError(e.message || "Unknown error");
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Abort on cleanup
        return () => controller.abort();
    }, [queryParams, getToken]);

    return { stats, presentations, loading, error };
};
