import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { Role } from "../types/role";
import {
    CursorPositionChangePayload,
    EditingPresence, PartEventPayload, PresentationPartsSocketManager,
    SubTextOperationsPayload, TextOperationsPayload
} from "../api/socket/presentationPartsSocketManager.ts";

export interface UsePresentationPartsSocketOptions {
    onEditingPresence?: (data: EditingPresence) => void;
    onTextOperations?: (data: SubTextOperationsPayload) => void;
    onCursorPositionChange?: (data: CursorPositionChangePayload) => void;
    onPartEvent?: (data: PartEventPayload) => void;
}

export function usePresentationPartsSocket(
    presentationId: number,
    {
        onEditingPresence,
        onTextOperations,
        onCursorPositionChange,
        onPartEvent,
    }: UsePresentationPartsSocketOptions = {}
) {
    const { getToken } = useAuth();
    const token = getToken(Role.User) || "";

    const socketManagerRef = useRef<PresentationPartsSocketManager | null>(null);

    const editingPresenceRef = useRef(onEditingPresence);
    const textOperationsRef = useRef(onTextOperations);
    const cursorPositionChangeRef = useRef(onCursorPositionChange);
    const partEventRef = useRef(onPartEvent);

    useEffect(() => { editingPresenceRef.current = onEditingPresence; }, [onEditingPresence]);
    useEffect(() => { textOperationsRef.current = onTextOperations; }, [onTextOperations]);
    useEffect(() => { cursorPositionChangeRef.current = onCursorPositionChange; }, [onCursorPositionChange]);
    useEffect(() => { partEventRef.current = onPartEvent; }, [onPartEvent]);

    useEffect(() => {
        if (!presentationId) return;

        const manager = new PresentationPartsSocketManager(token);
        socketManagerRef.current = manager;

        manager.subscribeText(presentationId);

        if (editingPresenceRef.current) {
            manager.onEditingPresence(editingPresenceRef.current);
        }
        if (textOperationsRef.current) {
            manager.onTextOperations(textOperationsRef.current);
        }
        if (cursorPositionChangeRef.current) {
            manager.onCursorPositionChange(cursorPositionChangeRef.current);
        }
        if (partEventRef.current) {
            manager.onPartEvent(partEventRef.current);
        }

        return () => {
            if (editingPresenceRef.current) {
                manager.offEditingPresence(editingPresenceRef.current);
            }
            if (textOperationsRef.current) {
                manager.offTextOperations(textOperationsRef.current);
            }
            if (cursorPositionChangeRef.current) {
                manager.offCursorPositionChange(cursorPositionChangeRef.current);
            }
            if (partEventRef.current) {
                manager.offPartEvent(partEventRef.current);
            }
            manager.disconnect();
            socketManagerRef.current = null;
        };
    }, [token, presentationId]);

    const sendTextOperations = (payload: TextOperationsPayload) => {
        socketManagerRef.current?.sendTextOperations(payload);
    };

    const sendCursorPositionChange = (payload: CursorPositionChangePayload) => {
        socketManagerRef.current?.sendCursorPositionChange(payload);
    };

    return {
        sendTextOperations,
        sendCursorPositionChange,
    };
}
