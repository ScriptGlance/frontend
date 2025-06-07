import {useEffect, useRef, useState} from "react";
import {openDB} from "idb";
import logoImage from '../assets/logo.png';
import {VideoChunk} from "../api/repositories/videoStorageRepository.ts";
import {useStartVideoRecording} from "./usePresentationVideo.ts";

function generateVideoId(presentationId: number, partId: number, presentationStartDate: string) {
    return `${presentationId}_${partId}_${presentationStartDate}`;
}

export function useTeleprompterVideoRecorder({
                                                 enabled,
                                                 isPremium,
                                                 presentationId,
                                                 partId,
                                                 partName,
                                                 partOrder,
                                                 presentationStartDate,
                                                 maxRecordingSeconds,
                                                 onRecordingStopped,
                                                 onAutoStoppedByDuration,
                                                 isVideoRecordingAllowed,
                                                 onError
                                             }: {
    enabled: boolean;
    isPremium: boolean;
    partId: number;
    partName: string;
    partOrder: number;
    presentationId: number;
    presentationStartDate: string;
    maxRecordingSeconds: number;
    onRecordingStopped?: () => void;
    onAutoStoppedByDuration: () => void;
    isVideoRecordingAllowed: boolean;
    onError: () => void;
}) {
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const chunkOrderRef = useRef(0);
    const enabledRef = useRef(enabled);
    const videoId = generateVideoId(presentationId, partId, presentationStartDate);
    const startedAtRef = useRef<number | null>(null);
    const partIdRef = useRef(partId);

    const isStoppingRef = useRef(false);
    const recordingStartedRef = useRef(false);

    const {startRecording} = useStartVideoRecording();

    useEffect(() => {
        partIdRef.current = partId;
    }, [partId]);

    useEffect(() => {
        enabledRef.current = enabled;
    }, [enabled]);
    const hasRecordedMapRef = useRef<Record<string, boolean>>({});

    useEffect(() => {
        hasRecordedMapRef.current = {};
    }, [presentationStartDate]);


    useEffect(() => {
        async function initChunkOrder() {
            const db = await openDB('VideoChunksDB', 1);
            const tx = db.transaction('videoChunks', 'readonly');
            const index = tx.objectStore('videoChunks').index('byVideoId');
            const chunks = [];
            let cursor = await index.openCursor(IDBKeyRange.only(videoId));
            while (cursor) {
                chunks.push(cursor.value);
                cursor = await cursor.continue();
            }
            if (chunks.length) {
                chunkOrderRef.current = Math.max(...chunks.map(c => c.chunkOrder)) + 1;
                const meta = await db.get('videoMetadata', videoId);
                if (meta) startedAtRef.current = meta.startedAt;
            } else {
                chunkOrderRef.current = 0;
                startedAtRef.current = Date.now();
            }
            console.log(`[VIDEO_RECORDER] initChunkOrder: videoId=${videoId}, foundChunks=${chunks.length}, set chunkOrderRef=${chunkOrderRef.current}, startedAt=${startedAtRef.current}`);
        }

        initChunkOrder();
    }, [videoId]);

    function stopAndCleanupStream() {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
            });
            streamRef.current = null;
        }
    }

    function forceStopMedia(context: string) {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive' && !isStoppingRef.current) {
            isStoppingRef.current = true;
            const oldOnStop = mediaRecorderRef.current.onstop;
            mediaRecorderRef.current.onstop = function (...args) {
                isStoppingRef.current = false;
                recordingStartedRef.current = false;
                if (oldOnStop) oldOnStop.apply(this, args as any);
            };
            console.log(`[VIDEO_RECORDER] [forceStopMedia] STOP called, context=${context}, videoId=${videoId}, chunkOrder=${chunkOrderRef.current}`);
            try {
                mediaRecorderRef.current.stop();
            } catch {
                console.warn(`[VIDEO_RECORDER] [forceStopMedia] Error stopping MediaRecorder, context=${context}, videoId=${videoId}, chunkOrder=${chunkOrderRef.current}`);
            }
        }
        stopAndCleanupStream();
    }

    useEffect(() => {
        let canvas: HTMLCanvasElement | null = null;
        let animationFrame: number;
        let stopTimeout: NodeJS.Timeout | null = null;
        const currentRecordingPartId = partIdRef.current;

        async function getFirstCameraStream() {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const firstCamera = devices.find(device => device.kind === 'videoinput');
            if (!firstCamera) throw new Error("No video input devices found");
            return await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: {exact: firstCamera.deviceId},
                    width: {ideal: 1280, max: 1920},
                    height: {ideal: 720, max: 1080},
                    frameRate: {ideal: 30, max: 60}
                },
                audio: {sampleRate: 48000, channelCount: 2}
            });
        }

        async function startRecordingWithPresentationId() {
            const session = await startRecording(presentationId);
            if (!session) {
                onError();
                return;
            }
            const {presentation_start_id: presentationStartId} = session;

            if (isStoppingRef.current) {
                console.warn('[VIDEO_RECORDER] startRecording called but stop in progress!');
                await new Promise(resolve => {
                    const check = () => {
                        if (!isStoppingRef.current) resolve(true);
                        else setTimeout(check, 30);
                    };
                    check();
                });
            }
            if (recordingStartedRef.current) {
                console.warn('[VIDEO_RECORDER] Already started, skip start');
                return;
            }
            if (isRecording) {
                console.warn('[VIDEO_RECORDER] Already recording, skip start');
                return;
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                console.warn('[VIDEO_RECORDER] MediaRecorder not inactive, skip start');
                return;
            }
            if (hasRecordedMapRef.current[videoId]) {
                console.warn(`[VIDEO_RECORDER] Already recorded for videoId=${videoId}, skip start`);
                return;
            }

            recordingStartedRef.current = true;

            console.log(`[VIDEO_RECORDER] >>> START recording: videoId=${videoId}, partId=${partIdRef.current}, startedAt=${Date.now()}, chunkOrder=${chunkOrderRef.current}, enabled=${enabled}`);

            stopAndCleanupStream();

            const stream = await getFirstCameraStream();
            streamRef.current = stream;

            const videoTrack = stream.getVideoTracks()[0];
            const settings = videoTrack.getSettings();
            const videoW = settings.width || 1280;
            const videoH = settings.height || 720;
            canvas = document.createElement('canvas');
            canvas.width = videoW;
            canvas.height = videoH;
            const ctx = canvas.getContext('2d')!;

            let watermark: HTMLImageElement | null = null;
            const LOGO_MAX_WIDTH = Math.floor(videoW * 0.22);
            const LOGO_MAX_HEIGHT = Math.floor(videoH * 0.09);
            const PADDING = Math.floor(videoW * 0.025);
            const OFFSET_X = PADDING + 4;
            const OFFSET_Y = videoH - LOGO_MAX_HEIGHT - PADDING - 4;
            const BG_RADIUS = 12;
            if (!isPremium) {
                watermark = new window.Image();
                watermark.src = logoImage;
                watermark.crossOrigin = "anonymous";
            }

            const video = document.createElement('video');
            video.srcObject = new MediaStream([videoTrack]);
            video.play();

            function drawFrame() {
                ctx.clearRect(0, 0, canvas!.width, canvas!.height);
                ctx.drawImage(video, 0, 0, canvas!.width, canvas!.height);

                if (watermark && watermark.complete && watermark.naturalWidth > 0) {
                    let w = watermark.naturalWidth;
                    let h = watermark.naturalHeight;
                    const scale = Math.min(LOGO_MAX_WIDTH / w, LOGO_MAX_HEIGHT / h, 1.0);
                    w = Math.floor(w * scale);
                    h = Math.floor(h * scale);
                    const x = canvas!.width - w - OFFSET_X;
                    const y = canvas!.height - h - OFFSET_Y;
                    ctx.save();
                    ctx.globalAlpha = 0.65;
                    ctx.fillStyle = "#fff";
                    roundRect(ctx, x - 8, y - 8, w + 16, h + 16, BG_RADIUS);
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                    ctx.drawImage(watermark, x, y, w, h);
                    ctx.restore();
                }
                animationFrame = requestAnimationFrame(drawFrame);
            }

            drawFrame();

            const canvasStream = canvas.captureStream(30);
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) canvasStream.addTrack(audioTrack);

            let codec = 'vp9,opus';
            const options = {mimeType: `video/webm;codecs=${codec}`, bitsPerSecond: 6_000_000};
            let mediaRecorder: MediaRecorder;
            try {
                mediaRecorder = new MediaRecorder(canvasStream, options);
            } catch {
                codec = 'vp8,opus';
                mediaRecorder = new MediaRecorder(canvasStream, {
                    mimeType: `video/webm;codecs=${codec}`,
                    bitsPerSecond: 6_000_000
                });
            }

            mediaRecorderRef.current = mediaRecorder;
            startedAtRef.current = Date.now();
            setIsRecording(true);

            const db = await openDB('VideoChunksDB', 1, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains('videoChunks')) {
                        const store = db.createObjectStore('videoChunks', {keyPath: ['videoId', 'chunkOrder']});
                        store.createIndex('byVideoId', 'videoId', {unique: false});
                    }
                    if (!db.objectStoreNames.contains('videoMetadata')) {
                        db.createObjectStore('videoMetadata', {keyPath: 'videoId'});
                    }
                }
            });

            await db.put('videoMetadata', {
                videoId,
                width: videoW,
                height: videoH,
                codec,
                frameRate: 30,
                sampleRate: 48000,
                channelCount: 2
            });

            mediaRecorder.ondataavailable = async (e) => {
                if (!enabledRef.current) {
                    forceStopMedia("ondataavailable-skipped");
                    return;
                }
                console.log(`[VIDEO_RECORDER] ondataavailable: videoId=${videoId}, chunkOrder=${chunkOrderRef.current}, size=${e.data?.size}`);
                if (e.data && e.data.size > 0) {
                    const chunkOrder = chunkOrderRef.current++;
                    const arrBuf = await e.data.arrayBuffer();
                    const chunk: VideoChunk = {
                        videoId,
                        presentationId,
                        partId: currentRecordingPartId,
                        partName,
                        partOrder,
                        presentationStartDate,
                        startedAt: startedAtRef.current!,
                        presentationStartId,
                        chunkOrder,
                        isFirstChunk: chunkOrder === 0,
                        data: arrBuf,
                    };
                    await db.put('videoChunks', chunk);
                    console.log(`[VIDEO_RECORDER] Saved chunk: videoId=${videoId}, chunkOrder=${chunkOrder}, size=${arrBuf.byteLength}`);
                }
            };

            mediaRecorder.onstop = () => {
                recordingStartedRef.current = false;
                console.log(`[VIDEO_RECORDER] <<< STOP recording: videoId=${videoId}, chunkOrder=${chunkOrderRef.current}, stoppedAt=${Date.now()}`);
                setIsRecording(false);
                hasRecordedMapRef.current[videoId] = true;
                cancelAnimationFrame(animationFrame);
                video.srcObject = null;
                stopAndCleanupStream();
                if (stopTimeout) clearTimeout(stopTimeout);
                if (onRecordingStopped) onRecordingStopped();
            };

            mediaRecorder.start(2000);

            if (!isPremium && maxRecordingSeconds > 0) {
                stopTimeout = setTimeout(() => {
                    console.log(`[VIDEO_RECORDER] stopTimeout fired! videoId=${videoId}, maxRecordingSeconds=${maxRecordingSeconds}`);
                    if (mediaRecorder.state !== 'inactive') {
                        mediaRecorder.stop();
                    }
                    if (onAutoStoppedByDuration) onAutoStoppedByDuration();
                }, maxRecordingSeconds * 1000);
            }
        }

        if (!enabled || !isVideoRecordingAllowed || !partIdRef.current || !presentationId || !presentationStartDate) {
            forceStopMedia("not-enabled");
            setIsRecording(false);
            recordingStartedRef.current = false;
            return;
        }

        if (enabled && partIdRef.current) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            } else {
                startRecordingWithPresentationId();
            }
        }

        return () => {
            forceStopMedia("cleanup");
            setIsRecording(false);
            recordingStartedRef.current = false;
        };
        // eslint-disable-next-line
    }, [enabled, presentationId, presentationStartDate, isVideoRecordingAllowed]);


    return {isRecording, videoId};
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
