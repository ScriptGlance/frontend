import { useCallback, useEffect, useState } from "react";
import { openDB } from 'idb';
import PresentationsRepository from '../api/repositories/presentationsRepository';
import { VideoChunk } from "../api/repositories/videoStorageRepository.ts";
import fixWebmDuration from "webm-duration-fix";
import {useLocation} from "react-router-dom";

export type UploadStatus = "pending" | "uploading" | "success" | "error";

export interface UploadingVideo {
    videoId: string;
    meta: Omit<VideoChunk, "chunkOrder" | "data" | "isFirstChunk">;
    status: UploadStatus;
    error?: string;
}
export function useVideoUploadQueue(token: string) {
    const [queue, setQueue] = useState<UploadingVideo[]>([]);
    const [uploading, setUploading] = useState(false);

    const loadNotUploadedVideos = useCallback(async () => {
        const db = await openDB('VideoChunksDB', 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('videoChunks')) {
                    const store = db.createObjectStore('videoChunks', { keyPath: ['videoId', 'chunkOrder'] });
                    store.createIndex('byVideoId', 'videoId', { unique: false });
                }
                if (!db.objectStoreNames.contains('videoMetadata')) {
                    db.createObjectStore('videoMetadata', { keyPath: 'videoId' });
                }
            }
        });
        const tx = db.transaction('videoChunks', 'readonly');
        const store = tx.objectStore('videoChunks');

        const metaByVideoId: Record<string, Omit<VideoChunk, "chunkOrder" | "data" | "isFirstChunk">> = {};
        let cursor = await store.openCursor();
        while (cursor) {
            const chunk = cursor.value as VideoChunk;
            if (!metaByVideoId[chunk.videoId]) {
                metaByVideoId[chunk.videoId] = chunk;
            }
            cursor = await cursor.continue();
        }
        await tx.done;

        const videos: UploadingVideo[] = Object.values(metaByVideoId).map(meta => ({
            videoId: meta.videoId,
            meta,
            status: "pending"
        }));
        setQueue(videos);
    }, []);

    const uploadOne = useCallback(async (uploading: UploadingVideo) => {
        try {
            setQueue(q =>
                q.map(item =>
                    item.videoId === uploading.videoId
                        ? { ...item, status: "uploading", error: undefined }
                        : item
                )
            );

            const db = await openDB('VideoChunksDB', 1);
            const tx = db.transaction(['videoChunks', 'videoMetadata'], 'readonly');
            const store = tx.objectStore('videoChunks');
            const chunks: VideoChunk[] = [];

            let cursor = await store.index('byVideoId').openCursor(IDBKeyRange.only(uploading.videoId));
            while (cursor) {
                chunks.push(cursor.value as VideoChunk);
                cursor = await cursor.continue();
            }
            chunks.sort((a, b) => a.chunkOrder - b.chunkOrder);


            if (chunks.length === 0) {
                throw new Error(`No chunks found for video ID ${uploading.videoId}`);
            }

            const blobs = chunks.map(chunk => new Blob([chunk.data], { type: 'video/webm' }));
            const file = await fixWebmDuration(new Blob(blobs, { type: 'video/webm' }));


            const formData = new FormData();
            formData.append('file', file, 'video.webm');

            await PresentationsRepository.uploadVideo(
                token,
                uploading.meta.presentationId,
                file,
                uploading.meta.partName,
                uploading.meta.partOrder,
                uploading.meta.startedAt,
                uploading.meta.presentationStartId
            );

            setQueue(q =>
                q.map(item =>
                    item.videoId === uploading.videoId
                        ? { ...item, status: "success" }
                        : item
                )
            );

            const txDel = db.transaction(['videoChunks', 'videoMetadata'], 'readwrite');
            const storeDel = txDel.objectStore('videoChunks');
            const metaStoreDel = txDel.objectStore('videoMetadata');

            for (const chunk of chunks) {
                await storeDel.delete([chunk.videoId, chunk.chunkOrder]);
            }
            await metaStoreDel.delete(uploading.videoId);

            await txDel.done;
            //eslint-disable-next-line
        } catch (err: any) {
            console.error('Error uploading video:', err);
            setQueue(q =>
                q.map(item =>
                    item.videoId === uploading.videoId
                        ? {
                            ...item,
                            status: "error",
                            error: err?.message || 'Невідома помилка завантаження відео'
                        }
                        : item
                )
            );
        }
    }, [token]);

    const uploadAll = useCallback(async () => {
        setUploading(true);
        for (const item of queue) {
            if (item.status === "pending" || item.status === "error") {
                await uploadOne(item);
            }
        }
        setUploading(false);
        await loadNotUploadedVideos();
    }, [queue, uploadOne, loadNotUploadedVideos]);

    useEffect(() => {
        loadNotUploadedVideos();
    }, [loadNotUploadedVideos]);

    const location = useLocation();

    useEffect(() => {
        loadNotUploadedVideos();
    }, [loadNotUploadedVideos, location.pathname]);

    const notUploadedCount = queue.filter(item => item.status !== "success").length;

    return {
        notUploadedCount,
        uploading,
        uploadAll,
        reload: loadNotUploadedVideos,
        queue
    };
}