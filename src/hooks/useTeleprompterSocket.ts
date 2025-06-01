import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "./useAuth";
import { Role } from "../types/role";
import {
    TeleprompterPresentationSocketManager,
    EmitReadingPositionPayload,
    EmitRecordedVideosCountPayload,
    TeleprompterPresencePayload,
    OwnerChangedPayload,
    RecordingModeChangedPayload,
    RecordedVideosCountChangePayload,
    PartReassignRequiredPayload,
    WaitingForUserPayload,
    PartReadingConfirmationRequiredPayload,
    IncomingReadingPositionPayload, PartReassignedPayload,
} from "../api/socket/teleprompterPresentationSocketManager.ts"

export interface UseTeleprompterSocketOptions {
    onTeleprompterPresence?: (data: TeleprompterPresencePayload) => void;
    onOwnerChanged?: (data: OwnerChangedPayload) => void;
    onRecordingModeChanged?: (data: RecordingModeChangedPayload) => void;
    onRecordedVideosCountChanged?: (data: RecordedVideosCountChangePayload) => void;
    onPartReassignRequired?: (data: PartReassignRequiredPayload) => void;
    onPartReassignCancelled?: () => void;
    onWaitingForUser?: (data: WaitingForUserPayload) => void;
    onPartReadingConfirmationRequired?: (data: PartReadingConfirmationRequiredPayload) => void;
    onPartReadingConfirmationCancelled?: () => void;
    onReadingPositionChanged?: (data: IncomingReadingPositionPayload) => void;
    onPartReassigned?: (data: PartReassignedPayload) => void;
    onConnect?: () => void;
    onDisconnect?: (reason?: string) => void;
    onReconnectAttempt?: (attempt: number) => void;
    onReconnect?: () => void;
    onReconnectFailed?: () => void;
}

export function useTeleprompterSocket(
    presentationId: number,
    options: UseTeleprompterSocketOptions = {}
) {
    const { getToken } = useAuth();
    const token = getToken(Role.User) || "";

    const socketManagerRef = useRef<TeleprompterPresentationSocketManager | null>(null);

    const {
        onTeleprompterPresence,
        onOwnerChanged,
        onRecordingModeChanged,
        onRecordedVideosCountChanged,
        onPartReassignRequired,
        onPartReassignCancelled,
        onWaitingForUser,
        onPartReadingConfirmationRequired,
        onPartReadingConfirmationCancelled,
        onReadingPositionChanged,
    } = options;

    const onTeleprompterPresenceRef = useRef(onTeleprompterPresence);
    const onOwnerChangedRef = useRef(onOwnerChanged);
    const onRecordingModeChangedRef = useRef(onRecordingModeChanged);
    const onRecordedVideosCountChangedRef = useRef(onRecordedVideosCountChanged);
    const onPartReassignRequiredRef = useRef(onPartReassignRequired);
    const onPartReassignCancelledRef = useRef(onPartReassignCancelled);
    const onWaitingForUserRef = useRef(onWaitingForUser);
    const onPartReadingConfirmationRequiredRef = useRef(onPartReadingConfirmationRequired);
    const onPartReadingConfirmationCancelledRef = useRef(onPartReadingConfirmationCancelled);
    const onReadingPositionChangedRef = useRef(onReadingPositionChanged);
    const onPartReassignedRef = useRef(options.onPartReassigned);
    const onConnectRef = useRef(options.onConnect);
    const onDisconnectRef = useRef(options.onDisconnect);
    const onReconnectAttemptRef = useRef(options.onReconnectAttempt);
    const onReconnectRef = useRef(options.onReconnect);
    const onReconnectFailedRef = useRef(options.onReconnectFailed);


    useEffect(() => { onTeleprompterPresenceRef.current = onTeleprompterPresence; }, [onTeleprompterPresence]);
    useEffect(() => { onOwnerChangedRef.current = onOwnerChanged; }, [onOwnerChanged]);
    useEffect(() => { onRecordingModeChangedRef.current = onRecordingModeChanged; }, [onRecordingModeChanged]);
    useEffect(() => { onRecordedVideosCountChangedRef.current = onRecordedVideosCountChanged; }, [onRecordedVideosCountChanged]);
    useEffect(() => { onPartReassignRequiredRef.current = onPartReassignRequired; }, [onPartReassignRequired]);
    useEffect(() => { onPartReassignCancelledRef.current = onPartReassignCancelled; }, [onPartReassignCancelled]);
    useEffect(() => { onWaitingForUserRef.current = onWaitingForUser; }, [onWaitingForUser]);
    useEffect(() => { onPartReadingConfirmationRequiredRef.current = onPartReadingConfirmationRequired; }, [onPartReadingConfirmationRequired]);
    useEffect(() => { onPartReadingConfirmationCancelledRef.current = onPartReadingConfirmationCancelled; }, [onPartReadingConfirmationCancelled]);
    useEffect(() => { onReadingPositionChangedRef.current = onReadingPositionChanged; }, [onReadingPositionChanged]);
    useEffect(() => { onPartReassignedRef.current = options.onPartReassigned }, [options.onPartReassigned]);
    useEffect(() => { onConnectRef.current = options.onConnect }, [options.onConnect]);
    useEffect(() => { onDisconnectRef.current = options.onDisconnect }, [options.onDisconnect]);
    useEffect(() => { onReconnectAttemptRef.current = options.onReconnectAttempt }, [options.onReconnectAttempt]);
    useEffect(() => { onReconnectRef.current = options.onReconnect }, [options.onReconnect]);
    useEffect(() => { onReconnectFailedRef.current = options.onReconnectFailed }, [options.onReconnectFailed]);

    useEffect(() => {
        if (!presentationId || !token) {
            if (socketManagerRef.current) {
                socketManagerRef.current.disconnect();
                socketManagerRef.current = null;
            }
            return;
        }

        const manager = new TeleprompterPresentationSocketManager(token);
        socketManagerRef.current = manager;

        if (onTeleprompterPresenceRef.current) manager.onTeleprompterPresence(onTeleprompterPresenceRef.current);
        if (onOwnerChangedRef.current) manager.onOwnerChanged(onOwnerChangedRef.current);
        if (onRecordingModeChangedRef.current) manager.onRecordingModeChanged(onRecordingModeChangedRef.current);
        if (onRecordedVideosCountChangedRef.current) manager.onRecordedVideosCountChanged(onRecordedVideosCountChangedRef.current);
        if (onPartReassignRequiredRef.current) manager.onPartReassignRequired(onPartReassignRequiredRef.current);
        if (onPartReassignCancelledRef.current) manager.onPartReassignCancelled(onPartReassignCancelledRef.current);
        if (onWaitingForUserRef.current) manager.onWaitingForUser(onWaitingForUserRef.current);
        if (onPartReadingConfirmationRequiredRef.current) manager.onPartReadingConfirmationRequired(onPartReadingConfirmationRequiredRef.current);
        if (onPartReadingConfirmationCancelledRef.current) manager.onPartReadingConfirmationCancelled(onPartReadingConfirmationCancelledRef.current);
        if (onReadingPositionChangedRef.current) manager.onReadingPositionChanged(onReadingPositionChangedRef.current);
        if (onPartReassignedRef.current) manager.onPartReassigned(onPartReassignedRef.current);
        if (onConnectRef.current) manager.onConnect(onConnectRef.current);
        if (onDisconnectRef.current) manager.onDisconnect(onDisconnectRef.current);
        if (onReconnectAttemptRef.current) manager.onReconnectAttempt(onReconnectAttemptRef.current);
        if (onReconnectRef.current) manager.onReconnect(onReconnectRef.current);
        if (onReconnectFailedRef.current) manager.onReconnectFailed(onReconnectFailedRef.current);


        const doSubscribe = () => manager.subscribeToTeleprompter({ presentationId });

        doSubscribe()
        manager.onConnect(() => {
            doSubscribe();
            if (onConnectRef.current) onConnectRef.current();
        });
        manager.onReconnect(() => {
            doSubscribe();
            if (onReconnectRef.current) onReconnectRef.current();
        });

        return () => {
            if (onTeleprompterPresenceRef.current) manager.offTeleprompterPresence(onTeleprompterPresenceRef.current);
            if (onOwnerChangedRef.current) manager.offOwnerChanged(onOwnerChangedRef.current);
            if (onRecordingModeChangedRef.current) manager.offRecordingModeChanged(onRecordingModeChangedRef.current);
            if (onRecordedVideosCountChangedRef.current) manager.offRecordedVideosCountChanged(onRecordedVideosCountChangedRef.current);
            if (onPartReassignRequiredRef.current) manager.offPartReassignRequired(onPartReassignRequiredRef.current);
            if (onPartReassignCancelledRef.current) manager.offPartReassignCancelled(onPartReassignCancelledRef.current);
            if (onWaitingForUserRef.current) manager.offWaitingForUser(onWaitingForUserRef.current);
            if (onPartReadingConfirmationRequiredRef.current) manager.offPartReadingConfirmationRequired(onPartReadingConfirmationRequiredRef.current);
            if (onPartReadingConfirmationCancelledRef.current) manager.offPartReadingConfirmationCancelled(onPartReadingConfirmationCancelledRef.current);
            if (onReadingPositionChangedRef.current) manager.offReadingPositionChanged(onReadingPositionChangedRef.current);
            if (onPartReassignedRef.current) manager.offPartReassigned(onPartReassignedRef.current);
            if (onConnectRef.current) manager.offConnect(onConnectRef.current);
            if (onDisconnectRef.current) manager.offDisconnect(onDisconnectRef.current);
            if (onReconnectAttemptRef.current) manager.offReconnectAttempt(onReconnectAttemptRef.current);
            if (onReconnectRef.current) manager.offReconnect(onReconnectRef.current);
            if (onReconnectFailedRef.current) manager.offReconnectFailed(onReconnectFailedRef.current);

            manager.disconnect();
            socketManagerRef.current = null;
        };
    }, [token, presentationId]);

    const sendReadingPosition = useCallback((payload: Omit<EmitReadingPositionPayload, 'presentationId'>) => {
        if (socketManagerRef.current && presentationId) {
            socketManagerRef.current.sendReadingPosition({ ...payload, presentationId });
        }
    }, [presentationId]);

    const sendRecordedVideosCount = useCallback((payload: Omit<EmitRecordedVideosCountPayload, 'presentationId'>) => {
        if (socketManagerRef.current && presentationId) {
            socketManagerRef.current.sendRecordedVideosCount({ ...payload, presentationId });
        }
    }, [presentationId]);


    return {
        sendReadingPosition,
        sendRecordedVideosCount,
    };
}