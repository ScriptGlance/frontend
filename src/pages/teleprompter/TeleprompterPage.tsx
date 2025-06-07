import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {useProfile} from '../../hooks/ProfileContext';
import ParticipantsHeader from '../../components/participantsHeader/ParticipantsHeader';
import StructureSidebar, {SidebarPart} from '../../components/structureSidebar/StructureSidebar';

import {
    usePresentationDetails,
    usePresentationParticipants,
    usePresentationsConfig,
    usePresentationVideos
} from '../../hooks/usePresentationData';
import {
    Participant,
    PresentationActiveCurrentReadingPosition,
    PresentationActiveJoinedUser
} from '../../api/repositories/presentationsRepository.ts';
import {usePresentationParts} from "../../hooks/usePresentationParts.ts";

import {
    useActiveTeleprompterData,
    useConfirmActiveReader,
    useParticipantsVideosLeft,
    useSetActiveReader,
    useSetTeleprompterRecordingMode,
    useStartPresentation,
    useStopPresentation,
} from '../../hooks/useTeleprompterPresentation';


import './TeleprompterPage.css';
import {useTeleprompterSocket} from "../../hooks/useTeleprompterSocket.ts";
import {usePresentationSocket} from "../../hooks/usePresentationSocket.ts";
import {PresentationEvent, PresentationEventType} from "../../api/socket/presentationSocketManager.ts";
import {findLastNonWhitespaceIdx, handleSpeechRecognitionResult} from "../../utils/speechTextUtils.ts";

import errorIcon from '../../assets/error-icon.svg';
import zoomInIcon from '../../assets/zoom-in-icon.svg';
import zoomOutIcon from '../../assets/zoom-out-icon.svg';
import videoOnIcon from '../../assets/video-on-icon.svg';
import videoOffIcon from '../../assets/video-off-icon.svg';
import exitIcon from '../../assets/exit-icon.svg';
import SnackbarContainer, {SnackbarItem} from "../../components/snackbar/SnackbarContainer.tsx";
import DraggableReassignModal, {Candidate} from "../../components/draggableWindow/reassign/DraggableReassignModal.tsx";
import {ParticipantVideoCount} from "../../api/repositories/teleprompterPresentationRepository.ts";
import {truncateText} from "../../utils/textUtils.ts";
import {useTeleprompterVideoRecorder} from "../../hooks/useTeleprompterVideoRecorder.ts";
import {getNotUploadedVideoCount} from "../../api/repositories/videoStorageRepository.ts";
import {
    IncomingReadingPositionPayload,
    OwnerChangedPayload,
    PartReassignReason,
    PresenceEventType,
    RecordingModeChangedPayload,
    TeleprompterPresencePayload
} from "../../api/socket/teleprompterPresentationSocketManager.ts";
import {SnackbarProps} from "../../components/snackbar/Snackbar.tsx";
import {PUNCTUATION_REGEX} from "../../contstants.ts";
import {Role} from "../../types/role.ts";
import {UserProfile} from "../../api/repositories/profileRepository.ts";
import {Title} from "react-head";

interface CustomSpeechRecognition extends SpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
}

const SpeechRecognitionAPI = (window.SpeechRecognition || window.webkitSpeechRecognition) as {
    new(): CustomSpeechRecognition;
};

const WAITING_FOR_USER_SNACKBAR_KEY = 'waiting-for-user';


const TeleprompterPage: React.FC = () => {
    const {id: presentationIdParam} = useParams<{ id: string }>();
    const presentationId = parseInt(presentationIdParam || "0", 10);
    const {profile} = useProfile(Role.User);

    const profileRef = useRef(profile);

    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    const highlightedPartIdRef = useRef<number | null>(null);

    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const [isSocketConnected, setIsSocketConnected] = useState(true);
    const [showSocketError, setShowSocketError] = useState(false);

    const {presentation, refetch: refetchPresentationDetails} = usePresentationDetails(presentationId);
    const {participants, refetch: refetchParticipants} = usePresentationParticipants(presentationId);
    const {
        parts,
        loading: partsLoading,
        error: partsError,
        refetch: refetchParts
    } = usePresentationParts(presentationId);

    const {
        activeData,
        loading: activeDataLoading,
        error: activeDataError,
        refetch: refetchActiveData
    } = useActiveTeleprompterData(presentationId, false);

    const {loading: recordingLoading, setRecordingMode} = useSetTeleprompterRecordingMode();

    const [participantVideosLeft, setParticipantVideosLeft] = useState<ParticipantVideoCount[]>([]);
    const {refetch: refetchParticipantsVideosLeft} = useParticipantsVideosLeft(presentationId, {
        onSet: setParticipantVideosLeft
    });

    const {loading: reassignLoading, setActiveReader} = useSetActiveReader();
    const {confirmActiveReader} = useConfirmActiveReader();

    const {startPresentation} = useStartPresentation();
    const {stopPresentation} = useStopPresentation();

    const [currentTeleprompterOwnerId, setCurrentTeleprompterOwnerId] = useState<number | null>(null);
    const [teleprompterActiveUsers, setTeleprompterActiveUsers] = useState<PresentationActiveJoinedUser[]>([]);
    const [currentPresentationStartDate, setCurrentPresentationStartDate] = useState<string | null>(null);
    const [currentHighlightedPartId, setCurrentHighlightedPartId] = useState<number | null>(null);
    const [initialReadingPosition, setInitialReadingPosition] = useState<PresentationActiveCurrentReadingPosition | null>(null);
    const [readingConfirmationActive, setReadingConfirmationActive] = useState(false);
    const previousHighlightedPartIdRef = useRef<number | null>(null);
    const initialLoadCompleteRef = useRef<boolean | null>(null);
    const {config} = usePresentationsConfig();
    const maxFreeSeconds = config?.premium_config.max_free_recording_time_seconds ?? 600;
    const maxFreeVideoCount = config?.premium_config.max_free_video_count ?? 10;
    const {videos} = usePresentationVideos(presentationId);
    const myUploadedVideosCount = useMemo(() => (
        videos.filter(v => v.video_author.user_id === (profile as UserProfile | undefined)?.user_id).length
    ), [videos, (profile as UserProfile | undefined)?.user_id]);

    const [myNotUploadedVideos, setMyNotUploadedVideos] = useState(0);

    const myTotalVideoCount = myUploadedVideosCount + myNotUploadedVideos;
    const isVideoRecordingAllowed = !!(profile as UserProfile | undefined)?.has_premium || (myTotalVideoCount < maxFreeVideoCount);
    const isVideoRecordingAllowedRef = useRef(isVideoRecordingAllowed);

    useEffect(() => {
        isVideoRecordingAllowedRef.current = isVideoRecordingAllowed;
    }, [isVideoRecordingAllowed]);

    const updateNotUploadedVideos = useCallback(async () => {
        if (!presentationId) return;
        const count = await getNotUploadedVideoCount(presentationId);
        setMyNotUploadedVideos(count);
    }, [presentationId]);

    useEffect(() => {
        updateNotUploadedVideos();
    }, [updateNotUploadedVideos]);


    const recognitionRef = useRef<CustomSpeechRecognition | null>(null);
    const [isRecognizing, setIsRecognizing] = useState(false);
    const isRecognizingRef = useRef(false);
    const [processedWordsIndices, setProcessedWordsIndices] = useState<Record<number, number>>({});
    const processedWordsIndicesRef = useRef(processedWordsIndices);

    const videosLeftByUserId = useMemo(() => {
        const map: Record<number, number | null> = {};
        participantVideosLeft.forEach(({user_id, videos_left}) => {
            map[user_id] = videos_left;
        });
        return map;
    }, [participantVideosLeft]);

    const recognitionStartAttemptedRef = useRef(false);
    const lastRecognitionResultTimeRef = useRef<number>(0);
    const forceRestartingRef = useRef(false);
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeAtCurrentPositionRef = useRef<number>(0);
    const currentPositionRef = useRef<{ partId: number, wordIdx: number } | null>(null);
    const progressCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const inEndZoneRef = useRef(false);
    const teleprompterActiveUsersRef = useRef<PresentationActiveJoinedUser[]>([]);
    const participantsRef = useRef<Participant[]>(participants || []);
    const previousOwnerIdRef = useRef<number | null>(null);
    const readingConfirmationActiveRef = useRef(readingConfirmationActive);
    const lastSentFinalPositionRef = useRef<{ [partId: number]: boolean }>({});
    const [isVideoAutoStoppedByDuration, setVideoAutoStoppedByDuration] = useState(false);


    const [localStructure, setLocalStructure] = useState(activeData?.structure || []);
    const localStructureRef = useRef(localStructure);

    useEffect(() => {
        setLocalStructure(activeData?.structure || []);
    }, [activeData?.structure]);

    const [snackbars, setSnackbars] = useState<(SnackbarProps & { key?: string })[]>([]);

    const addSnackbar = useCallback(
        (props: SnackbarProps & { key?: string }) => {
            const key = props.key || (Date.now() + Math.random() + "");
            setSnackbars(snacks => {
                const exists = snacks.some(s => s.key === key);
                if (exists) {
                    return snacks.map(s =>
                        s.key === key
                            ? {...s, ...props, key, onClose: () => removeSnackbar(key)}
                            : s
                    );
                }
                return [
                    ...snacks,
                    {
                        ...props,
                        key,
                        onClose: () => removeSnackbar(key),
                    },
                ];
            });
        },
        []
    );

    const removeSnackbar = (key: string) => {
        setSnackbars(snacks => snacks.filter(s => s.key !== key));
    };

    const [reassignModal, setReassignModal] = useState<{
        visible: boolean,
        reason: string,
        partName: string,
        partId: number | null,
        selectedId: number | null,
        targetUserId: number | null
    }>({
        visible: false, reason: '', partName: '', partId: null, selectedId: null, targetUserId: null
    });

    const candidates: Candidate[] = useMemo(() => {
        if (!reassignModal.visible) return [];
        return teleprompterActiveUsers.map(u => {
            const participant = participants?.find(p => p.user?.user_id === u.userId);
            const user = participant!.user;
            const videosLeft = videosLeftByUserId[user.user_id];
            return {
                id: user.user_id,
                firstName: user?.first_name ?? '',
                lastName: user?.last_name ?? '',
                avatar: user?.avatar ?? null,
                subtitle: user?.has_premium
                    ? 'Преміум'
                    : `Залишилося ${videosLeft != null ? videosLeft : '–'} відео`,
                color: participant?.color ?? '#000000',
            }
        }).filter(Boolean);
    }, [reassignModal.visible, activeData, teleprompterActiveUsers, participants, videosLeftByUserId, participantVideosLeft]);

    useEffect(() => {
        if (!reassignModal.visible) return;
        if (reassignModal.selectedId && !candidates.some(c => c.id === reassignModal.selectedId)) {
            setReassignModal(m => ({...m, selectedId: null}));
        }
    }, [candidates, reassignModal.selectedId, reassignModal.visible]);

    const showReadingConfirmationSnackbar = ({
                                                 partName,
                                                 canContinue,
                                                 timerText,
                                                 onStart,
                                                 onContinue,
                                                 onClose,
                                             }: {
        partName: string,
        canContinue: boolean,
        timerText: string | undefined,
        onStart: () => void,
        onContinue: () => void,
        onClose: () => void,
    }) => {
        const key = 'reading-confirmation';

        addSnackbar({
            key,
            text: `Вас обрано читачем частини «${truncateText(partName, 40)}»`,
            timer: timerText,
            mode: "forever",
            button1: canContinue
                ? {
                    text: "Продовжити", onClick: () => {
                        onContinue();
                        onClose();
                    }, variant: "primary"
                }
                : {
                    text: "Продовжити", onClick: () => {
                        onStart();
                        onClose();
                    }, variant: "primary"
                },
            button2: canContinue
                ? {
                    text: "Почати з початку", onClick: () => {
                        onStart();
                        onClose();
                    }, variant: "secondary"
                }
                : undefined,
            onClose,
        });
    };


    const myActiveUser = teleprompterActiveUsers.find(u => u.userId === (profile as UserProfile | undefined)?.user_id);
    const isVideoRecordingModeActive = !!myActiveUser?.isRecordingModeActive;

    useEffect(() => {
        processedWordsIndicesRef.current = processedWordsIndices;
    }, [processedWordsIndices]);

    useEffect(() => {
        isRecognizingRef.current = isRecognizing;
    }, [isRecognizing]);

    useEffect(() => {
        initialLoadCompleteRef.current = initialLoadComplete;
    }, [initialLoadComplete]);

    useEffect(() => {
        teleprompterActiveUsersRef.current = teleprompterActiveUsers;
    }, [teleprompterActiveUsers]);

    useEffect(() => {
        participantsRef.current = participants || [];
    }, [participants]);

    useEffect(() => {
        readingConfirmationActiveRef.current = readingConfirmationActive;
    }, [readingConfirmationActive]);

    useEffect(() => { localStructureRef.current = localStructure; }, [localStructure]);


    const [currentSpeakerUserId, setCurrentSpeakerUserId] = useState<number | null>(null);
    const previousSpeakerUserIdRef = useRef<number | null>(null);

    const mainTextContainerRef = useRef<HTMLDivElement>(null);
    const partTextRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const wordSpanRefs = useRef<Record<number, (HTMLSpanElement | null)[]>>({});
    const restartRecognitionTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastPositionUpdateRef = useRef<number>(0);
    const [speechApiAvailable, setSpeechApiAvailable] = useState<boolean | null>(null);
    const [networkSpeechApiError, setNetworkSpeechApiError] = useState<string | null>(null);

    const INITIAL_VIDEO_POS = () => {
        const h = window.innerHeight;
        return {
            x: 20,
            y: h - 254,
        };
    };

    const [videoWindowPos, setVideoWindowPos] = useState(INITIAL_VIDEO_POS);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const dragOffset = useRef<{ x: number, y: number } | null>(null);

    const isDraggingRef = useRef(false);

    const handleVideoMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.closest('.teleprompter-video-handle')) {
            e.preventDefault();
            isDraggingRef.current = true;
            dragOffset.current = {
                x: e.clientX - videoWindowPos.x,
                y: e.clientY - videoWindowPos.y,
            };
            document.body.style.userSelect = 'none';

            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
    };


    function formatTime(seconds: number) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }


    const handleMouseMove = (e: MouseEvent) => {
        if (!isDraggingRef.current || !dragOffset.current || !videoContainerRef.current) return;
        const x = Math.max(0, Math.min(window.innerWidth - 280, e.clientX - dragOffset.current.x));
        const y = Math.max(0, Math.min(window.innerHeight - 240, e.clientY - dragOffset.current.y));
        videoContainerRef.current.style.left = `${x}px`;
        videoContainerRef.current.style.top = `${y}px`;
    };

    const handleMouseUp = () => {
        if (!isDraggingRef.current || !videoContainerRef.current) return;
        const x = parseInt(videoContainerRef.current.style.left, 10);
        const y = parseInt(videoContainerRef.current.style.top, 10);
        setVideoWindowPos({x, y});

        isDraggingRef.current = false;
        dragOffset.current = null;
        document.body.style.userSelect = '';

        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };


    useEffect(() => {
        if (videoContainerRef.current) {
            videoContainerRef.current.style.left = `${videoWindowPos.x}px`;
            videoContainerRef.current.style.top = `${videoWindowPos.y}px`;
        }
    }, [videoWindowPos]);

    useEffect(() => {
        mediaStreamRef.current = mediaStream;
    }, [mediaStream]);


    useEffect(() => {
        if (isVideoRecordingModeActive) {
            navigator.mediaDevices.getUserMedia({video: true, audio: false})
                .then(stream => setMediaStream(stream))
                .catch(() => setMediaStream(null));
        } else {
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
            setMediaStream(null);
        }

        return () => {
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
                mediaStreamRef.current = null;
            }
        };
    }, [isVideoRecordingModeActive]);

    const mediaStreamRef = useRef<MediaStream | null>(null);

    const [recordingSeconds, setRecordingSeconds] = useState(0);


    const attachStream = useCallback(
        (el: HTMLVideoElement | null) => {
            if (el && mediaStream && el.srcObject !== mediaStream) {
                el.srcObject = mediaStream;
            }
        },
        [mediaStream]
    );

    useEffect(() => {
        if (profile && !(profile as UserProfile).has_premium && isVideoRecordingModeActive && !isVideoRecordingAllowed) {
            setRecordingMode(presentationId, false);
        }
    }, [isVideoRecordingAllowed, profile, isVideoRecordingModeActive, setRecordingMode, presentationId]);


    useEffect(() => {
        if (typeof window === "undefined") {
            setSpeechApiAvailable(false);
            return;
        }
        //eslint-disable-next-line
        const SpeechApi = (window.SpeechRecognition || window.webkitSpeechRecognition) as any;
        if (!SpeechApi) {
            setSpeechApiAvailable(false);
            return;
        }
        try {
            const recognition = new SpeechApi();
            recognition.onstart = () => {
                setSpeechApiAvailable(true);
                recognition.stop();
            };
            //eslint-disable-next-line
            recognition.onerror = (event: any) => {
                if (!event || !event.error) {
                    return;
                }
                if (event.error === 'network') {
                    setSpeechApiAvailable(false);
                    setNetworkSpeechApiError('network');
                } else if (event.error === 'not-allowed') {
                    setSpeechApiAvailable(false);
                    setNetworkSpeechApiError('not-allowed');
                } else {
                    setSpeechApiAvailable(false);
                    setNetworkSpeechApiError(event.error);
                }
                recognition.stop();
            };
            recognition.start();
        } catch {
            setSpeechApiAvailable(false);
            setNetworkSpeechApiError('init-failed');
        }
    }, []);

    useEffect(() => {
        if (!initialLoadComplete && activeData && parts) {
            setInitialLoadComplete(true);
        }
    }, [activeData, parts, initialLoadComplete]);

    const isCurrentUserOwner = useMemo(() => {
        return (profile as UserProfile | undefined)?.user_id === currentTeleprompterOwnerId;
    }, [profile, currentTeleprompterOwnerId]);

    const sortedParts = useMemo(() => {
        if (!parts) return [];
        return [...parts].sort((a, b) => a.part_order - b.part_order);
    }, [parts]);

    const partsContent = useMemo(() => {
        return sortedParts.map(part => {
            const text = part.part_text || "";
            const wordsAndDelimiters = text.split(/(\s+|\n)/);
            const wordsArray = wordsAndDelimiters.filter(w => w.length > 0);

            return {
                ...part,
                wordsArray: wordsArray,
                renderableWords: wordsArray.map((word, idx) => ({
                    id: `${part.part_id}-word-${idx}`,
                    text: word,
                    isSpaceOrNewline: /\s+|\n/.test(word)
                }))
            };
        });
    }, [sortedParts]);

    const sidebarParts = useMemo((): SidebarPart[] => {
        const structureAssignees: Record<number, number | null> = {};
        localStructure.forEach(s => {
            structureAssignees[s.partId] = s.assigneeUserId ?? null;
        });
        return sortedParts.map(p => {
            let assignee_user_id = structureAssignees[p.part_id];
            if (assignee_user_id == null) {
                assignee_user_id = participants?.find(
                    participant => participant.participant_id === p.assignee_participant_id
                )?.user?.user_id ?? null;
            }
            return {
                part_id: p.part_id,
                assignee_user_id,
                part_name: p.part_name || `Частина ${p.part_order + 1}`,
            };
        });
    }, [sortedParts, localStructure, participants]);


    const MIN_FONT_SIZE = 0.8;
    const MAX_FONT_SIZE = 2.8;
    const FONT_SIZE_STEP = 0.1;

    const getInitialFontSize = () => {
        const saved = localStorage.getItem('teleprompterFontSize');
        return saved ? Number(saved) : 2.4;
    };

    const [fontSizeEm, setFontSizeEm] = useState<number>(getInitialFontSize());

    useEffect(() => {
        localStorage.setItem('teleprompterFontSize', String(fontSizeEm));
    }, [fontSizeEm]);

    const handleZoomIn = () => {
        setFontSizeEm(prev => Math.min(MAX_FONT_SIZE, +(prev + FONT_SIZE_STEP).toFixed(2)));
    };
    const handleZoomOut = () => {
        setFontSizeEm(prev => Math.max(MIN_FONT_SIZE, +(prev - FONT_SIZE_STEP).toFixed(2)));
    };

    const handleConfirmReaderStart = useCallback(async () => {
        await confirmActiveReader(presentationId, true);
    }, [confirmActiveReader, presentationId]);

    const handleConfirmReaderContinue = useCallback(async () => {
        await confirmActiveReader(presentationId, false);
    }, [confirmActiveReader, presentationId]);

    const hideReadingConfirmation = useCallback(() => {
        removeSnackbar('reading-confirmation');
        setReadingConfirmationActive(false);
    }, []);

    useEffect(() => {
        if (previousOwnerIdRef.current === null || !(profile as UserProfile | undefined)?.user_id) {
            previousOwnerIdRef.current = currentTeleprompterOwnerId;
            return;
        }

        const wasOwner = previousOwnerIdRef.current === (profile as UserProfile | undefined)?.user_id;
        const isOwner = currentTeleprompterOwnerId === (profile as UserProfile | undefined)?.user_id;

        if (
            wasOwner !== isOwner &&
            (profile as UserProfile | undefined)?.user_id === presentation?.owner?.user_id
        ) {
            previousOwnerIdRef.current = currentTeleprompterOwnerId;
            return;
        }

        if (!wasOwner && isOwner && (profile as UserProfile | undefined)?.user_id !== presentation?.owner?.user_id) {
            addSnackbar({text: "Вас тимчасово призначено власником виступу", mode: "timeout", timeout: 3200});
        } else if (wasOwner && !isOwner) {
            addSnackbar({text: "Ви більше не є власником виступу", mode: "timeout", timeout: 3200});
        }
        previousOwnerIdRef.current = currentTeleprompterOwnerId;
    }, [currentTeleprompterOwnerId, (profile as UserProfile | undefined)?.user_id, addSnackbar, presentation?.owner?.user_id]);


    const getPartAssigneeUserId = useCallback((partId: number): number | null => {
        const partStructure = localStructure.find(p => p.partId === partId);
        return partStructure?.assigneeUserId ?? null;
    }, [localStructure]);

    useEffect(() => {
        highlightedPartIdRef.current = currentHighlightedPartId;
    }, [currentHighlightedPartId]);

    const sortedPartsRef = useRef<typeof sortedParts>([]);
    const activeDataRef = useRef(activeData);

    useEffect(() => {
        sortedPartsRef.current = sortedParts;
    }, [sortedParts]);

    useEffect(() => {
        activeDataRef.current = activeData;
    }, [activeData]);

    useEffect(() => {
        if (!parts || parts.length == 0) {
            return
        }
        if (!currentPresentationStartDate) {
            setInitialReadingPosition({
                partId: parts[0].part_id,
                position: 0,
            });
            setProcessedWordsIndices({[parts[0].part_id]: -1});
        }
    }, [parts, currentPresentationStartDate]);


    const handleToggleRecordingMode = async () => {
        if (recordingLoading) return;
        await setRecordingMode(presentationId, !isVideoRecordingModeActive);
    };

    const navigate = useNavigate();

    const handleLeave = async () => {
        navigate(`/presentation/${presentationId}`);
    }

    const isCurrentUserSpeakerOfCurrentPart = useMemo(() => {
        if (!profile || !currentHighlightedPartId) return false;
        const assigneeUserId = getPartAssigneeUserId(currentHighlightedPartId);
        return assigneeUserId === (profile as UserProfile | undefined)?.user_id;
    }, [profile, currentHighlightedPartId, getPartAssigneeUserId]);

    useEffect(() => {
        if (currentSpeakerUserId !== previousSpeakerUserIdRef.current) {
            previousSpeakerUserIdRef.current = currentSpeakerUserId;
        }
    }, [currentSpeakerUserId]);

    useEffect(() => {
        if (isCurrentUserSpeakerOfCurrentPart && currentPresentationStartDate) {
            recognitionStartAttemptedRef.current = false;
        }
    }, [currentHighlightedPartId, isCurrentUserSpeakerOfCurrentPart, currentPresentationStartDate]);


    const stopSpeechRecognition = useCallback((skipIsRecognizing: boolean = false) => {
        if (recognitionRef.current) {
            try {
                console.log("Stopping speech recognition");
                const rec = recognitionRef.current;
                rec.onend = null;
                rec.onerror = null;
                rec.onresult = null;
                rec.onstart = null;
                rec.stop();
                recognitionRef.current = null;
            } catch (e) {
                console.error("Error stopping speech recognition:", e);
            }
        }

        isRecognizingRef.current = false;
        if (!skipIsRecognizing && isRecognizing) {
            setIsRecognizing(false);
        }


        if (restartRecognitionTimerRef.current) {
            clearTimeout(restartRecognitionTimerRef.current);
            restartRecognitionTimerRef.current = null;
        }

        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }

        if (progressCheckIntervalRef.current) {
            clearInterval(progressCheckIntervalRef.current);
            progressCheckIntervalRef.current = null;
        }

        recognitionStartAttemptedRef.current = false;
        forceRestartingRef.current = false;

        console.log("Speech recognition stopped and cleaned up");
    }, []);


    useEffect(() => {
        if (currentHighlightedPartId !== previousHighlightedPartIdRef.current) {
            const oldPartId = previousHighlightedPartIdRef.current;
            const newPartId = currentHighlightedPartId;

            if (oldPartId && profile && newPartId !== null) {
                const wasSpeakerOfOldPart = getPartAssigneeUserId(oldPartId) === (profile as UserProfile | undefined)?.user_id;
                const isSpeakerOfNewPart = getPartAssigneeUserId(newPartId) === (profile as UserProfile | undefined)?.user_id;

                if (wasSpeakerOfOldPart && !isSpeakerOfNewPart) {
                    console.log(`Part changed (useEffect) from ${oldPartId} (our part) to ${newPartId} (not our part). Stopping recognition.`);
                    stopSpeechRecognition();
                } else if (wasSpeakerOfOldPart && isSpeakerOfNewPart) {
                    console.log(`Part changed from ${oldPartId} to ${newPartId} (both our parts). Resetting recognition.`);
                    stopSpeechRecognition();
                    recognitionStartAttemptedRef.current = false;
                }
            }
            previousHighlightedPartIdRef.current = newPartId;
        }
    }, [currentHighlightedPartId, profile, getPartAssigneeUserId, stopSpeechRecognition]);


    const partsContentRef = useRef(partsContent);

    useEffect(() => {
        partsContentRef.current = partsContent;
    }, [partsContent]);

    const isNearEndOfPart = useCallback((partId: number, wordIdx: number): boolean => {
        const partContent = partsContentRef.current.find(p => p.part_id === partId);
        if (!partContent || partContent.wordsArray.length === 0) return false;
        const endThreshold = Math.max(5, Math.floor(partContent.wordsArray.length * 0.1));
        return wordIdx >= partContent.wordsArray.length - endThreshold;
    }, []);

    useEffect(() => {
        lastSentFinalPositionRef.current = {};
    }, [currentPresentationStartDate, parts, activeData?.structure]);

    const sendFinalPosition = useCallback((partId: number) => {
        if (lastSentFinalPositionRef.current[partId]) {
            return;
        }
        lastSentFinalPositionRef.current[partId] = true;

        const partContent = partsContentRef.current.find(p => p.part_id === partId);
        if (!partContent) return;

        const lastWordIdx = partContent.wordsArray.length - 1;
        const fullText = partContent.part_text || "";
        const lastCharPos = fullText.length > 0 ? fullText.length - 1 : 0;

        updateHighlightAndScroll(partId, lastWordIdx);
        sendReadingPosition({
            position: lastCharPos
        });
        console.log(`Sent final position for part ${partId}`);
    }, []);

    const updateHighlightAndScroll = useCallback((partId: number, wordIdx: number, shouldScroll: boolean = true) => {
        if (!partId) {
            console.warn("Invalid partId in updateHighlightAndScroll:", partId);
            return;
        }

        console.error(`updateHighlightAndScroll: Setting currentHighlightedPartId from ${currentHighlightedPartId} to ${partId}, wordIdx: ${wordIdx}, shouldScroll: ${shouldScroll}`);
        console.trace("Ось стек трейс тут:");

        if (currentPresentationStartDate) {
            setCurrentHighlightedPartId(partId);
        }

        const partContent = partsContentRef.current.find(p => p.part_id === partId);
        if (!partContent) {
            console.warn(`Part with ID ${partId} not found in updateHighlightAndScroll`);
            return;
        }

        const adjustedWordIdx = Math.min(
            Math.max(wordIdx, -1),
            partContent.wordsArray.length - 1
        );

        const prevPosition = currentPositionRef.current;
        const hasPositionChanged = !prevPosition || prevPosition.partId !== partId || prevPosition.wordIdx !== adjustedWordIdx;

        if (hasPositionChanged) {
            currentPositionRef.current = {partId, wordIdx: adjustedWordIdx};
            timeAtCurrentPositionRef.current = Date.now();
            inEndZoneRef.current = isNearEndOfPart(partId, adjustedWordIdx);
        }

        setProcessedWordsIndices(prev => {
            const newIndices = {...prev, [partId]: adjustedWordIdx};
            processedWordsIndicesRef.current = newIndices;
            return newIndices;
        });

        if (shouldScroll) {
            const wordSpans = wordSpanRefs.current[partId];
            const targetWordSpan = wordSpans?.[adjustedWordIdx];
            const container = mainTextContainerRef.current;

            if (targetWordSpan && container) {
                const containerRect = container.getBoundingClientRect();
                const targetRect = targetWordSpan.getBoundingClientRect();

                const targetCenter = targetRect.top + targetRect.height / 2;
                const containerCenter = containerRect.top + containerRect.height / 2;

                const scrollDelta = targetCenter - containerCenter;

                container.scrollBy({
                    top: scrollDelta,
                    behavior: 'smooth'
                });
            } else if (container && partTextRefs.current[partId]) {
                partTextRefs.current[partId]?.scrollIntoView({behavior: 'smooth', block: 'center'});
            }
        }

    }, [isNearEndOfPart, currentHighlightedPartId, currentPresentationStartDate]);

    const calculateCharPosition = useCallback((partId: number, wordIdx: number): number => {
        if (!partId) {
            console.warn("calculateCharPosition called with invalid partId");
            return 0;
        }
        const partContent = partsContent.find(p => p.part_id === partId);
        if (!partContent) {
            console.warn(`Part with ID ${partId} not found in calculateCharPosition`);
            return 0;
        }

        if (wordIdx >= partContent.wordsArray.length) {
            const fullText = partContent.part_text || "";
            return fullText.length > 0 ? fullText.length - 1 : 0;
        }
        if (wordIdx < 0) return 0;

        const actualWordIdx = Math.min(wordIdx, partContent.wordsArray.length - 1);
        if (actualWordIdx < 0) {
            console.warn(`Part with ID ${partId} has empty wordsArray in calculateCharPosition`);
            return 0;
        }

        let charPosAccumulator = 0;
        for (let i = 0; i <= actualWordIdx; i++) {
            if (partContent.wordsArray[i]) {
                charPosAccumulator += partContent.wordsArray[i].length;
            } else {
                console.warn(`Unexpected empty or undefined word at index ${i} for part ${partId} in calculateCharPosition`);
            }
        }
        if (actualWordIdx === partContent.wordsArray.length - 1) {
            const fullText = partContent.part_text || "";
            return Math.min(charPosAccumulator - 1, fullText.length > 0 ? fullText.length - 1 : 0);
        }

        return charPosAccumulator > 0 ? charPosAccumulator - 1 : 0;
    }, [partsContent]);

    const findWordIndexFromCharPosition = useCallback((partId: number, charPos: number): number => {
        if (!partId) {
            console.warn("Invalid partId in findWordIndexFromCharPosition:", partId);
            return -1;
        }
        const partContent = partsContentRef.current.find(p => p.part_id === partId);
        if (!partContent || partContent.wordsArray.length === 0) {
            return -1;
        }

        if (charPos === 0) {
            for (let i = 0; i < partContent.wordsArray.length; i++) {
                if (partContent.wordsArray[i].trim().length > 0) {
                    return i;
                }
            }
            return 0;
        }

        let currentWordIdx = -1;
        let accumulatedChars = 0;
        for (let i = 0; i < partContent.wordsArray.length; i++) {
            const wordLength = partContent.wordsArray[i].length;
            accumulatedChars += wordLength;
            if (accumulatedChars > charPos) {
                currentWordIdx = i;
                break;
            }
        }
        if (charPos > 0 && accumulatedChars <= charPos && partContent.wordsArray.length > 0) {
            currentWordIdx = partContent.wordsArray.length - 1;
        }

        return currentWordIdx;
    }, []);


    const waitForPart = <T, >(getPartFn: () => T, maxWaitMs: number = 1500) => new Promise((resolve: (value?: T) => void) => {
        const start = Date.now();

        function check() {
            const part = getPartFn();
            if (part) {
                resolve(part);
            } else if (Date.now() - start > maxWaitMs) {
                resolve(undefined);
            } else {
                setTimeout(check, 50);
            }
        }

        check();
    });

    const {sendReadingPosition, sendRecordedVideosCount} = useTeleprompterSocket(presentationId, {
        onTeleprompterPresence: (data: TeleprompterPresencePayload) => {
            setTeleprompterActiveUsers(prev => {
                const existingUser = prev.find(u => u.userId === data.user_id);
                if (data.type === PresenceEventType.UserJoined) {
                    const highlightedPartId = highlightedPartIdRef.current;
                    console.log("Highlighted part id", highlightedPartId);
                    if (highlightedPartId) {
                        const assigneeUserId = localStructureRef.current.find(p => p.partId === highlightedPartId)?.assigneeUserId;
                        console.log("Assignee user id", assigneeUserId, data.user_id);
                        if (assigneeUserId === data.user_id) {
                            removeSnackbar(WAITING_FOR_USER_SNACKBAR_KEY);
                        }
                    }

                    return existingUser ? prev.map(u => u.userId === data.user_id ? {...u} : u)
                        : [...prev, {userId: data.user_id, isRecordingModeActive: false}];
                }
                return prev.filter(u => u.userId !== data.user_id);
            });
        },
        onOwnerChanged: (data: OwnerChangedPayload) => {
            setCurrentTeleprompterOwnerId(data.current_owner_change_id);
        },
        onRecordingModeChanged: (data: RecordingModeChangedPayload) => {
            setTeleprompterActiveUsers(prev =>
                prev.map(u =>
                    u.userId === data.user_id ? {...u, isRecordingModeActive: data.is_recording_mode_active} : u
                )
            );
        },
        onReadingPositionChanged: (data: IncomingReadingPositionPayload) => {
            if (!data.partId) {
                console.warn("Received reading position update with invalid partId", data);
                return;
            }
            lastPositionUpdateRef.current = Date.now();

            console.log(`RECEIVED: partId=${data.partId}, position=${data.position}`);
            console.log(`CURRENT STATE: highlighted=${highlightedPartIdRef.current}, userID=${(profileRef.current as UserProfile | undefined)?.user_id}, recognition=${isRecognizingRef.current}`);

            const partExists = partsContentRef.current.some(p => p.part_id === data.partId);
            if (!partExists) {
                console.warn(`Received reading position for unknown part ID: ${data.partId}`);
                return;
            }

            const oldHighlightedPartId = highlightedPartIdRef.current;
            const isPartTransition = data.partId !== oldHighlightedPartId;
            console.log(`TRANSITION CHECK: isPartTransition=${isPartTransition}, old=${oldHighlightedPartId}, new=${data.partId}`);

            const wordIdx = findWordIndexFromCharPosition(data.partId, data.position);
            console.log(`WORD INDEX: ${wordIdx} for position ${data.position}`);


            let oldPartSpeaker: number | null = null;
            let newPartSpeaker: number | null = null;

            if (oldHighlightedPartId) {
                oldPartSpeaker = getPartAssigneeUserId(oldHighlightedPartId);
                console.log(`oldPartSpeaker lookup: part=${oldHighlightedPartId}, speaker=${oldPartSpeaker}`);
            }

            newPartSpeaker = getPartAssigneeUserId(data.partId);
            console.log(`newPartSpeaker lookup: part=${data.partId}, speaker=${newPartSpeaker}`);

            console.log(`SPEAKERS: oldSpeaker=${oldPartSpeaker}, newSpeaker=${newPartSpeaker}, currentUser=${(profileRef.current as UserProfile | undefined)?.user_id}`);

            const isCurrentUserOldSpeaker = (profileRef.current as UserProfile | undefined)?.user_id === oldPartSpeaker;
            const isCurrentUserNewSpeaker = (profileRef.current as UserProfile | undefined)?.user_id === newPartSpeaker;
            console.log(`SPEAKER ROLES: isCurrentUserOldSpeaker=${isCurrentUserOldSpeaker}, isCurrentUserNewSpeaker=${isCurrentUserNewSpeaker}`);
            console.log(`RECOGNITION STATE: isRecognizing=${isRecognizingRef.current}, hasBeenAttempted=${recognitionStartAttemptedRef.current}`);

            if (isPartTransition && isCurrentUserOldSpeaker && !isCurrentUserNewSpeaker && isRecognizingRef.current) {
                console.log(`STOPPING RECOGNITION: Part transition from ${oldHighlightedPartId} to ${data.partId}, current user was speaker but isn't anymore`);
                stopSpeechRecognition();
                console.log(`RECOGNITION STOPPED: recognizing=${isRecognizingRef.current}, attempted=${recognitionStartAttemptedRef.current}`);
            }

            console.log(`UI UPDATE: Calling updateHighlightAndScroll with partId=${data.partId}, wordIdx=${wordIdx}`);
            updateHighlightAndScroll(data.partId, wordIdx, true);

            highlightedPartIdRef.current = data.partId;

            setCurrentHighlightedPartId(data.partId);
            console.log(`UI UPDATED: Forced set highlighted part to ${data.partId} and updated ref to ${highlightedPartIdRef.current}`);

            if (newPartSpeaker !== currentSpeakerUserId) {
                console.log(`SPEAKER CHANGE: from ${currentSpeakerUserId} to ${newPartSpeaker}`);
                setCurrentSpeakerUserId(newPartSpeaker);
            }

            if (isCurrentUserNewSpeaker && currentPresentationStartDate) {
                console.log(`USER IS SPEAKER: Current user is speaker for part ${data.partId}, resetting recognition flag`);
                recognitionStartAttemptedRef.current = false;

                console.log(`SCHEDULING RECOGNITION START after 300ms delay`);
                setTimeout(() => {
                    const currentPart = highlightedPartIdRef.current;
                    const currentPartSpeakerId = currentPart ? getPartAssigneeUserId(currentPart) : null;
                    const isUserSpeaker = (profileRef.current as UserProfile | undefined)?.user_id === currentPartSpeakerId;

                    console.log(`DELAYED CHECK: currentPart=${currentPart}, partSpeaker=${currentPartSpeakerId}, userID=${(profileRef.current as UserProfile | undefined)?.user_id}, isUserSpeaker=${isUserSpeaker}, isRecognizing=${isRecognizingRef.current}`);

                    if (isUserSpeaker && currentPresentationStartDate && !isRecognizingRef.current) {
                        console.log(`STARTING RECOGNITION for new speaker part ${currentPart}`);
                        initAndStartRecognition();
                    } else {
                        console.log(`NOT STARTING RECOGNITION: conditions not met - isUserSpeaker=${isUserSpeaker}, isPresentationStarted=${currentPresentationStartDate}, !isRecognizingRef.current=${!isRecognizingRef.current}`);
                    }
                }, 300);
            }
        },
        onPartReassignRequired: (payload) => {
            const part = sortedPartsRef.current.find(p => p.part_id === payload.partId);
            const user = participantsRef.current.find(p => p.user.user_id === payload.userId)?.user;

            const fullName = truncateText(
                [user?.first_name, user?.last_name].filter(Boolean).join(' '),
                40
            );
            const partName = truncateText(part?.part_name ?? 'N/A', 40);

            setReassignModal({
                visible: true,
                reason:
                    payload.reason === PartReassignReason.MissingAssignee
                        ? `Учасник ${fullName} наразі відсутній. Оберіть іншого читача частини «${partName}»`
                        : `Учасник ${fullName} не відповідає. Оберіть іншого читача частини «${partName}»`,
                partName: part?.part_name || '',
                partId: payload.partId,
                selectedId: null,
                targetUserId: payload.userId,
            });
        },
        onPartReassignCancelled:
            () => {
                setReassignModal((m) => ({...m, visible: false}));
            },
        onRecordedVideosCountChanged: () => {
            refetchParticipantsVideosLeft();
        },
        onPartReadingConfirmationRequired: async (payload) => {
            removeSnackbar(WAITING_FOR_USER_SNACKBAR_KEY);
            setReadingConfirmationActive(true);
            const timeStarted = Date.now();

            const part = await waitForPart(
                () => sortedPartsRef.current.find(p => p.part_id === payload.part_id),
                1000
            );

            const elapsed = Math.floor((Date.now() - timeStarted) / 1000);
            let timerSec = Math.max(payload.time_to_confirm_seconds - elapsed, 1);

            const key = 'reading-confirmation';

            const formatSecondsToMMSS = (sec: number) => {
                const m = Math.floor(sec / 60);
                const s = sec % 60;
                return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            };

            const remove = () => {
                removeSnackbar(key);
                setReadingConfirmationActive(false);
            };

            showReadingConfirmationSnackbar({
                partName: part?.part_name ?? 'Частина',
                canContinue: payload.can_continue_from_last_position,
                timerText: formatSecondsToMMSS(timerSec),
                onStart: () => {
                    handleConfirmReaderStart();
                    remove();
                },
                onContinue: () => {
                    handleConfirmReaderContinue();
                    remove();
                },
                onClose: remove
            });

            const timerInt = setInterval(() => {
                timerSec--;
                setSnackbars(snacks =>
                    snacks.map(s =>
                        s.key === key
                            ? {...s, timer: timerSec > 0 ? formatSecondsToMMSS(timerSec) : undefined}
                            : s
                    )
                );
                if (timerSec <= 0) {
                    remove();
                    clearInterval(timerInt);
                }
            }, 1000);
        },
        onPartReadingConfirmationCancelled: () => {
            removeSnackbar('reading-confirmation');
            setReadingConfirmationActive(false);
        },
        onPartReassigned: (data) => {
            removeSnackbar(WAITING_FOR_USER_SNACKBAR_KEY);
            setLocalStructure(prev =>
                prev.map(item =>
                    item.partId === data.partId
                        ? {...item, assigneeUserId: data.userId}
                        : item
                )
            );
        },
        onWaitingForUser: (data) => {
            const participant = participantsRef.current.find(p => p.user.user_id === data.user_id);
            const name = participant ? `${participant.user.first_name} ${participant.user.last_name}` : '';

            addSnackbar({
                key: WAITING_FOR_USER_SNACKBAR_KEY,
                text: `Очікування учасника ${truncateText(name, 40)}`,
                mode: "forever"
            });
        },
        onDisconnect:
            () => {
                setIsSocketConnected(false);
                setShowSocketError(true);
            },
        onConnect:
            () => {
                setIsSocketConnected(true);
                setShowSocketError(false);
                refetchActiveData();
            },
        onReconnect:
            () => {
                setIsSocketConnected(true);
                setShowSocketError(false);
                console.error('Socket reconnected, refetching active data');
                refetchActiveData();
            },
    });

    const handleCandidateSelect = (id: number) => {
        setReassignModal((modal) => ({...modal, selectedId: id}));
    };

    const handleReassignConfirm = async () => {
        if (reassignModal.selectedId && reassignModal.partId) {
            const targetUserId = reassignModal.selectedId;
            const success = await setActiveReader(presentationId, targetUserId);

            if (success) {
                setReassignModal((m) => ({...m, visible: false}));
            } else {
                addSnackbar({
                    text: "Не вдалося перепризначити учасника",
                    mode: "timeout",
                    timeout: 3200
                });
            }
        }
    };


    const handleReassignClose = () => setReassignModal((m) => ({...m, visible: false}));

    const resetReadingProgress = () => {
        const initialProcessedIndices: Record<number, number> = {};
        let firstPartIdForStart = currentHighlightedPartId;

        if (sortedParts.length > 0) {
            if (!firstPartIdForStart || !sortedParts.find(p => p.part_id === firstPartIdForStart)) {
                firstPartIdForStart = sortedParts[0].part_id;
            }
            sortedParts.forEach(part => {
                initialProcessedIndices[part.part_id] = (part.part_id === firstPartIdForStart) ? (processedWordsIndicesRef.current[firstPartIdForStart] ?? -1) : -1;
            });
            setProcessedWordsIndices(initialProcessedIndices);

            updateHighlightAndScroll(firstPartIdForStart, initialProcessedIndices[firstPartIdForStart], false);
            setCurrentHighlightedPartId(null);
            setCurrentSpeakerUserId(null);
        }
    }

    const handleRecordingStopped = async () => {
        await updateNotUploadedVideos();
        sendRecordedVideosCount({
            notUploadedVideosInPresentation: await getNotUploadedVideoCount(presentationId)
        });
        if (!isVideoRecordingAllowedRef.current) {
            addSnackbar({
                text: "Ви досягли ліміту безкоштовної кількості відео",
                mode: "timeout",
                timeout: 4500,
            });
        }
    };

    const isVideoEnabled = isCurrentUserSpeakerOfCurrentPart &&
        isRecognizing &&
        isVideoRecordingModeActive &&
        isVideoRecordingAllowed &&
        !!currentHighlightedPartId &&
        !!currentPresentationStartDate;

    const [delayedEnabled, setDelayedEnabled] = useState(isVideoEnabled);
    const prevPartIdRef = useRef(currentHighlightedPartId);

    useEffect(() => {
        if (
            prevPartIdRef.current !== currentHighlightedPartId &&
            isVideoEnabled
        ) {
            setDelayedEnabled(false);
            const t = setTimeout(() => {
                setDelayedEnabled(true);
            }, 100);
            prevPartIdRef.current = currentHighlightedPartId;
            return () => clearTimeout(t);
        } else {
            setDelayedEnabled(isVideoEnabled);
        }
    }, [
        isVideoEnabled,
        currentHighlightedPartId,
        sortedParts,
    ]);


    const {isRecording: isVideoRecording} = useTeleprompterVideoRecorder({
        enabled: delayedEnabled,
        isVideoRecordingAllowed,
        isPremium: !!(profile as UserProfile | undefined)?.has_premium,
        partId: currentHighlightedPartId || 0,
        presentationId,
        partName: currentHighlightedPartId ? sortedParts.find(p => p.part_id === currentHighlightedPartId)?.part_name ?? '' : '',
        partOrder: currentHighlightedPartId ? sortedParts.findIndex(p => p.part_id === currentHighlightedPartId) + 1 : 1,
        presentationStartDate: currentPresentationStartDate || "",
        onRecordingStopped: handleRecordingStopped,
        maxRecordingSeconds: (profile as UserProfile | undefined)?.has_premium ? 0 : maxFreeSeconds,
        onAutoStoppedByDuration: () => setVideoAutoStoppedByDuration(true),
        onError: () => {
            addSnackbar({
                text: "Не вдалося розпочати запис відео",
                mode: "timeout",
                timeout: 4500,
            });
        }
    });

    useEffect(() => {
        if (!isVideoRecording) {
            setRecordingSeconds(0);
            return;
        }
        const timer = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
        return () => clearInterval(timer);
    }, [isVideoRecording]);

    useEffect(() => {
        if (isVideoAutoStoppedByDuration) {
            setVideoAutoStoppedByDuration(false);
            addSnackbar({
                text: "Ви досягли ліміту безкоштовної тривалості відео",
                mode: "timeout",
                timeout: 4500,
            });
        }
    }, [isVideoAutoStoppedByDuration, addSnackbar]);

    usePresentationSocket(presentationId, (event: PresentationEvent) => {
        switch (event.event_type) {
            case PresentationEventType.PresentationStarted:
                setCurrentPresentationStartDate(new Date().toISOString());

                recognitionStartAttemptedRef.current = false;
                setTimeout(() => {
                    const currentPartSpeakerId = currentHighlightedPartId ?
                        getPartAssigneeUserId(currentHighlightedPartId) : null;

                    if (currentPartSpeakerId && (profile as UserProfile | undefined)?.user_id && (profile as UserProfile).user_id === currentPartSpeakerId) {
                        console.log("Starting recognition after presentation start event (user is current speaker)");
                        initAndStartRecognition();
                    }
                }, 300);
                break;

            case PresentationEventType.PresentationStopped:
                updateHighlightAndScroll(sortedParts[0].part_id, -1, true);
                setCurrentPresentationStartDate(null);
                setCurrentHighlightedPartId(null);
                setCurrentSpeakerUserId(null);
                stopSpeechRecognition();
                resetReadingProgress();
                setReassignModal((m) => ({...m, visible: false}));
                hideReadingConfirmation();
                removeSnackbar(WAITING_FOR_USER_SNACKBAR_KEY);
                break;
            case PresentationEventType.NameChanged:
                refetchPresentationDetails();
                break;
            case PresentationEventType.ParticipantsChanged:
                refetchParticipants();
                break;
            case PresentationEventType.TextChanged:
                refetchParts();
                break;
        }
    });

    useEffect(() => {
        if (!isCurrentUserSpeakerOfCurrentPart || !currentPresentationStartDate || !inEndZoneRef.current) {
            if (progressCheckIntervalRef.current) {
                clearInterval(progressCheckIntervalRef.current);
            }
            progressCheckIntervalRef.current = null;
            return;
        }

        if (progressCheckIntervalRef.current) {
            clearInterval(progressCheckIntervalRef.current);
        }

        progressCheckIntervalRef.current = setInterval(() => {
            if (!currentPositionRef.current || !currentHighlightedPartId || !partsContentRef.current.find(p => p.part_id === currentPositionRef.current!.partId)) return;

            const {partId, wordIdx} = currentPositionRef.current;
            const partContent = partsContentRef.current.find(p => p.part_id === partId);
            if (!partContent) return;

            const now = Date.now();
            const timeAtPosition = now - timeAtCurrentPositionRef.current;

            if (timeAtPosition > 8000 && inEndZoneRef.current) {
                console.log("Stuck at end of part, forcing completion");
                sendFinalPosition(partId);
                timeAtCurrentPositionRef.current = now;
            }

            const lastMeaningfulWordIdx = findLastNonWhitespaceIdx(partContent.wordsArray, 0, partContent.wordsArray.length - 1);
            if (wordIdx >= Math.max(0, lastMeaningfulWordIdx - 2) && timeAtPosition > 2000) {
                console.log("At last words, completing part");
                sendFinalPosition(partId);
            }
        }, 1000);

        return () => {
            if (progressCheckIntervalRef.current) {
                clearInterval(progressCheckIntervalRef.current);
                progressCheckIntervalRef.current = null;
            }
        };
    }, [isCurrentUserSpeakerOfCurrentPart, currentPresentationStartDate, currentHighlightedPartId, sendFinalPosition, inEndZoneRef]);


    const forceRestartRecognition = useCallback(() => {
        if (forceRestartingRef.current || !isCurrentUserSpeakerOfCurrentPart || !currentPresentationStartDate) {
            return;
        }
        console.log("Force restarting recognition due to inactivity");
        forceRestartingRef.current = true;

        if (recognitionRef.current) {
            const rec = recognitionRef.current;
            rec.onend = null;
            rec.onerror = null;
            rec.onresult = null;
            rec.onstart = null;
            try {
                rec.stop();
            } catch (e) {
                console.error("Error stopping for force restart", e);
            }
            recognitionRef.current = null;
        }

        if (isRecognizingRef.current) {
            setIsRecognizing(false);
            isRecognizingRef.current = false;
        }

        if (restartRecognitionTimerRef.current) clearTimeout(restartRecognitionTimerRef.current);
        recognitionStartAttemptedRef.current = false;

        setTimeout(() => {
            forceRestartingRef.current = false;
            if (isCurrentUserSpeakerOfCurrentPart && currentPresentationStartDate) {
                console.log("Starting fresh recognition instance after force restart");
                initAndStartRecognition();
            }
        }, 500);
    }, [isCurrentUserSpeakerOfCurrentPart, currentPresentationStartDate]);

    const lastWordAdvanceTimeRef = useRef<number>(Date.now());

    function normalizeTranscript(text: string): string {
        return text
            .toLowerCase()
            .replace(PUNCTUATION_REGEX, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    const lastNormalizedTranscriptRef = useRef<string>('');

    const pendingRecognitionRestartRef = useRef(false);
    const initAndStartRecognition = useCallback(() => {
        if (!SpeechRecognitionAPI) {
            console.warn("Web Speech API is not supported by this browser.");
            return;
        }
        if (isRecognizingRef.current || forceRestartingRef.current) {
            console.log("Already recognizing or force restarting, skipping init");
            return;
        }
        if (readingConfirmationActiveRef.current) {
            console.log('Recognition not started: readingConfirmationActive = true');
            return;
        }
        if (!isCurrentUserSpeakerOfCurrentPart || !currentPresentationStartDate) {
            console.log("Not the current speaker or presentation not started, skipping recognition init");
            return;
        }

        console.log("Initializing speech recognition for part", currentHighlightedPartId);

        if (recognitionRef.current) {
            console.warn("Recognition ref not null at init, trying to stop first.");
            stopSpeechRecognition();
        }

        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'uk-UA';

        recognitionRef.current.onstart = () => {
            console.log("Speech recognition started event fired");
            if (!isRecognizingRef.current) {
                setIsRecognizing(true);
                isRecognizingRef.current = true;
            }
        };

        recognitionRef.current.onend = () => {
            console.log("Speech recognition ended naturally event fired");
            if (!pendingRecognitionRestartRef.current && isRecognizingRef.current) {
                setIsRecognizing(false);
                isRecognizingRef.current = false;
            }

            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
                heartbeatIntervalRef.current = null;
            }

            if (isCurrentUserSpeakerOfCurrentPart && currentPresentationStartDate && !forceRestartingRef.current && recognitionRef.current) {
                if (restartRecognitionTimerRef.current) clearTimeout(restartRecognitionTimerRef.current);
                restartRecognitionTimerRef.current = setTimeout(() => {
                    if (isCurrentUserSpeakerOfCurrentPart && currentPresentationStartDate && !forceRestartingRef.current) {
                        console.log("Auto-restarting speech recognition after natural end");
                        recognitionStartAttemptedRef.current = false;
                        initAndStartRecognition();
                    }
                }, 500);
            }
        };

        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error("SpeechRecognition: Error - ", event.error, event.message);

            if (event.error === 'not-allowed') {
                if (!window.sessionStorage.getItem("mic-permission-alert-shown")) {
                    alert("Будь ласка, надайте дозвіл на мікрофон у налаштуваннях браузера. Сторінку може знадобитися перезавантажити після зміни дозволів.");
                    window.sessionStorage.setItem("mic-permission-alert-shown", "true");
                }
            } else if (event.error === 'no-speech' || event.error === 'aborted') {
                pendingRecognitionRestartRef.current = true;
                setTimeout(() => {
                    if (isCurrentUserSpeakerOfCurrentPart && currentPresentationStartDate) {
                        console.log('Restarting recognition after no-speech');
                        stopSpeechRecognition(true);
                        initAndStartRecognition();
                    }
                    pendingRecognitionRestartRef.current = false;
                }, 250);
                return;
            }

            stopSpeechRecognition();
            recognitionStartAttemptedRef.current = false;
        };

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
            lastRecognitionResultTimeRef.current = Date.now();

            if (!currentHighlightedPartId || !isCurrentUserSpeakerOfCurrentPart || !currentPresentationStartDate || !isSocketConnected) return;

            const partContent = partsContentRef.current.find(p => p.part_id === currentHighlightedPartId);
            if (!partContent || partContent.wordsArray.length === 0) return;

            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                transcript += event.results[i][0].transcript + ' ';
            }
            transcript = transcript.trim();

            const normalized = normalizeTranscript(transcript);

            if (normalized === lastNormalizedTranscriptRef.current) {
                console.log('[Speech] Повторний нормалізований transcript, ігноруємо:', normalized);
                return;
            }
            lastNormalizedTranscriptRef.current = normalized;

            handleSpeechRecognitionResult({
                transcript,
                scriptWords: partContent.wordsArray,
                currentWordIndex: processedWordsIndicesRef.current[currentHighlightedPartId] ?? -1,
                currentPartId: currentHighlightedPartId,
                isNearEndOfPart,
                calculateCharPosition,
                updateHighlightAndScroll,
                sendReadingPosition,
                sendFinalPosition,
                timeAtCurrentPositionRef,
                lastWordAdvanceTimeRef
            });
        };

        try {
            console.log("Attempting to start speech recognition");
            recognitionRef.current.start();
        } catch (e) {
            console.error("Error starting speech recognition:", e);
            if ((e as DOMException).name === 'InvalidStateError') {
                console.warn("InvalidStateError: Recognition might already be running or in a bad state. Attempting to stop and re-init.");
                stopSpeechRecognition();
                recognitionStartAttemptedRef.current = false;
            } else {
                stopSpeechRecognition();
                recognitionStartAttemptedRef.current = false;
            }
        }
    }, [
        isCurrentUserSpeakerOfCurrentPart,
        currentPresentationStartDate,
        currentHighlightedPartId,
        stopSpeechRecognition,
        forceRestartRecognition,
        isSocketConnected,
        isNearEndOfPart,
        calculateCharPosition,
        updateHighlightAndScroll,
        sendReadingPosition,
        sendFinalPosition,
    ]);

    useEffect(() => {
        const canStartRecognition = isCurrentUserSpeakerOfCurrentPart &&
            currentPresentationStartDate &&
            !recognitionStartAttemptedRef.current &&
            !forceRestartingRef.current &&
            !readingConfirmationActive;

        if (canStartRecognition) {
            console.log("Main useEffect: Conditions met for recognition. Setting attempt flag and scheduling init.");
            recognitionStartAttemptedRef.current = true;
            if (isCurrentUserSpeakerOfCurrentPart && currentPresentationStartDate &&
                !isRecognizingRef.current && !forceRestartingRef.current &&
                recognitionStartAttemptedRef.current
            ) {
                initAndStartRecognition();
            } else if (!isCurrentUserSpeakerOfCurrentPart || !currentPresentationStartDate) {
                if (recognitionStartAttemptedRef.current) recognitionStartAttemptedRef.current = false;
                if (isRecognizingRef.current) stopSpeechRecognition();
            } else if (!recognitionStartAttemptedRef.current && isRecognizingRef.current) {
                stopSpeechRecognition();
            }
        } else if ((!isCurrentUserSpeakerOfCurrentPart || !currentPresentationStartDate) && isRecognizingRef.current) {
            console.log("Main useEffect: Conditions no longer met (not speaker or not started). Stopping active recognition.");
            stopSpeechRecognition();
        } else if (!isCurrentUserSpeakerOfCurrentPart || !currentPresentationStartDate) {
            if (recognitionStartAttemptedRef.current) {
                recognitionStartAttemptedRef.current = false;
            }
        }
    }, [isCurrentUserSpeakerOfCurrentPart, currentPresentationStartDate, initAndStartRecognition, stopSpeechRecognition, currentHighlightedPartId, readingConfirmationActive]);

    useEffect(() => {
        if (activeData?.currentPresentationStartDate) {
            setCurrentPresentationStartDate(activeData.currentPresentationStartDate);
        }
        setInitialReadingPosition(activeData?.currentReadingPosition || null);
        if (isRecognizingRef.current) {
            stopSpeechRecognition();
        }
        if (!activeData) {
            return;
        }
        setCurrentTeleprompterOwnerId(activeData.currentOwnerUserId);
        setTeleprompterActiveUsers(activeData.joinedUsers || []);

    }, [activeData, stopSpeechRecognition]);


    useEffect(() => {
        if (!activeData) {
            return;
        }

        const timeElapsedSinceSocketUpdate = Date.now() - lastPositionUpdateRef.current;
        const recentSocketUpdate = timeElapsedSinceSocketUpdate < 2000;

        if (!recentSocketUpdate && currentPresentationStartDate) {
            let initialPartIdToHighlight = currentHighlightedPartId;
            let initialWordIdx = -1;

            if (initialReadingPosition?.partId) {
                const serverPartId = initialReadingPosition.partId;
                if (partsContent.some(p => p.part_id === serverPartId)) {
                    initialPartIdToHighlight = serverPartId;
                    initialWordIdx = findWordIndexFromCharPosition(serverPartId, initialReadingPosition.position);
                    console.log(`Using server part ID ${serverPartId} with word index ${initialWordIdx}`);
                } else {
                    console.warn(`Server highlighted part ID ${serverPartId} not found in current parts`);
                }
            } else if (sortedParts.length > 0 && !initialPartIdToHighlight && currentPresentationStartDate) {
                initialPartIdToHighlight = sortedParts[0].part_id;
                console.log(`Using first part ID ${initialPartIdToHighlight} as fallback`);
            }

            if (initialPartIdToHighlight && initialPartIdToHighlight !== highlightedPartIdRef.current) {
                console.log(`ActiveData: Updating highlight from ${highlightedPartIdRef.current} to ${initialPartIdToHighlight}`);
                updateHighlightAndScroll(initialPartIdToHighlight, initialWordIdx, true);
            } else if (initialPartIdToHighlight && initialPartIdToHighlight === highlightedPartIdRef.current &&
                processedWordsIndicesRef.current[initialPartIdToHighlight] !== initialWordIdx) {
                console.log(`ActiveData: Updating word index within part ${initialPartIdToHighlight} to ${initialWordIdx}`);
                updateHighlightAndScroll(initialPartIdToHighlight, initialWordIdx, true);
            }

            const newSpeakerForHighlightedPart = initialPartIdToHighlight ? getPartAssigneeUserId(initialPartIdToHighlight) : null;
            if (newSpeakerForHighlightedPart !== currentSpeakerUserId) {
                console.log(`ActiveData: Updating speaker from ${currentSpeakerUserId} to ${newSpeakerForHighlightedPart}`);
                setCurrentSpeakerUserId(newSpeakerForHighlightedPart);
            }
        }

        if (currentPresentationStartDate && highlightedPartIdRef.current) {
            const currentPartSpeakerId = getPartAssigneeUserId(highlightedPartIdRef.current);
            const isUserSpeaker = currentPartSpeakerId === (profile as UserProfile | undefined)?.user_id;

            if (isUserSpeaker) {
                console.log(`Initial load or data refresh: User is speaker of active part ${highlightedPartIdRef.current}, resetting recognition attempt flag`);
                recognitionStartAttemptedRef.current = false;

                setTimeout(() => {
                    if (isCurrentUserSpeakerOfCurrentPart && currentPresentationStartDate && !isRecognizingRef.current) {
                        console.log(`Triggering speech recognition after page reload for part ${highlightedPartIdRef.current}`);
                        initAndStartRecognition();
                    }
                }, 500);
            }
        } else if (!currentPositionRef && isRecognizingRef.current) {
            stopSpeechRecognition();
        }
    }, [activeData, sortedParts, partsContent, findWordIndexFromCharPosition, getPartAssigneeUserId,
        updateHighlightAndScroll, (profile as UserProfile | undefined)?.user_id, stopSpeechRecognition, initAndStartRecognition]);

    const handlePlayPauseClick = async () => {
        if (!presentationId || !isCurrentUserOwner) {
            return;
        }
        if (currentPresentationStartDate) {
            await stopPresentation(presentationId);
        } else {
            resetReadingProgress();
            const startDate = new Date().toISOString();
            setCurrentPresentationStartDate(startDate);

            console.log("Starting presentation with local time:", startDate);

            recognitionStartAttemptedRef.current = false;

            await startPresentation(presentationId);
        }
    };

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.onend = null;
                    recognitionRef.current.onerror = null;
                    recognitionRef.current.onresult = null;
                    recognitionRef.current.onstart = null;
                    recognitionRef.current.stop();
                    recognitionRef.current = null;
                } catch (e) {
                    console.error('Error stopping recognition on unmount:', e);
                }
            }
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
                heartbeatIntervalRef.current = null;
            }
            if (progressCheckIntervalRef.current) {
                clearInterval(progressCheckIntervalRef.current);
                progressCheckIntervalRef.current = null;
            }
            if (restartRecognitionTimerRef.current) {
                clearTimeout(restartRecognitionTimerRef.current);
                restartRecognitionTimerRef.current = null;
            }
        };
    }, []);


    if (!initialLoadComplete && (activeDataLoading || partsLoading)) {
        return <div className="teleprompter-loading">Завантаження...</div>;
    }

    if (speechApiAvailable === false && networkSpeechApiError !== 'aborted' && networkSpeechApiError !== 'no-speech') {
        return <div className="teleprompter-error-container">
            {networkSpeechApiError === 'network' && (
                <div className="speech-api-error">
                    <div className="speech-api-error__icon">
                        <img src={errorIcon} alt="error"/>
                    </div>
                    <h2 className="speech-api-error__title">Web Speech API: неможливо підключитися до сервісу
                        розпізнавання</h2>
                    <p className="speech-api-error__subtitle">
                        На жаль, Web Speech API не може підключитись до сервісу розпізнавання.<br/>
                        Це може бути обмеженням вашого браузера (наприклад, Arc, Opera, Brave, корпоративні Chrome).
                    </p>
                    <div className="speech-api-error__tipline">
                        <b>Спробуйте Google Chrome або Microsoft Edge, або перевірте налаштування приватності та
                            мережі.</b>
                    </div>
                    <div className="speech-api-error__actions">
                        <a href="https://www.google.com/chrome/" target="_blank" rel="noopener"
                           className="speech-api-error__button">
                            Встановити Chrome
                        </a>
                        <button className="speech-api-error__button speech-api-error__button--ghost"
                                onClick={() => window.location.reload()}>
                            Спробувати ще раз
                        </button>
                    </div>
                </div>
            )}
            {networkSpeechApiError === 'not-allowed' && (
                <div className="speech-api-error">
                    <div className="speech-api-error__icon">
                        <img src={errorIcon} alt="error"/>
                    </div>
                    <h2 className="speech-api-error__title">Доступ до мікрофона заблоковано</h2>
                    <p className="speech-api-error__subtitle">
                        Доступ до мікрофона заблокований.<br/>
                        <b>Перевірте налаштування браузера та дайте дозвіл.</b>
                    </p>
                    <div className="speech-api-error__actions">
                        <button className="speech-api-error__button" onClick={() => window.location.reload()}>
                            Спробувати ще раз
                        </button>
                    </div>
                </div>
            )}
            {!networkSpeechApiError && (
                <div className="speech-api-error">
                    <div className="speech-api-error__icon">
                        <img src={errorIcon} alt="error"/>
                    </div>
                    <h2 className="speech-api-error__title">Розпізнавання мовлення недоступне</h2>
                    <p className="speech-api-error__subtitle">
                        На жаль, ваш браузер не підтримує або блокує розпізнавання мовлення (Web Speech API).
                    </p>
                    <div className="speech-api-error__actions">
                        <a href="https://www.google.com/chrome/" target="_blank" rel="noopener"
                           className="speech-api-error__button">
                            Встановити Chrome
                        </a>
                        <button className="speech-api-error__button speech-api-error__button--ghost"
                                onClick={() => window.location.reload()}>
                            Спробувати ще раз
                        </button>
                    </div>
                </div>
            )}
        </div>

    }

    if (activeDataError || partsError) return <div
        className="teleprompter-error">Сталася помилка при завантаженні даних. Спробуйте пізніше.</div>;
    if (!presentationId || !activeData || !parts) return <div className="teleprompter-error">Не вдалося завантажити
        дані.</div>;


    return (
        <div className="teleprompter-page">
            <Title>
                {`${presentation?.name ? `${presentation.name} | ` : ''}Виступ з телесуфлером – ScriptGlance`}
            </Title>
            <ParticipantsHeader
                pageType="teleprompter"
                presentationName={presentation?.name}
                participants={participants || []}
                profile={profile as UserProfile | undefined}
                teleprompterActiveUsers={teleprompterActiveUsers}
                teleprompterOwnerId={currentTeleprompterOwnerId}
                onPlayPauseClick={isCurrentUserOwner ? handlePlayPauseClick : undefined}
                currentPresentationStartDate={currentPresentationStartDate}
            />
            {showSocketError && (
                <div className="teleprompter-socket-error-banner">
                    Втрачено звʼязок із сервером. Відновлюємо підключення...
                </div>
            )}
            <div className="teleprompter-main-layout">
                <div className="teleprompter-content-area">
                    <div className="teleprompter-fade teleprompter-fade--top"/>
                    <div className="teleprompter-fade teleprompter-fade--bottom"/>
                    <div
                        className="teleprompter-text-container"
                        ref={mainTextContainerRef}
                        onScroll={e => e.preventDefault()}
                        tabIndex={-1}
                        style={{
                            fontSize: `${fontSizeEm}em`,
                            paddingLeft: isVideoRecordingModeActive || reassignModal.visible ? '300px' : '0',
                            paddingRight: isVideoRecordingModeActive || reassignModal.visible ? '30px' : '0',
                            maxWidth: isVideoRecordingModeActive || reassignModal.visible ? '100%' : '80%',
                        }}
                    >
                        {partsContent.map((part) => {
                            const isCurrentPartActive = currentHighlightedPartId === part.part_id;
                            const partAssigneeUserId = getPartAssigneeUserId(part.part_id);
                            const isUserAssignedToPart = partAssigneeUserId === (profile as UserProfile | undefined)?.user_id;

                            return (
                                <div
                                    key={`part-segment-${part.part_id}`}
                                    id={`part-text-${part.part_id}`}
                                    ref={el => {
                                        partTextRefs.current[part.part_id] = el;
                                    }}
                                    className={`teleprompter-part-text-segment ${isCurrentPartActive ? 'current-speaking-part' : ''} ${isUserAssignedToPart ? 'user-assigned-part' : ''}`}
                                >
                                    <h3 className="teleprompter-part-name">{part.part_name}</h3>
                                    <div className="teleprompter-part-words">
                                        {part.renderableWords.map((wordObj, wordIdx) => {
                                            const currentWordIndexInPart = processedWordsIndices[part.part_id] ?? -1;
                                            const isCurrentWord = isCurrentPartActive && currentWordIndexInPart === wordIdx && !wordObj.isSpaceOrNewline;
                                            const isProcessed = isCurrentPartActive && currentWordIndexInPart > wordIdx && !wordObj.isSpaceOrNewline;

                                            return (
                                                <span
                                                    key={wordObj.id}
                                                    ref={el => {
                                                        if (!wordSpanRefs.current[part.part_id]) wordSpanRefs.current[part.part_id] = [];
                                                        wordSpanRefs.current[part.part_id][wordIdx] = el;
                                                    }}
                                                    className={`teleprompter-word ${isProcessed ? 'processed' : ''} ${isCurrentWord ? 'current-word' : ''}`}
                                                >
                                                    {wordObj.text}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <StructureSidebar
                    parts={sidebarParts}
                    participants={participants || []}
                    highlightedPartId={currentHighlightedPartId}
                    showReadParts={true}
                    marginBottom="90px"
                />

                <div className="teleprompter-footer">
                    <button
                        className="teleprompter-footer-btn"
                        title="Зменшити текст"
                        onClick={handleZoomOut}
                        disabled={fontSizeEm <= MIN_FONT_SIZE}
                    >
                        <img src={zoomOutIcon} alt="Зменшити текст"/>
                    </button>
                    <button
                        className="teleprompter-footer-btn"
                        title="Збільшити текст"
                        onClick={handleZoomIn}
                        disabled={fontSizeEm >= MAX_FONT_SIZE}
                    >
                        <img src={zoomInIcon} alt="Збільшити текст"/>
                    </button>
                    <button
                        className={`teleprompter-footer-btn teleprompter-footer-video-button ${isVideoRecordingModeActive ? 'active' : ''}`}
                        title={
                            isVideoRecordingAllowed
                                ? ((profile as UserProfile | undefined)?.has_premium ? "Вимкнути запис відео" : `Ви можете записати ще ${maxFreeVideoCount - myTotalVideoCount} відео`)
                                : "Досягнуто ліміту безкоштовних відео"
                        }
                        onClick={isVideoRecordingAllowed ? handleToggleRecordingMode : undefined}
                        disabled={recordingLoading || isRecognizing && currentPresentationStartDate !== null && !readingConfirmationActive && isCurrentUserSpeakerOfCurrentPart || !isVideoRecordingAllowed}
                        style={!isVideoRecordingAllowed ? {
                            filter: 'grayscale(1)',
                            opacity: 0.6,
                            cursor: 'not-allowed'
                        } : {}}
                    >
                        <img src={isVideoRecordingModeActive ? videoOnIcon : videoOffIcon}
                             alt={isVideoRecordingModeActive ? "Вимкнути запис відео" : "Увімкнути запис відео"}
                        />
                    </button>

                    <button className="teleprompter-footer-btn teleprompter-footer-leave-button"
                            title="Покинути зустріч"
                            onClick={handleLeave}>
                        <img src={exitIcon} alt="Покинути зустріч"/>
                    </button>
                </div>
            </div>

            <SnackbarContainer snackbars={snackbars as SnackbarItem[]}/>

            {isVideoRecordingModeActive && (
                <div
                    ref={videoContainerRef}
                    className="teleprompter-video-container"
                    style={{
                        position: 'fixed',
                        left: `${videoWindowPos.x}px`,
                        top: `${videoWindowPos.y}px`,
                        zIndex: 200,
                        borderRadius: '20px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                        width: 250,
                        transition: isDraggingRef.current ? 'none' : 'box-shadow 0.2s',
                        userSelect: 'none',
                    }}
                >
                    <div
                        className="teleprompter-video-handle"
                        onMouseDown={handleVideoMouseDown}
                        style={{
                            height: '24px',
                            background: 'rgba(0, 0, 0, 0.5)',
                            borderRadius: '20px 20px 0 0',
                            cursor: 'move',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2,
                            position: 'relative',
                        }}
                    >
                        <div style={{
                            width: '40px',
                            height: '4px',
                            background: 'rgba(255,255,255,0.5)',
                            borderRadius: '2px'
                        }}/>
                    </div>
                    <div style={{position: 'relative'}}>
                        <video
                            autoPlay
                            muted
                            playsInline
                            ref={attachStream}
                            style={{
                                width: '100%',
                                height: '100%',
                                background: '#222',
                                objectFit: 'cover',
                                display: 'block',
                            }}
                        />
                        {isVideoRecording && (
                            <div className="teleprompter-video-rec-indicator">
                                <span className="rec-dot"/>
                                <span className="rec-timer">{formatTime(recordingSeconds)}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}


            <DraggableReassignModal
                visible={reassignModal.visible}
                reason={reassignModal.reason}
                partName={reassignModal.partName}
                candidates={candidates}
                loading={reassignLoading}
                selectedCandidateId={reassignModal.selectedId}
                onSelect={handleCandidateSelect}
                onConfirm={handleReassignConfirm}
                onClose={handleReassignClose}
            />
        </div>
    );
};

export default TeleprompterPage;