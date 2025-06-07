import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {useProfile} from "../../hooks/ProfileContext.tsx";
import {
    usePresentationDetails,
    usePresentationParticipants,
    usePresentationsConfig
} from "../../hooks/usePresentationData.ts";
import {
    useCreatePresentationPart,
    useDeletePresentationPart,
    usePresentationCursorPositions,
    usePresentationParts,
    useUpdatePresentationPart
} from "../../hooks/usePresentationParts.ts";
import {usePresentationPartsSocket} from "../../hooks/usePresentationPartsSocket.ts";
import {
    EditingPresence,
    EditingPresenceType,
    OperationComponent,
    OperationTarget,
    PartEventPayload,
    PartEventType,
    SubTextOperationsPayload
} from "../../api/socket/presentationPartsSocketManager.ts";
import {DragDropContext, Draggable, Droppable, DropResult} from "@hello-pangea/dnd";
import {Dropdown, Menu} from "antd";
import {Avatar} from "../../components/avatar/Avatar";
import {getPartDuration} from "../../utils/partUtils.ts";
import addIcon from "../../assets/add-icon.svg";
import deleteIcon from "../../assets/delete-icon-gray.svg";
import dropdownIcon from "../../assets/dropdown-icon.svg";

import "./PresentationTextEditorPage.css";
import PartEditor from "../../components/editor/PartEditor.tsx";
import {calculateWordCount} from "../../utils/textUtils.ts";
import {applyOps, createOps, transform, transformPosition} from "../../utils/operationalTransform.ts";
import PartTitleEditor from "../../components/editor/PartTitleEditor.tsx";
import ConfirmationModal from "../../components/modals/deleteConfirmation/DeleteConfirmationModal.tsx";
import {usePresentationSocket} from "../../hooks/usePresentationSocket.ts";
import {PresentationEventType} from "../../api/socket/presentationSocketManager.ts";
import {flushSync} from "react-dom";
import ParticipantsHeader from "../../components/participantsHeader/ParticipantsHeader.tsx";
import StructureSidebar from "../../components/structureSidebar/StructureSidebar.tsx";
import {useActiveTeleprompterData} from "../../hooks/useTeleprompterPresentation.ts";
import {Role} from "../../types/role.ts";
import {UserProfile} from "../../api/repositories/profileRepository.ts";
import {Title} from "react-head";

export interface PendingTextOp {
    operations: OperationComponent[];
    baseVersion: number;
    text: string;
}

interface PartState {
    partText: string;
    version: number;
    pendingOperations: PendingTextOp[];
    lastSentText: string;
    wordCount: number;
    nameText: string;
    nameVersion: number;
    pendingNameOps: PendingTextOp[];
    lastSentName: string;
    editingName: boolean;
    history: TextEditHistory[];
    historyPosition: number;
    textSelection: {
        start: number;
        end: number;
    };
    part_order: number;
    assignee_participant_id?: number;
}

export interface ActiveUser {
    user_id: number;
    part_id: number;
    timestamp: number;
    cursor_position: number | null;
    selection_anchor_position: number | null;
    target: 'text' | 'name' | null;
}

interface TextEditHistory {
    text: string;
    cursorPos: number;
    selectionStart: number;
    selectionEnd: number;
}


const PresentationTextEditorPage: React.FC = () => {
    const HISTORY_BATCH_TIMEOUT = 1000;

    const {id: presentationIdParam} = useParams<{ id: string }>();
    const presentationId = parseInt(presentationIdParam || "0", 10);
    const navigate = useNavigate();

    const {profile} = useProfile(Role.User);
    const profileRef = useRef(profile);
    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    const {
        activeData: activePresentationData,
    } = useActiveTeleprompterData(presentationId);
    
    const [isPresentationStarted, setPresentationStarted] = useState(false);
    
    useEffect(() => {
        if (activePresentationData?.currentPresentationStartDate) {
            setPresentationStarted(true);
        }
    }, [activePresentationData?.currentPresentationStartDate]);

    const {presentation, refetch: refetchPresentation} = usePresentationDetails(presentationId);
    const {parts, loading: partsLoading} = usePresentationParts(presentationId);
    const {participants, refetch: refetchParticipants} = usePresentationParticipants(presentationId);
    const {updatePart} = useUpdatePresentationPart();
    const {createPart} = useCreatePresentationPart(presentationId);
    const {deletePart} = useDeletePresentationPart();
    const {cursorPositions} = usePresentationCursorPositions(presentationId);
    const {config} = usePresentationsConfig();
    const [presentationName, setPresentationName] = useState(presentation?.name || '');

    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

    const [partsState, setPartsState] = useState<Record<number, PartState>>({});

    const [showAddPartBtn, setShowAddPartBtn] = useState<number | null>(null);

    const textAreaRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});
    const nameInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
    const lastSentTimeRefs = useRef<{ [key: number]: number }>({});
    const scheduledSendRefs = useRef<{ [key: string]: NodeJS.Timeout | null }>({});
    const partSectionRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
    const historyTimeoutRefs = useRef<{ [key: number]: NodeJS.Timeout | null }>({});
    const lastHistoryUpdateRefs = useRef<{ [key: number]: number }>({});
    const [resizeTick, setResizeTick] = useState(0);
    const [isFirstLoad, setIsFirstLoad] = useState(true);
    const [confirmDeletePartId, setConfirmDeletePartId] = useState<number | null>(null);
    const [deletePartName, setDeletePartName] = useState<string>("");
    const [visiblePartId, setVisiblePartId] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
    const selectionPositionsRef = useRef<Record<number, { start: number, end: number }>>({});

    const useDebounce = <T, >(value: T, delay: number) => {
        const [debouncedValue, setDebouncedValue] = useState(value);

        useEffect(() => {
            const handler = setTimeout(() => {
                setDebouncedValue(value);
            }, delay);

            return () => {
                clearTimeout(handler);
            };
        }, [value, delay]);

        return debouncedValue;
    };

    const [operationQueue, setOperationQueue] = useState<{ [partId: number]: number }>({});
    useDebounce(operationQueue, 50);
    useEffect(() => {
        if (!partsLoading) {
            setIsFirstLoad(false);
        }
    }, [partsLoading]);


    const partsStateRef = useRef(partsState);
    useEffect(() => {
        partsStateRef.current = partsState;
    }, [partsState]);


    useEffect(() => {
        const onWindowResize = () => setResizeTick(tick => tick + 1);
        window.addEventListener("resize", onWindowResize);

        const observers: ResizeObserver[] = [];
        Object.entries(partSectionRefs.current).forEach(([, el]) => {
            if (!el) return;
            const observer = new ResizeObserver(() => {
                setResizeTick(tick => tick + 1);
            });
            observer.observe(el);
            observers.push(observer);
        });

        return () => {
            window.removeEventListener("resize", onWindowResize);
            observers.forEach(observer => observer.disconnect());
        };
    }, [Object.keys(partsState).join(",")]);

    useEffect(() => {
        if ((profile as UserProfile | undefined)?.user_id) {
            const now = Date.now();
            setActiveUsers(prev => [
                ...prev.filter(u => u.user_id !== (profile as UserProfile).user_id),
                {
                    user_id: (profile as UserProfile).user_id,
                    part_id: 0,
                    cursor_position: null,
                    selection_anchor_position: null,
                    target: null,
                    timestamp: now
                }
            ]);
        }
    }, [profile]);

    useEffect(() => {
        const container = document.querySelector('.parts-editor');

        const handleUpdate = () => {
            if (!container) return;

            const containerRect = container.getBoundingClientRect();
            const scrollTop = container.scrollTop;
            const scrollHeight = container.scrollHeight;
            const clientHeight = container.clientHeight;

            const scrollThreshold = 4;
            const isScrolledToBottom = (scrollHeight - scrollTop - clientHeight) <= scrollThreshold;

            let bestId: number | null = null;
            let bestRatio = 0;

            Object.entries(partSectionRefs.current).forEach(([id, el]) => {
                if (!el) return;

                const partId = parseInt(id, 10);
                if (isDragging && draggedItemId === partId) return;

                const rect = el.getBoundingClientRect();
                const visibleTop = Math.max(rect.top, containerRect.top);
                const visibleBottom = Math.min(rect.bottom, containerRect.bottom);
                const visibleHeight = Math.max(0, visibleBottom - visibleTop);
                const totalHeight = rect.height || 1;

                const ratio = visibleHeight / totalHeight;

                if (ratio > bestRatio) {
                    bestRatio = ratio;
                    bestId = partId;
                }
            });

            if (isScrolledToBottom) {
                const lastPartId = Object.keys(partSectionRefs.current)
                    .map(Number)
                    .filter(id => !(isDragging && draggedItemId === id))
                    .sort((a, b) => partsState[a]?.part_order - partsState[b]?.part_order)
                    .pop();

                if (lastPartId !== undefined) {
                    setVisiblePartId(lastPartId);
                    return;
                }
            }

            setVisiblePartId(bestId);
        };

        container?.addEventListener('scroll', handleUpdate);
        window.addEventListener('resize', handleUpdate);
        handleUpdate();

        return () => {
            container?.removeEventListener('scroll', handleUpdate);
            window.removeEventListener('resize', handleUpdate);
        };
    }, [partsState, resizeTick, isDragging, draggedItemId]);

    useEffect(() => {
        if (!isDragging || draggedItemId === null) return;

        const container = document.querySelector('.parts-editor');
        if (!container) return;

        let scrollInterval: NodeJS.Timeout | null = null;

        const handleDragScroll = (e: MouseEvent) => {
            const containerRect = container.getBoundingClientRect();
            const scrollThreshold = 100;

            if (scrollInterval) {
                clearInterval(scrollInterval);
                scrollInterval = null;
            }

            if (e.clientY < containerRect.top + scrollThreshold) {
                scrollInterval = setInterval(() => {
                    container.scrollTop -= 8;
                }, 16);
            } else if (e.clientY > containerRect.bottom - scrollThreshold) {
                scrollInterval = setInterval(() => {
                    container.scrollTop += 8;
                }, 16);
            }
        };

        const clearScrollInterval = () => {
            if (scrollInterval) {
                clearInterval(scrollInterval);
                scrollInterval = null;
            }
        };

        document.addEventListener('mousemove', handleDragScroll);
        document.addEventListener('mouseup', clearScrollInterval);
        document.addEventListener('mouseleave', clearScrollInterval);

        return () => {
            document.removeEventListener('mousemove', handleDragScroll);
            document.removeEventListener('mouseup', clearScrollInterval);
            document.removeEventListener('mouseleave', clearScrollInterval);
            clearScrollInterval();
        };
    }, [isDragging, draggedItemId]);

    useEffect(() => {
        if (presentation?.name) {
            setPresentationName(presentation.name);
        }
    }, [presentation?.name]);

    usePresentationSocket(presentationId, (event) => {
        if (event.event_type === PresentationEventType.NameChanged) {
            refetchPresentation();
        } else if (event.event_type === PresentationEventType.PresentationStarted) {
            setPresentationStarted(true)
        } else if (event.event_type === PresentationEventType.PresentationStopped) {
            setPresentationStarted(false);
        } else if (event.event_type === PresentationEventType.ParticipantsChanged) {
            refetchParticipants();
        }
    });

    useEffect(() => {
        if (!participants || Object.keys(partsState).length === 0) return;

        const ownerParticipant = participants.find(p => p.user.user_id === presentation?.owner?.user_id);
        if (!ownerParticipant) return;
        const ownerParticipantId = ownerParticipant.participant_id;

        const participantIds = participants.map(p => p.participant_id);

        let hasChanges = false;

        const newPartsState = { ...partsState };
        Object.entries(partsState).forEach(([partIdStr, partState]) => {
            const partId = parseInt(partIdStr);
            if (
                partState.assignee_participant_id &&
                !participantIds.includes(partState.assignee_participant_id)
            ) {
                newPartsState[partId] = {
                    ...partState,
                    assignee_participant_id: ownerParticipantId
                };
                hasChanges = true;
            }
        });

        if (hasChanges) {
            setPartsState(newPartsState);
        }
    }, [presentation, participants, partsState]);


    const {
        sendTextOperations,
        sendCursorPositionChange,
        getSocketId
    } = usePresentationPartsSocket(presentationId, {
        onEditingPresence: (data: EditingPresence) => {
            if (data.type === EditingPresenceType.UserJoined) {
                setActiveUsers(prev => {
                    const now = Date.now();
                    const filtered = prev.filter(u =>
                        u.user_id !== data.user_id || now - u.timestamp < 30000);

                    const newUsers = [...filtered];
                    newUsers.push({
                        user_id: data.user_id,
                        part_id: 0,
                        timestamp: now,
                        cursor_position: null,
                        selection_anchor_position: null,
                        target: null
                    });

                    return newUsers;
                });
            } else if (data.type === EditingPresenceType.UserLeft) {
                setActiveUsers(prev => prev.filter(u => u.user_id !== data.user_id));
            }
        },
        onTextOperations: (data: SubTextOperationsPayload) => {
            console.log('Handle text operations:', data);
            handleReceivedOperations(data);
        },
        onCursorPositionChange: (data) => {
            if (!data.part_id || !data.user_id) return;

            setActiveUsers(prev => {
                const now = Date.now();
                const filtered = prev.filter(u => u.user_id !== data.user_id);
                filtered.push({
                    user_id: data.user_id ?? 0,
                    part_id: data.part_id,
                    target: data.target,
                    timestamp: now,
                    cursor_position: data.cursor_position,
                    selection_anchor_position: data.selection_anchor_position
                });

                return filtered;
            });
        },
        onPartEvent: (data: PartEventPayload) => {
            if (data.event_type === PartEventType.PartAdded) {
                const newPartId = data.part_id;
                const defaultPartName = `Частина без назви`;
                const partOrder = data.part_order !== undefined ? data.part_order :
                    Math.max(...Object.values(partsState).map(p => p.part_order), 0) + 1;

                setPartsState(prev => {
                    const newState = {...prev};
                    Object.entries(newState).forEach(([partIdStr, partState]) => {
                        if (partState.part_order >= partOrder) {
                            newState[+partIdStr] = {
                                ...partState,
                                part_order: partState.part_order + 1
                            };
                        }
                    });

                    newState[newPartId] = {
                        partText: '',
                        version: 0,
                        pendingOperations: [],
                        lastSentText: '',
                        wordCount: 0,
                        nameText: defaultPartName,
                        nameVersion: 0,
                        pendingNameOps: [],
                        lastSentName: defaultPartName,
                        editingName: false,
                        history: [{text: '', cursorPos: 0, selectionStart: 0, selectionEnd: 0}],
                        historyPosition: 0,
                        textSelection: {start: 0, end: 0},
                        part_order: partOrder,
                        assignee_participant_id: data.assignee_participant_id
                    };

                    return newState;
                });
            } else if (data.event_type === PartEventType.PartRemoved) {
                const removedPartOrder = partsState[data.part_id]?.part_order;

                setPartsState(prev => {
                    const newState = {...prev};

                    delete newState[data.part_id];

                    if (removedPartOrder !== undefined) {
                        Object.entries(newState).forEach(([partIdStr, partState]) => {
                            if (partState.part_order > removedPartOrder) {
                                newState[+partIdStr] = {
                                    ...partState,
                                    part_order: partState.part_order - 1
                                };
                            }
                        });
                    }

                    return newState;
                });
            } else if (data.event_type === PartEventType.PartUpdated) {
                const updatedPartId = data.part_id;
                const oldOrder = partsState[updatedPartId]?.part_order;
                const newOrder = data.part_order;

                setPartsState(prev => {
                    if (!prev[updatedPartId]) return prev;

                    const newState = {...prev};
                    const updatedPart = {...prev[updatedPartId]};

                    if (newOrder !== undefined && oldOrder !== newOrder) {
                        if (newOrder > oldOrder) {
                            Object.entries(newState).forEach(([partIdStr, partState]) => {
                                const partId = parseInt(partIdStr);
                                if (partId !== updatedPartId &&
                                    partState.part_order > oldOrder &&
                                    partState.part_order <= newOrder) {
                                    newState[partId] = {
                                        ...partState,
                                        part_order: partState.part_order - 1
                                    };
                                }
                            });
                        } else if (newOrder < oldOrder) {
                            Object.entries(newState).forEach(([partIdStr, partState]) => {
                                const partId = parseInt(partIdStr);
                                if (partId !== updatedPartId &&
                                    partState.part_order >= newOrder &&
                                    partState.part_order < oldOrder) {
                                    newState[partId] = {
                                        ...partState,
                                        part_order: partState.part_order + 1
                                    };
                                }
                            });
                        }

                        updatedPart.part_order = newOrder;
                    }

                    if (data.assignee_participant_id !== undefined) {
                        updatedPart.assignee_participant_id = data.assignee_participant_id;
                    }

                    newState[updatedPartId] = updatedPart;
                    return newState;
                });
            }
        }
    });

    const totalWordCount = useMemo(() => {
        return Object.values(partsState).reduce((total, part) => total + part.wordCount, 0);
    }, [partsState]);

    useEffect(() => {
        if (parts.length > 0 && !partsLoading) {
            const newPartsStateUpdates: Record<number, Partial<PartState>> = {};

            parts.forEach(part => {
                const serverTextVersion = part.part_text_version !== undefined ? part.part_text_version : 0;
                const serverNameVersion = part.part_name_version !== undefined ? part.part_name_version : 0;

                newPartsStateUpdates[part.part_id] = {
                    partText: part.part_text || '',
                    version: serverTextVersion,
                    lastSentText: part.part_text || '',
                    wordCount: calculateWordCount(part.part_text || ''),
                    nameText: part.part_name || '',
                    nameVersion: serverNameVersion,
                    lastSentName: part.part_name || '',
                    ...(partsStateRef.current[part.part_id] ? {} : {
                        pendingOperations: [],
                        pendingNameOps: [],
                        editingName: false,
                        history: [{text: part.part_text || '', cursorPos: 0, selectionStart: 0, selectionEnd: 0}],
                        historyPosition: 0,
                        textSelection: {start: 0, end: 0},
                    }),
                    part_order: part.part_order,
                    assignee_participant_id: part.assignee_participant_id
                };
            });

            setPartsState(prev => {
                const newState = {...prev};
                Object.keys(newPartsStateUpdates).forEach(partIdStr => {
                    const partId = parseInt(partIdStr);
                    newState[partId] = {
                        ...(prev[partId] || {} as PartState),
                        ...newPartsStateUpdates[partId]
                    };
                });
                return newState;
            });
        }
    }, [parts, partsLoading, presentationId]);

    useEffect(() => {
        if (cursorPositions && cursorPositions.length > 0) {
            const now = Date.now();
            const activeUsersList: ActiveUser[] = cursorPositions
                .filter(cursor => cursor.part_id !== null)
                .map(cursor => ({
                    user_id: cursor.user_id,
                    part_id: cursor.part_id || 0,
                    timestamp: now,
                    cursor_position: cursor.cursor_position,
                    selection_anchor_position: cursor.selection_anchor_position,
                    target: cursor.target
                }));

            setActiveUsers(prev => {
                const recentUsers = prev.filter(u => {
                    const now = Date.now();
                    return now - u.timestamp < 30000 &&
                        !activeUsersList.some(newU =>
                            newU.user_id === u.user_id &&
                            newU.part_id === u.part_id &&
                            newU.target === u.target);
                });

                return [...recentUsers, ...activeUsersList];
            });
        }
    }, [cursorPositions]);

    const sendOps = useCallback((partId: number, newText: string, target: OperationTarget) => {
        const partState = partsState[partId];
        if (!partState) return;

        const isName = target === OperationTarget.Name;
        const lastText = isName ? partState.lastSentName : partState.lastSentText;

        const safeLastText = lastText || '';
        const safeNewText = newText || '';

        if (safeNewText === safeLastText) return;

        const ops = createOps(safeLastText, safeNewText, (profileRef.current as UserProfile | undefined)?.user_id || 0);
        if (ops.length === 0) return;

        sendTextOperations({
            partId: partId,
            baseVersion: isName ? partState.nameVersion : partState.version,
            operations: ops,
            target: target
        });

        setPartsState(prev => {
            const updatedPart = {...prev[partId]};

            if (isName) {
                updatedPart.pendingNameOps = [
                    ...updatedPart.pendingNameOps,
                    {
                        operations: JSON.parse(JSON.stringify(ops)),
                        baseVersion: updatedPart.nameVersion,
                        text: safeNewText
                    }
                ];
                updatedPart.nameVersion = updatedPart.nameVersion + 1;
                updatedPart.lastSentName = safeNewText;
            } else {
                updatedPart.pendingOperations = [
                    ...updatedPart.pendingOperations,
                    {
                        operations: JSON.parse(JSON.stringify(ops)),
                        baseVersion: updatedPart.version,
                        text: safeNewText
                    }
                ];
                updatedPart.version = updatedPart.version + 1;
                updatedPart.lastSentText = safeNewText;
            }

            return {
                ...prev,
                [partId]: updatedPart
            };
        });

        if (!lastSentTimeRefs.current[partId]) {
            lastSentTimeRefs.current = {...lastSentTimeRefs.current};
        }
        lastSentTimeRefs.current[partId] = Date.now();
    }, [partsState, sendTextOperations]);

    const handleReceivedOperations = useCallback((payload: SubTextOperationsPayload) => {
        const {
            partId,
            target,
            socketId: remoteSocketId,
            userId: remoteUserId,
            baseVersion: payload_base_version,
            appliedVersion: payload_applied_version,
            operations: ops_from_server
        } = payload;

        const currentPartStateFromRef = partsStateRef.current[partId];
        if (!currentPartStateFromRef) {
            console.warn(`[OT][${remoteUserId === (profileRef.current as UserProfile | undefined)?.user_id ? 'ACK' : 'RemoteOp'}] Part ${partId} not found in local state. Skipping.`);
            return;
        }

        const isOwnOp = remoteUserId === (profileRef.current as UserProfile | undefined)?.user_id && remoteSocketId === getSocketId();
        const logPrefix = `[OT][${isOwnOp ? `ACK_for_u${remoteUserId}` : `RemoteOp_from_u${remoteUserId}`}] PartID ${partId}, Target ${target}:`;

        let selectionBeforeAnyStateUpdate: { start: number, end: number } | null = null;
        if (!isOwnOp) {
            const elementForSelectionCapture = target === OperationTarget.Name
                ? nameInputRefs.current?.[partId]
                : textAreaRefs.current?.[partId];
            if (elementForSelectionCapture && document.activeElement === elementForSelectionCapture) {
                selectionBeforeAnyStateUpdate = {
                    start: elementForSelectionCapture.selectionStart || 0,
                    end: elementForSelectionCapture.selectionEnd || 0
                };
            } else {
                selectionBeforeAnyStateUpdate = selectionPositionsRef.current[partId] || null;
            }
            console.log(`${logPrefix} Captured selection for remote op:`, selectionBeforeAnyStateUpdate);
        }

        console.log(`${logPrefix} Received. PayloadBaseV: ${payload_base_version}, ServerOps: ${JSON.stringify(ops_from_server)}, AppliedV: ${payload_applied_version}`);
        console.log(`${logPrefix} Current local state before processing - Text: "${(target === OperationTarget.Text ? currentPartStateFromRef.partText : currentPartStateFromRef.nameText).substring(0, 30)}...", Version: ${target === OperationTarget.Text ? currentPartStateFromRef.version : currentPartStateFromRef.nameVersion}, PendingOpsCount: ${target === OperationTarget.Text ? currentPartStateFromRef.pendingOperations.length : currentPartStateFromRef.pendingNameOps.length}`);

        setOperationQueue(prev => ({...prev, [partId]: (prev[partId] || 0) + 1}));

        if (isOwnOp) {
            const pendingOpsListKey = target === OperationTarget.Name ? 'pendingNameOps' : 'pendingOperations';
            const versionKey = target === OperationTarget.Name ? 'nameVersion' : 'version';

            const pendingOpsList = currentPartStateFromRef[pendingOpsListKey];
            const ackIndex = pendingOpsList.findIndex(op => op.baseVersion === payload_base_version);

            if (ackIndex !== -1) {
                const ackedOp = pendingOpsList[ackIndex];
                console.log(`${logPrefix} ACK found for pending op (baseV ${payload_base_version}):`, JSON.parse(JSON.stringify(ackedOp.operations)));

                flushSync(() => {
                    setPartsState(prev => {
                        const partFromPrev = prev[partId];
                        if (!partFromPrev) return prev;
                        const updatedPart = {...partFromPrev};

                        updatedPart[pendingOpsListKey] = pendingOpsList.filter(op => op.baseVersion !== payload_base_version);

                        if (payload_applied_version > updatedPart[versionKey]) {
                            updatedPart[versionKey] = payload_applied_version;
                            console.log(`${logPrefix} ACK updated local version to ${payload_applied_version}.`);
                        } else {
                            console.log(`${logPrefix} ACK's appliedVersion (${payload_applied_version}) is not greater than current local version (${updatedPart[versionKey]}). Local version not changed by this ACK.`);
                        }

                        console.log(`${logPrefix} After ACK: PendingOpsCount: ${updatedPart[pendingOpsListKey].length}, Version: ${updatedPart[versionKey]}`);
                        return {...prev, [partId]: updatedPart};
                    });
                });
            } else {
                console.warn(`${logPrefix} ACK received for an unknown or already processed operation (baseV ${payload_base_version}). Pending ops:`, JSON.parse(JSON.stringify(pendingOpsList)));
                flushSync(() => {
                    setPartsState(prev => {
                        const partFromPrev = prev[partId];
                        if (!partFromPrev) return prev;
                        const updatedPart = {...partFromPrev};
                        if (payload_applied_version > updatedPart[versionKey]) {
                            updatedPart[versionKey] = payload_applied_version;
                            console.log(`${logPrefix} ACK for unknown op updated local version to ${payload_applied_version}.`);
                        }
                        return {...prev, [partId]: updatedPart};
                    });
                });
            }
            return;
        }

        let transformedRemoteOps = JSON.parse(JSON.stringify(ops_from_server));

        const localPendingOpsKey = target === OperationTarget.Name ? 'pendingNameOps' : 'pendingOperations';
        const localVersionKey = target === OperationTarget.Name ? 'nameVersion' : 'version';
        const localTextKey = target === OperationTarget.Name ? 'nameText' : 'partText';
        const localLastSentTextKey = target === OperationTarget.Name ? 'lastSentName' : 'lastSentText';
        const localWordCountKey = 'wordCount';


        const currentLocalPendingOpsList = currentPartStateFromRef[localPendingOpsKey];
        const newTransformedLocalPendingOpsList: PendingTextOp[] = [];

        console.log(`${logPrefix} Current local pending ops before transforming against remote op:`, JSON.parse(JSON.stringify(currentLocalPendingOpsList)));


        for (const pendingOp of currentLocalPendingOpsList) {
            const prevRemoteOps = JSON.parse(JSON.stringify(transformedRemoteOps));
            transformedRemoteOps = transform(transformedRemoteOps, pendingOp.operations);
            const newPendingOps = transform(pendingOp.operations, prevRemoteOps);
            newTransformedLocalPendingOpsList.push({
                ...pendingOp,
                operations: newPendingOps
            });
        }

        console.log(`${logPrefix} Final remote op to apply to local text:`, JSON.parse(JSON.stringify(transformedRemoteOps)));
        console.log(`${logPrefix} Final new local pending ops list:`, JSON.parse(JSON.stringify(newTransformedLocalPendingOpsList)));

        flushSync(() => {
            setPartsState(prev => {
                const partFromPrev = prev[partId];
                if (!partFromPrev) {
                    console.warn(`${logPrefix} Part ${partId} not found in prev state during remote op flushSync. This should not happen.`);
                    return prev;
                }
                const partToUpdate = {...partFromPrev};

                partToUpdate[localPendingOpsKey] = newTransformedLocalPendingOpsList;

                if (transformedRemoteOps.length > 0) {
                    const textBeforeApply = partToUpdate[localTextKey];
                    try {
                        console.log(`${logPrefix} Applying final transformed remote ops to local text. Text before: "${textBeforeApply.substring(0, 50)}..."`);
                        partToUpdate[localTextKey] = applyOps(textBeforeApply, transformedRemoteOps);
                        partToUpdate[localLastSentTextKey] = partToUpdate[localTextKey];
                        if (target === OperationTarget.Text) {
                            partToUpdate[localWordCountKey] = calculateWordCount(partToUpdate[localTextKey]);
                        }
                        console.log(`${logPrefix} Local text after applying remote ops: "${partToUpdate[localTextKey].substring(0, 50)}..."`);
                        // eslint-disable-next-line
                    } catch (e: any) {
                        console.error(`${logPrefix} Error applying final transformed remote ops:`, e.message, {
                            text: textBeforeApply,
                            ops: transformedRemoteOps,
                            stack: e.stack
                        });
                    }
                } else {
                    console.log(`${logPrefix} No remote operations to apply to local text after transformations.`);
                }

                partToUpdate[localVersionKey] = payload_applied_version;

                console.log(`${logPrefix} State updated. New local version: ${partToUpdate[localVersionKey]}, New pending ops count: ${partToUpdate[localPendingOpsKey].length}`);
                return {...prev, [partId]: partToUpdate};
            });
        });

        if (selectionBeforeAnyStateUpdate && transformedRemoteOps.length > 0) {
            const elementRef = target === OperationTarget.Name
                ? nameInputRefs.current?.[partId]
                : textAreaRefs.current?.[partId];

            if (elementRef) {
                const newStartOriginal = transformPosition(transformedRemoteOps, selectionBeforeAnyStateUpdate.start);
                const newEndOriginal = transformPosition(transformedRemoteOps, selectionBeforeAnyStateUpdate.end);

                const textLength = elementRef.value.length;
                const safeNewStart = Math.min(newStartOriginal, textLength);
                const safeNewEnd = Math.min(newEndOriginal, textLength);
                const finalStart = Math.min(safeNewStart, safeNewEnd);
                const finalEnd = Math.max(safeNewStart, safeNewEnd);

                if (target === OperationTarget.Name && document.activeElement !== elementRef) {
                    elementRef.focus();
                }

                elementRef.selectionStart = finalStart;
                elementRef.selectionEnd = finalEnd;

                if (selectionPositionsRef.current[partId]) {
                    selectionPositionsRef.current[partId] = {start: finalStart, end: finalEnd};
                }

                sendCursorPositionChange({
                    part_id: partId,
                    cursor_position: finalStart,
                    selection_anchor_position: finalEnd !== finalStart ? finalEnd : null,
                    target: target
                });
                console.log(`${logPrefix} Selection restored/updated. Original: ${JSON.stringify(selectionBeforeAnyStateUpdate)}, New: {start:${finalStart}, end:${finalEnd}}`);
            } else {
                console.log(`${logPrefix} Skipped selection restoration (element ref missing).`);
            }
        }
    }, [partsStateRef, profileRef, sendCursorPositionChange, transform, applyOps, transformPosition]);


    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>, partId: number) => {
        const currentText = e.target.value;
        const wordCount = calculateWordCount(currentText);

        const textAreaRef = textAreaRefs.current[partId];
        const cursorPos = textAreaRef ? textAreaRef.selectionStart : 0;

        const now = Date.now();
        const lastUpdate = lastHistoryUpdateRefs.current[partId] || 0;
        const timeDiff = now - lastUpdate;

        setPartsState(prev => {
            const prevPart = prev[partId];
            if (!prevPart) return prev;

            if (prevPart.partText === currentText) return prev;

            const newState = {
                ...prevPart,
                partText: currentText,
                wordCount,
                textSelection: {
                    start: cursorPos,
                    end: cursorPos
                }
            };

            const currentHistory = [...prevPart.history];
            const currentPos = prevPart.historyPosition;

            const slicedHistory = currentPos < currentHistory.length - 1
                ? currentHistory.slice(0, currentPos + 1)
                : currentHistory;

            if (timeDiff < HISTORY_BATCH_TIMEOUT && currentPos > 0 && slicedHistory.length > 0) {
                slicedHistory[slicedHistory.length - 1] = {
                    ...slicedHistory[slicedHistory.length - 1],
                    text: currentText
                };

                newState.history = slicedHistory;
            } else {
                newState.history = [
                    ...slicedHistory,
                    {
                        text: currentText,
                        cursorPos,
                        selectionStart: cursorPos,
                        selectionEnd: cursorPos
                    }
                ];
                newState.historyPosition = newState.history.length - 1;
            }

            return {
                ...prev,
                [partId]: newState
            };
        });

        lastHistoryUpdateRefs.current = {
            ...lastHistoryUpdateRefs.current,
            [partId]: now
        };

        if (historyTimeoutRefs.current[partId]) {
            clearTimeout(historyTimeoutRefs.current[partId]);
        }

        historyTimeoutRefs.current[partId] = setTimeout(() => {
            lastHistoryUpdateRefs.current = {
                ...lastHistoryUpdateRefs.current,
                [partId]: 0
            };

            setPartsState(prev => {
                return prev;
            });
        }, HISTORY_BATCH_TIMEOUT);

        if (scheduledSendRefs.current[partId]) {
            clearTimeout(scheduledSendRefs.current[partId]);
        }

        sendOps(partId, currentText, OperationTarget.Text);
    };

    const handleNameEditStart = (partId: number) => {
        setPartsState(prev => ({
            ...prev,
            [partId]: {
                ...prev[partId],
                editingName: true
            }
        }));

        setTimeout(() => {
            if (nameInputRefs.current[partId]) {
                nameInputRefs.current[partId]?.focus();
            }
        }, 10);
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>, partId: number) => {
        const newName = e.target.value;

        setPartsState(prev => ({
            ...prev,
            [partId]: {
                ...prev[partId],
                nameText: newName
            }
        }));

        const timeout = scheduledSendRefs.current[`name_${partId}`];
        if (timeout) {
            clearTimeout(timeout);
        }

        sendOps(partId, newName, OperationTarget.Name);
    };

    const handleNameSave = (partId: number) => {
        setPartsState(prev => ({
            ...prev,
            [partId]: {
                ...prev[partId],
                editingName: false
            }
        }));

        const partState = partsState[partId];
        if (partState) {
            updatePart(partId, {
                part_order: partState.part_order,
                part_assignee_participant_id: partState.assignee_participant_id
            });
        }
    };

    const handleSelectionChange = (partId: number, target: 'text' | 'name') => {
        const elementRef = target === 'text'
            ? textAreaRefs.current[partId]
            : nameInputRefs.current[partId];

        if (!elementRef) return;

        const start = elementRef.selectionStart;
        const end = elementRef.selectionEnd;

        console.log('[CURSOR] handleSelectionChange', {
            partId, target, start, end,
            elementValue: elementRef.value,
            selectionPositionsRef: selectionPositionsRef.current[partId],
            active: document.activeElement === elementRef
        });

        if (target === 'text') {
            setPartsState(prev => ({
                ...prev,
                [partId]: {
                    ...prev[partId],
                    textSelection: {start: start ?? 0, end: end ?? 0}
                }
            }));
        }

        sendCursorPositionChange({
            part_id: partId,
            cursor_position: start ?? 0,
            selection_anchor_position: end !== start ? end : null,
            target: target === 'text' ? OperationTarget.Text : OperationTarget.Name
        });
    };


    const handleUndo = (partId: number) => {
        const part = partsState[partId];
        if (!part) return;

        const currentPos = part.historyPosition;
        if (currentPos <= 0) return;

        const newPos = currentPos - 1;
        const history = part.history;
        if (!history[newPos]) return;

        const historyItem = history[newPos];

        setPartsState(prev => ({
            ...prev,
            [partId]: {
                ...prev[partId],
                partText: historyItem.text,
                historyPosition: newPos,
                wordCount: calculateWordCount(historyItem.text)
            }
        }));

        sendOps(partId, historyItem.text, OperationTarget.Text);

        setTimeout(() => {
            const textAreaRef = textAreaRefs.current[partId];
            if (textAreaRef) {
                const currentText = part.partText;
                const historyText = historyItem.text;

                let divergeIndex = 0;
                const minLength = Math.min(currentText.length, historyText.length);

                while (divergeIndex < minLength && currentText[divergeIndex] === historyText[divergeIndex]) {
                    divergeIndex++;
                }

                const cursorPosition = Math.min(divergeIndex, historyItem.text.length);

                textAreaRef.selectionStart = cursorPosition;
                textAreaRef.selectionEnd = cursorPosition;
                textAreaRef.focus();
            }
        }, 0);
    };

    const handleRedo = (partId: number) => {
        const part = partsState[partId];
        if (!part) return;

        const currentPos = part.historyPosition;
        const history = part.history;
        if (currentPos >= history.length - 1) return;

        const newPos = currentPos + 1;
        const historyItem = history[newPos];

        const oldText = part.partText;
        const newText = historyItem.text;

        setPartsState(prev => ({
            ...prev,
            [partId]: {
                ...prev[partId],
                partText: historyItem.text,
                historyPosition: newPos,
                wordCount: calculateWordCount(historyItem.text)
            }
        }));

        sendOps(partId, historyItem.text, OperationTarget.Text);

        setTimeout(() => {
            const textAreaRef = textAreaRefs.current[partId];
            if (textAreaRef) {
                let startDiff = 0;
                const minLength = Math.min(oldText.length, newText.length);

                while (startDiff < minLength && oldText[startDiff] === newText[startDiff]) {
                    startDiff++;
                }

                let endDiff = 0;
                while (endDiff < minLength - startDiff &&
                oldText[oldText.length - 1 - endDiff] === newText[newText.length - 1 - endDiff]) {
                    endDiff++;
                }

                if (newText.length > oldText.length) {
                    const cursorPos = startDiff + (newText.length - oldText.length);
                    textAreaRef.selectionStart = cursorPos;
                    textAreaRef.selectionEnd = cursorPos;
                } else {
                    textAreaRef.selectionStart = startDiff;
                    textAreaRef.selectionEnd = startDiff;
                }

                textAreaRef.focus();
            }
        }, 0);
    };


    const handleCreatePart = async (afterPartId?: number, atStart?: boolean) => {
        const orderedPartStates = Object.entries(partsState)
            .map(([id, state]) => ({id: parseInt(id), order: state.part_order}))
            .sort((a, b) => a.order - b.order);

        let nextOrder: number;

        if (atStart) {
            nextOrder = 0;
            setPartsState(prev => {
                const newState = {...prev};
                Object.entries(newState).forEach(([partIdStr, partState]) => {
                    newState[+partIdStr] = {
                        ...partState,
                        part_order: partState.part_order + 1
                    };
                });
                return newState;
            });
        } else if (typeof afterPartId === 'number') {
            const afterPartState = partsState[afterPartId];
            if (afterPartState) {
                const currentOrder = Math.floor(afterPartState.part_order);
                nextOrder = currentOrder + 1;

                setPartsState(prev => {
                    const newState = {...prev};
                    Object.entries(newState).forEach(([partIdStr, partState]) => {
                        if (parseInt(partIdStr) !== afterPartId && partState.part_order >= nextOrder) {
                            newState[+partIdStr] = {
                                ...partState,
                                part_order: partState.part_order + 1
                            };
                        }
                    });
                    return newState;
                });
            } else {
                nextOrder = orderedPartStates.length > 0
                    ? Math.max(...orderedPartStates.map(p => Math.floor(partsState[p.id].part_order))) + 1
                    : 0;
            }
        } else {
            const maxOrder = orderedPartStates.length > 0
                ? Math.max(...orderedPartStates.map(p => Math.floor(partsState[p.id].part_order)))
                : -1;
            nextOrder = maxOrder + 1;
        }

        const newPart = await createPart({part_order: nextOrder});

        if (newPart) {
            setTimeout(() => {
                const newPartElement = partSectionRefs.current[newPart.part_id];
                if (newPartElement) {
                    newPartElement.scrollIntoView({behavior: 'smooth', block: 'center'});
                }
            }, 300);
        }
    };


    const requestDeletePart = (partId: number) => {
        setConfirmDeletePartId(partId);
        setDeletePartName(partsState[partId]?.nameText || "");
    };

    const confirmDeletePart = async () => {
        if (confirmDeletePartId === null) return;

        const deletedPartOrder = partsState[confirmDeletePartId]?.part_order;

        await deletePart(confirmDeletePartId);

        if (deletedPartOrder !== undefined) {
            const ordered = Object.entries(partsStateRef.current)
                .filter(([id]) => parseInt(id) !== confirmDeletePartId)
                .map(([id, p]) => ({id: parseInt(id), order: p.part_order}))
                .sort((a, b) => a.order - b.order);

            const deletedIndex = ordered.findIndex(p => p.order > deletedPartOrder);
            const fallbackIndex = deletedIndex !== -1 ? deletedIndex : ordered.length - 1;
            const nextPartId = ordered[fallbackIndex]?.id ?? null;

            setPartsState(prev => {
                const newState = {...prev};
                delete newState[confirmDeletePartId];

                Object.entries(newState).forEach(([id, state]) => {
                    const pid = parseInt(id);
                    if (state.part_order > deletedPartOrder) {
                        newState[pid] = {
                            ...state,
                            part_order: state.part_order - 1
                        };
                    }
                });

                return newState;
            });

            setTimeout(() => {
                setVisiblePartId(nextPartId);
            }, 50);
        }

        setConfirmDeletePartId(null);
    };

    const handleAssigneeChange = async (partId: number, assigneeParticipantId: number) => {
        const partState = partsState[partId];
        if (partState) {
            setPartsState(prev => ({
                ...prev,
                [partId]: {
                    ...prev[partId],
                    assignee_participant_id: assigneeParticipantId
                }
            }));

            await updatePart(partId, {
                part_order: partState.part_order,
                part_assignee_participant_id: assigneeParticipantId
            });
        }
    };

    const handleReorderParts = (result: DropResult) => {
        if (!result.destination) return;

        const sourceIndex = result.source.index;
        const destIndex = result.destination.index;

        if (sourceIndex === destIndex) return;

        const orderedPartIds = Object.entries(partsState)
            .map(([id, state]) => ({id: parseInt(id), order: state.part_order}))
            .sort((a, b) => a.order - b.order)
            .map(p => p.id);

        const movingPartId = orderedPartIds[sourceIndex];
        const movingPart = partsState[movingPartId];

        if (!movingPart) return;

        const normalizedOrders = orderedPartIds.map((id, index) => ({id, order: index}));

        const movingItem = normalizedOrders.splice(sourceIndex, 1)[0];
        normalizedOrders.splice(destIndex, 0, movingItem);

        const finalOrders = normalizedOrders.map((item, index) => ({
            id: item.id,
            order: index
        }));

        setPartsState(prev => {
            const newState = {...prev};

            finalOrders.forEach(item => {
                newState[item.id] = {
                    ...newState[item.id],
                    part_order: item.order
                };
            });

            return newState;
        });

        finalOrders.forEach(item => {
            const current = partsState[item.id];
            if (current && item.id === movingPartId) {
                updatePart(item.id, {
                    part_order: item.order,
                    part_assignee_participant_id: current.assignee_participant_id
                });
            }
        });
    };

    const handleBack = () => {
        Object.entries(partsState).forEach(([partIdStr, partState]) => {
            const partId = parseInt(partIdStr, 10);
            const originalPart = parts.find(p => p.part_id === partId);

            if (originalPart && partState.partText !== originalPart.part_text &&
                (!partState.pendingOperations || partState.pendingOperations.length === 0)) {

                updatePart(partId, {
                    part_order: partState.part_order,
                    part_assignee_participant_id: partState.assignee_participant_id
                });
            }
        });

        navigate(`/presentation/${presentationId}`);
    };

    const getAssigneeInfo = (assignee_participant_id?: number) => {
        if (!assignee_participant_id || !participants) return null;

        const participant = participants.find(p => p.participant_id === assignee_participant_id);
        return participant ? participant.user : null;
    };

    const participantColors = useMemo(() => {
        if (!participants) return {};

        const colorMap: { [key: number]: string } = {};
        participants.forEach(p => {
            colorMap[p.user.user_id] = p.color;
        });
        return colorMap;
    }, [participants]);

    const partDurations = useMemo(() => {
        const durations: { [key: number]: string } = {};
        Object.entries(partsState).forEach(([partIdStr, partState]) => {
            const partId = parseInt(partIdStr, 10);
            durations[partId] = config ? getPartDuration(partState.wordCount, config) : '';
        });
        return durations;
    }, [partsState, config]);

    const handlePartClick = (partId: number) => {
        const element = document.getElementById(`part-${partId}`);
        if (element) {
            element.scrollIntoView({behavior: 'smooth', block: 'center'});
        }
    };

    const orderedParts = useMemo(() => {
        return Object.entries(partsState)
            .map(([idStr, state]) => ({
                part_id: parseInt(idStr),
                part_order: state.part_order,
                assignee_participant_id: state.assignee_participant_id || 0,
                part_text: state.partText,
                part_name: state.nameText
            }))
            .sort((a, b) => a.part_order - b.part_order);
    }, [partsState]);

    if (isFirstLoad) {
        return <div className="loading-container">Завантаження...</div>;
    }
    
    if (!partsLoading && parts.length === 0) {
        return (
            <div className="empty-presentation">
                <div className="empty-message">Немає доступних частин</div>
                <button className="add-part-button" onClick={() => handleCreatePart()} disabled={isPresentationStarted}>
                    <img src={addIcon} alt="Add" className="add-icon"/>
                    Додати частину
                </button>
            </div>
        );
    }


    return (
        <div className="presentation-text-editor">
            <Title>
                {`${presentation?.name ? `${presentation.name} | ` : ''}Редагування тексту – ScriptGlance`}
            </Title>
            <ParticipantsHeader
                pageType='editor'
                presentationName={presentationName}
                participants={participants}
                editorActiveUsers={activeUsers}
                profile={profile as UserProfile | undefined}
                onBack={handleBack}
            />


            <div className="editor-container">
                <DragDropContext
                    onDragStart={(start) => {
                        const dragId = parseInt(start.draggableId.replace('part-', ''));
                        setIsDragging(true);
                        setDraggedItemId(dragId);

                        const element = document.getElementById(`part-${dragId}`);
                        if (element) {
                            element.classList.add('is-dragging');
                        }
                    }}
                    onDragEnd={(result) => {
                        setIsDragging(false);

                        if (draggedItemId) {
                            const element = document.getElementById(`part-${draggedItemId}`);
                            if (element) {
                                const style = element.style;

                                style.transform = 'none';
                                style.top = 'unset';
                                style.left = 'unset';
                                style.position = 'relative';
                            }

                            element?.classList.remove('is-dragging');
                            element?.classList.add('part-section-settling');

                            setTimeout(() => {
                                element?.classList.remove('part-section-settling');
                            }, 300);
                        }

                        setDraggedItemId(null);

                        handleReorderParts(result);
                    }}
                >
                    <Droppable droppableId="parts-editor" direction="vertical">
                        {(provided) => (
                            <div
                                className="parts-editor"
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                            >
                                <div
                                    className="part-gap"
                                    style={{pointerEvents: isPresentationStarted ? 'none' : 'auto'}}
                                    onMouseEnter={() => setShowAddPartBtn(-1)}
                                    onMouseLeave={() => setShowAddPartBtn(null)}
                                >
                                    {showAddPartBtn === -1 && !isPresentationStarted && (
                                        <div className="add-part-hover">
                                            <button
                                                className="add-part-hover-btn"
                                                onClick={() => handleCreatePart(undefined, true)}
                                                disabled={isPresentationStarted}
                                            >
                                                <img src={addIcon} alt="Add" className="add-icon"/>
                                                Додати частину
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {orderedParts.map((part, index) => {
                                    const partId = part.part_id;
                                    const partData = partsState[partId];

                                    if (!partData) return null;

                                    const assignee = getAssigneeInfo(part.assignee_participant_id);
                                    const participantColor = participants?.find(p => p.participant_id === part.assignee_participant_id)?.color || '#6b7280';

                                    return (
                                        <React.Fragment key={partId}>
                                            {index > 0 && (
                                                <div
                                                    className="part-gap"
                                                    style={{pointerEvents: isPresentationStarted ? 'none' : 'auto'}}
                                                    onMouseEnter={() => setShowAddPartBtn(index - 1)}
                                                    onMouseLeave={() => setShowAddPartBtn(null)}
                                                >
                                                    {showAddPartBtn === index - 1 && !isPresentationStarted && (
                                                        <div className="add-part-hover">
                                                            <button
                                                                className="add-part-hover-btn"
                                                                onClick={() => handleCreatePart(orderedParts[index - 1].part_id)}
                                                            >
                                                                <img src={addIcon} alt="Add" className="add-icon"/>
                                                                Додати частину
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <Draggable key={`part-${partId}-index-${index}`}
                                                       draggableId={`part-${partId}`} index={index}
                                                       disableInteractiveElementBlocking={false}
                                                       isDragDisabled={isPresentationStarted}>
                                                {(provided) => (
                                                    <div
                                                        ref={(el) => {
                                                            provided.innerRef(el);
                                                            partSectionRefs.current[partId] = el;
                                                        }}
                                                        className="part-section"
                                                        id={`part-${partId}`}
                                                        {...provided.draggableProps}
                                                        style={{
                                                            ...provided.draggableProps.style,
                                                            borderLeftColor: participantColor
                                                        }}
                                                    >
                                                        <div className="part-header" {...provided.dragHandleProps}>
                                                            <div className="part-number">Частина {index + 1}</div>

                                                            <PartTitleEditor
                                                                partId={partId}
                                                                text={partData.nameText}
                                                                isEditing={partData.editingName}
                                                                activeUsers={activeUsers}
                                                                participantColors={participantColors}
                                                                participants={participants}
                                                                currentUserId={(profile as UserProfile | undefined)?.user_id}
                                                                onEditStart={() => handleNameEditStart(partId)}
                                                                onTextChange={(e) => handleNameChange(e, partId)}
                                                                onSave={() => handleNameSave(partId)}
                                                                onSelectionChange={(e) => {
                                                                    const target = e.target as HTMLInputElement;
                                                                    const start = target.selectionStart ?? 0;
                                                                    const end = target.selectionEnd ?? 0;
                                                                    selectionPositionsRef.current[partId] = {
                                                                        start,
                                                                        end
                                                                    };
                                                                    handleSelectionChange(partId, 'name');
                                                                }}
                                                                inputRef={(ref) => nameInputRefs.current[partId] = ref}
                                                                resizeTick={resizeTick}
                                                                disabled={isPresentationStarted}
                                                            />

                                                            <div className="part-actions">
                                                                <div className={`part-assignee-dropdown ${isPresentationStarted ? 'disabled' : ''}`}>
                                                                    <Dropdown
                                                                        overlay={
                                                                            <Menu>
                                                                                {participants?.filter(participant => participant.participant_id !== partData.assignee_participant_id)?.map(participant => (
                                                                                    <Menu.Item
                                                                                        key={participant.participant_id}
                                                                                        onClick={() => handleAssigneeChange(partId, participant.participant_id)}
                                                                                    >
                                                                                        <div
                                                                                            className="assignee-menu-item">
                                                                                            <Avatar
                                                                                                src={
                                                                                                    participant.user.avatar
                                                                                                        ? `${import.meta.env.VITE_APP_API_BASE_URL}${participant.user.avatar}`
                                                                                                        : null
                                                                                                }
                                                                                                alt={`${participant.user.first_name} ${participant.user.last_name}`}
                                                                                                size={24}
                                                                                                name={participant.user.first_name}
                                                                                                surname={participant.user.last_name}
                                                                                                bgColor={participant.color}
                                                                                            />
                                                                                            <span>
                                                                                            {participant.user.first_name} {participant.user.last_name}
                                                                                        </span>
                                                                                        </div>
                                                                                    </Menu.Item>
                                                                                ))}
                                                                            </Menu>
                                                                        }
                                                                        trigger={['click']}
                                                                        disabled={isPresentationStarted}
                                                                    >
                                                                        <div className="part-assignee">
                                                                            <div className="assignee-info">
                                                                                <Avatar
                                                                                    src={
                                                                                        assignee?.avatar
                                                                                            ? `${import.meta.env.VITE_APP_API_BASE_URL}${assignee.avatar}`
                                                                                            : null
                                                                                    }
                                                                                    alt={assignee ? `${assignee.first_name} ${assignee.last_name}` : 'Невідомий'}
                                                                                    size={30}
                                                                                    name={assignee?.first_name || ''}
                                                                                    surname={assignee?.last_name || ''}
                                                                                    bgColor={participantColors[assignee?.user_id || 0]}
                                                                                />
                                                                                <span className="assignee-name">
                                                                              {assignee ? (
                                                                                  <>
                                                                                      {assignee.first_name}
                                                                                      <br/>
                                                                                      {assignee.last_name}
                                                                                  </>
                                                                              ) : 'Невідомий'}
                                                                            </span>
                                                                            </div>
                                                                            <img src={dropdownIcon} alt="Dropdown"
                                                                                 className="dropdown-icon"/>
                                                                        </div>
                                                                    </Dropdown>

                                                                </div>

                                                                <button
                                                                    className="part-delete-btn"
                                                                    onClick={() => requestDeletePart(partId)}
                                                                    disabled={orderedParts.length === 1 || isPresentationStarted}
                                                                    title="Видалити частину"
                                                                >
                                                                    <img src={deleteIcon} alt="Delete"/>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <PartEditor
                                                            partId={partId}
                                                            text={partData.partText}
                                                            pendingOpsCount={partData.pendingOperations.length}
                                                            wordCount={partData.wordCount}
                                                            durationText={partDurations[partId] || ''}
                                                            activeUsers={activeUsers}
                                                            participantColors={participantColors}
                                                            participants={participants || []}
                                                            currentUserId={(profile as UserProfile | undefined)?.user_id}
                                                            textAreaRef={(ref) => textAreaRefs.current[partId] = ref}
                                                            onTextChange={(e) => handleTextChange(e as React.ChangeEvent<HTMLTextAreaElement>, partId)}
                                                            onSelectionChange={(e) => {
                                                                const target = e.target as HTMLTextAreaElement;
                                                                const start = target.selectionStart ?? 0;
                                                                const end = target.selectionEnd ?? 0;
                                                                selectionPositionsRef.current[partId] = {start, end};
                                                                handleSelectionChange(partId, 'text');
                                                            }}
                                                            onUndo={() => handleUndo(partId)}
                                                            onRedo={() => handleRedo(partId)}
                                                            resizeTick={resizeTick}
                                                            disabled={isPresentationStarted}
                                                        />
                                                    </div>
                                                )}
                                            </Draggable>
                                        </React.Fragment>
                                    )
                                        ;
                                })}

                                {provided.placeholder}

                                {!isPresentationStarted && <div className="add-part-container">
                                    <button
                                        className="add-part-button"
                                        onClick={() => handleCreatePart()}
                                    >
                                        <img src={addIcon} alt="Add" className="add-icon"/>
                                        Додати частину
                                    </button>
                                </div>}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

                <StructureSidebar
                    totalDuration={config ? getPartDuration(totalWordCount, config, false) : ''}
                    parts={orderedParts.map(part => {
                        return {
                            part_id: part.part_id,
                            assignee_user_id: participants.find(p => p.participant_id === part.assignee_participant_id)?.user.user_id || 0,
                            part_name: Object.entries(partsState).find(([id]) => parseInt(id) === part.part_id)?.[1].nameText || '',
                        }
                    })}
                    participants={participants || []}
                    onPartClick={handlePartClick}
                    highlightedPartId={visiblePartId}
                />

                <ConfirmationModal
                    open={confirmDeletePartId !== null}
                    onClose={() => setConfirmDeletePartId(null)}
                    onConfirm={confirmDeletePart}
                    confirmationTitle={`Ви впевнені, що хочете видалити частину «${deletePartName}»?`}
                    reloadAfterDelete={false}
                />

            </div>
        </div>
    );
};

export default PresentationTextEditorPage;