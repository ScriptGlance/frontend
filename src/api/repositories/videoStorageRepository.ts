import { openDB } from 'idb';

export interface VideoChunk {
    presentationId: number;
    videoId: string;
    partId: number;
    partName: string;
    partOrder: number;
    startedAt: number;
    presentationStartDate: string;
    chunkOrder: number;
    isFirstChunk: boolean;
    data: ArrayBuffer;
}

export async function getNotUploadedVideoCount(presentationId: number): Promise<number> {
    const db = await openDB('VideoChunksDB', 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('videoChunks')) {
                const store = db.createObjectStore('videoChunks', { keyPath: ['videoId', 'chunkOrder'] });
                store.createIndex('byVideoId', 'videoId', { unique: false });
            }
        }
    });

    const tx = db.transaction('videoChunks', 'readonly');
    const store = tx.objectStore('videoChunks');
    const uniqueVideoIds = new Set<string>();

    let cursor = await store.openCursor();
    while (cursor) {
        const chunk = cursor.value as VideoChunk;
        if (chunk.presentationId === presentationId) {
            uniqueVideoIds.add(chunk.videoId);
        }
        cursor = await cursor.continue();
    }
    await tx.done;
    return uniqueVideoIds.size;
}
