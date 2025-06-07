import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {useAuth} from "../../hooks/useAuth";
import {Role} from "../../types/role";
import {
    usePresentationDetails,
    usePresentationJoinedUsers,
    usePresentationParticipants,
    usePresentationsConfig,
    usePresentationStructure,
    usePresentationVideos,
} from "../../hooks/usePresentationData";
import {usePresentationGlobalActions, usePresentationMutations,} from "../../hooks/usePresentationActions";
import {usePresentationSocket} from "../../hooks/usePresentationSocket";
import {PresentationEvent, PresentationEventType,} from "../../api/socket/presentationSocketManager";
import RightHeaderButtons from "../../components/rightHeaderButtons/RightHeaderButtons";
import {BeigeButton, GreenButton} from "../../components/appButton/AppButton";
import {Avatar} from "../../components/avatar/Avatar";
import {useProfile} from "../../hooks/ProfileContext";
import editIcon from "../../assets/edit-icon.svg";
import deleteIcon from "../../assets/delete-icon.svg";
import timeIcon from "../../assets/time-icon.svg";
import playIcon from "../../assets/play-icon.svg";
import crossIcon from "../../assets/cross-icon.svg";
import "./PresentationPage.css";
import {getPartDuration} from "../../utils/partUtils.ts";
import {PresentationVideo} from "../../api/repositories/presentationsRepository.ts";
import InviteParticipantModal from "../../components/modals/inviteParticipant/InviteParticipantModal.tsx";
import EditPresentationNameModal from "../../components/modals/editPresentationName/EditPresentationNameModal.tsx";
import DeleteConfirmationModal from "../../components/modals/deleteConfirmation/DeleteConfirmationModal.tsx";
import VideoModal from "../../components/modals/video/VideoModal.tsx";
import BuySubscriptionModal from "../../components/modals/buySubscription/BuySubscriptionModal.tsx";
import Logo from "../../components/logo/Logo.tsx";
import {truncateText} from "../../utils/textUtils.ts";
import {UserProfile} from "../../api/repositories/profileRepository.ts";
import {Title} from "react-head";

const PresentationPage = () => {

    function formatDateTime(dt: string) {
        const date = new Date(dt);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, "0");
        const mins = date.getMinutes().toString().padStart(2, "0");
        return `${day}.${month}.${year} ${hours}:${mins}`;
    }

    function groupVideosBySession(videos: PresentationVideo[]) {
        const groups: Record<string, PresentationVideo[]> = {};
        videos.forEach(video => {
            const {start_date, end_date} = video.presentation_start;
            const key = `${start_date}_${end_date}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(video);
        });
        return groups;
    }

    const {id} = useParams<{ id: string }>();
    const presentationId = parseInt(id || "0", 10);
    const navigate = useNavigate();
    const {logout} = useAuth();
    const {profile} = useProfile(Role.User);

    const [detailsLoadedOnce, setDetailsLoadedOnce] = useState(false);
    const [participantsLoadedOnce, setParticipantsLoadedOnce] = useState(false);
    const [structureLoadedOnce, setStructureLoadedOnce] = useState(false);
    const [videosLoadedOnce, setVideosLoadedOnce] = useState(false);
    const [configLoadedOnce, setConfigLoadedOnce] = useState(false);

    const {
        presentation,
        loading: presentationLoading,
        refetch: refetchDetails
    } = usePresentationDetails(presentationId);
    const {
        participants,
        loading: participantsLoading,
        refetch: refetchParticipants
    } = usePresentationParticipants(presentationId);

    const [isPresentationStarted, setIsPresentationStarted] = useState(false);

    const {
        joinedUsers,
        isPresentationStarted: initialIsStarted,
        refetch: refetchJoinedUsers,
    } = usePresentationJoinedUsers(presentationId);

    useEffect(() => {
        setIsPresentationStarted(initialIsStarted);
    }, [initialIsStarted]);

    const {structure, loading: structureLoading, refetch: refetchStructure} = usePresentationStructure(presentationId);
    const {videos, loading: videosLoading, refetch: refetchVideos} = usePresentationVideos(presentationId);
    const {config: presentationsConfig, loading: configLoading} = usePresentationsConfig();

    const {invite, deletePresentation, deleteError} = usePresentationMutations(presentationId);
    const {deleteParticipant} = usePresentationGlobalActions();

    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [inviteLink, setInviteLink] = useState("");

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const groupedVideos = useMemo(() => groupVideosBySession(videos), [videos]);

    const [videoModalOpen, setVideoModalOpen] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<PresentationVideo | null>(null);

    const [premiumModalOpen, setPremiumModalOpen] = useState(false);

    const structureScrollRef = useRef<HTMLDivElement>(null);


    const structureParts = structure?.structure?.filter((part) => part.text_preview.trim()) ?? [];

    const handlePresentationEvent = useCallback((event: PresentationEvent) => {
        switch (event.event_type) {
            case PresentationEventType.NameChanged:
                refetchDetails();
                break;
            case PresentationEventType.ParticipantsChanged:
                refetchParticipants();
                break;
            case PresentationEventType.VideosChanged:
                refetchVideos();
                break;
            case PresentationEventType.TextChanged: {
                const scrollEl = structureScrollRef.current;
                const prevScrollTop = scrollEl?.scrollTop ?? 0;
                refetchStructure().then(() => {
                    if (scrollEl) {
                        scrollEl.scrollTop = prevScrollTop;
                    }
                });
                break;
            }
            case PresentationEventType.JoinedUsersChanged:
                refetchJoinedUsers();
                break;
            case PresentationEventType.PresentationStarted:
                setIsPresentationStarted(true);
                break;
            case PresentationEventType.PresentationStopped:
                setIsPresentationStarted(false);
                break;
            default:
                break;
        }
    }, [refetchDetails, refetchParticipants, refetchStructure, refetchVideos]);

    usePresentationSocket(presentationId, handlePresentationEvent);

    useEffect(() => {
        if (!presentationLoading && !detailsLoadedOnce) {
            setDetailsLoadedOnce(true);
        }
    }, [presentationLoading]);

    useEffect(() => {
        if (!participantsLoading && !participantsLoadedOnce) {
            setParticipantsLoadedOnce(true);
        }
    }, [participantsLoading]);

    useEffect(() => {
        if (!structureLoading && !structureLoadedOnce) {
            setStructureLoadedOnce(true);
        }
    }, [structureLoading]);

    useEffect(() => {
        if (!videosLoading && !videosLoadedOnce) {
            setVideosLoadedOnce(true);
        }
    }, [videosLoading]);

    useEffect(() => {
        if (!configLoading && !configLoadedOnce) {
            setConfigLoadedOnce(true);
        }
    }, [configLoading]);


    const handleLogout = () => {
        logout(Role.User);
        navigate("/login");
    };

    const handleInvite = async () => {
        try {
            if (profile &&
                participants &&
                presentationsConfig &&
                !(profile as UserProfile).has_premium &&
                participants.length >= presentationsConfig.premium_config.max_free_participants_count) {
                setPremiumModalOpen(true);
                return;
            }
            const response = await invite();
            if (response) {
                const inviteLink = `${window.location.origin}/invite/${response.invitation_code}`;
                setInviteLink(inviteLink);
                setInviteModalOpen(true);
            }
        } catch {
        }
    };

    const handleEditSuccess = (newName: string) => {
        if (!presentation) {
            return;
        }
        presentation.name = newName;
        setEditModalOpen(false);
    };


    const handleDeleteParticipant = async (participantId: number) => {
        await deleteParticipant(participantId);
        refetchParticipants();

    };

    const handleDeletePresentation = () => {
        setDeleteModalOpen(true);
    };

    const handleConfirmDeletePresentation = async () => {
        await deletePresentation();
        if (!deleteError) {
            navigate("/dashboard");
        }
    };

    const handleLogoClick = () => {
        navigate("/dashboard");
    };

    const handleVideoClick = (video: PresentationVideo) => {
        setSelectedVideo(video);
        setVideoModalOpen(true);
    };

    const handleMontageClick = () => {
        if ((profile as UserProfile | undefined)?.has_premium) {
            navigate(`/presentation/${presentationId}/montage`);
        } else {
            setPremiumModalOpen(true);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("uk-UA");
    };

    const calculateTotalDuration = (durationMs: number) => {
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor(durationMs % 60000 / 1000);
        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };

    const isInitialLoading =
        (!detailsLoadedOnce && presentationLoading) ||
        (!participantsLoadedOnce && participantsLoading) ||
        (!structureLoadedOnce && structureLoading) ||
        (!videosLoadedOnce && videosLoading) ||
        (!configLoadedOnce && configLoading);

    if (isInitialLoading) {
        return <div className="loading-container-presentation">Завантаження...</div>;
    }

    if (!presentation) {
        return <div className="error-container-presentation">Презентацію не знайдено</div>;
    }

    const isOwner = presentation.owner.user_id === (profile as UserProfile | undefined)?.user_id;
    const isGroup = (participants?.length ?? 1) > 1;

    return (
        <div className="presentation-page-main">
            <Title>
                {`${presentation?.name ? `${presentation.name} | ` : ''}Виступ – ScriptGlance`}
            </Title>
            <div className="presentation-header-presentation">
                <Logo onClick={handleLogoClick} premium={(profile as UserProfile | undefined)?.has_premium}/>
                <RightHeaderButtons onLogout={handleLogout}/>
            </div>
            <div className="presentation-title-container-presentation">
                <div className="presentation-title-section-presentation">
                    <div className="presentation-title-row-presentation">
                        <h1 className="presentation-title-presentation">{presentation.name}</h1>
                        {isPresentationStarted && <span className="indicator-dot"></span>}
                        {isOwner && (
                            <>
                                <img src={editIcon} alt="Edit" className="action-icon-presentation"
                                     onClick={() => setEditModalOpen(true)}/>
                                <img
                                    src={deleteIcon}
                                    alt="Delete"
                                    className="action-icon-presentation"
                                    onClick={handleDeletePresentation}
                                />
                            </>
                        )}
                    </div>
                    <div className="presentation-metadata-presentation">
                        <div className="presentation-dates-presentation">
                            Створено: {formatDate(presentation.created_at)}
                            <span className="dot-divider-presentation"/>Остання
                            зміна: {formatDate(presentation.modified_at)}
                        </div>
                        <div
                            className={`presentation-type-presentation type-badge-presentation`}>
                            {isGroup ? "Спільний" : "Індивідуальний"}
                        </div>
                    </div>
                </div>
                <GreenButton
                    label="Приєднатися"
                    className="join-button-presentation"
                    disabled={structureParts.length === 0}
                    onClick={() => navigate(`/presentation/${presentationId}/teleprompter`)}
                />
            </div>
            <div className="presentation-content-presentation">
                <div className="cards-row-presentation">
                    <div className="left-column-presentation">
                        <div className="participants-card-presentation">
                            <div className="participants-header-presentation">
                                <h2 className="section-title-presentation">Учасники</h2>
                                {isOwner && (
                                    <BeigeButton
                                        label="Запросити"
                                        className="invite-btn-presentation"
                                        onClick={handleInvite}
                                    />
                                )}
                            </div>
                            <div className="participants-scroll-list-presentation">
                                {participants.map((participant) => {
                                    const isJoined = joinedUsers.some((u) => u.userId === participant.user.user_id);
                                    return (
                                        <div key={participant.participant_id} className="participant-row-presentation">
                                            <Avatar
                                                src={
                                                    participant.user.avatar
                                                        ? import.meta.env.VITE_APP_API_BASE_URL + participant.user.avatar
                                                        : null
                                                }
                                                alt={`${participant.user.first_name} ${participant.user.last_name}`}
                                                size={42}
                                                name={participant.user.first_name}
                                                surname={participant.user.last_name}
                                                bgColor={participant.color}
                                            />
                                            <div className="participant-info-presentation">
                                                <div className="participant-name-presentation">
                                                    {participant.user.first_name} {participant.user.last_name}
                                                </div>
                                                <div className="participant-role-presentation">
                                                    {participant.user.user_id === presentation.owner.user_id
                                                        ? "Власник"
                                                        : "Учасник"}
                                                </div>
                                            </div>
                                            {isJoined && (
                                                <span className="participant-status-presentation">У виступі</span>
                                            )}
                                            {isOwner && participant.user.user_id !== presentation.owner.user_id && (
                                                <button
                                                    className="participant-remove-btn-presentation"
                                                    title="Видалити учасника"
                                                    onClick={() => handleDeleteParticipant(participant.participant_id)}
                                                >
                                                    <img src={crossIcon}/>
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="videos-card-presentation">
                            <div className="videos-header-presentation">
                                <h2 className="section-title-presentation">Записані відео</h2>
                                {isOwner && (
                                    <BeigeButton
                                        label="Перейти до монтажу"
                                        className="montage-btn"
                                        disabled={Object.keys(groupedVideos).length === 0}
                                        onClick={() => handleMontageClick()}
                                    />
                                )}
                            </div>
                            {Object.keys(groupedVideos).length === 0 && (
                                <div className="empty-presentation-block-hint">Немає записаних відео</div>
                            )}
                            <div className="videos-groups-scroll-presentation">
                                {Object.entries(groupedVideos).map(([key, vids]) => {
                                    const [start, end] = key.split("_");
                                    return (
                                        <div key={key} className="video-group-presentation">
                                            <div className="video-session-range-presentation">
                                                {formatDateTime(start)} – {formatDateTime(end)}
                                            </div>
                                            <div className="video-row-presentation">
                                                {vids.map(video => (
                                                    <div
                                                        key={video.video_id}
                                                        className="video-item-presentation"
                                                        onClick={() => handleVideoClick(video)}
                                                        style={{cursor: "pointer"}}
                                                    >
                                                        <div className="video-thumbnail-container-presentation">
                                                            <img
                                                                src={
                                                                    import.meta.env.VITE_APP_API_BASE_URL +
                                                                    video.video_thumbnail
                                                                }
                                                                alt={video.video_title}
                                                                className="video-thumbnail-presentation"
                                                            />
                                                            <img
                                                                src={playIcon}
                                                                alt="Play"
                                                                className="play-icon-presentation"
                                                            />
                                                            <div className="video-duration-presentation">
                                                                {calculateTotalDuration(video.video_duration)}
                                                            </div>
                                                        </div>
                                                        <div
                                                            className="video-title-presentation">{truncateText(video.video_title, 50)}</div>
                                                        <div className="video-author-presentation">
                                                            {video.video_author.first_name} {video.video_author.last_name}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="right-column-presentation">
                        <div className="structure-card-presentation">
                            <div className="structure-header-presentation">
                                <div className="structure-title-container-presentation">
                                    <h2 className="section-title-presentation">Структура виступу</h2>

                                    {structureParts.length > 0 && <div className="duration-container-presentation">
                                        <img src={timeIcon} alt="Time" className="time-icon-presentation"/>
                                        <div className="estimated-time-presentation">
                                            {presentationsConfig && structure?.total_words_count
                                                ? getPartDuration(structure.total_words_count, presentationsConfig, false)
                                                : ""}
                                        </div>
                                    </div>}
                                </div>
                                <BeigeButton
                                    label={(isPresentationStarted ? "Переглянути" : "Редагувати") + " текст"}
                                    className="edit-text-button-presentation"
                                    onClick={() => navigate(`/presentation/${presentationId}/text`)}
                                />
                            </div>
                            <div className="structure-scrollable-presentation" ref={structureScrollRef}>
                                {structureParts.length === 0 ? (
                                    <div className="empty-presentation-block-hint">
                                        Тут зʼявиться зміст вашого виступу
                                    </div>
                                ) : (
                                    structureParts.map((part, index) => (
                                        <div key={index} className="structure-part-presentation">
                                            <div className="part-column-presentation">
                                                <div className="part-header-presentation">
                                                    <div className="part-title-presentation">Частина {index + 1}</div>
                                                    <div className="part-duration-presentation">
                                                        <img
                                                            src={timeIcon}
                                                            alt="Time"
                                                            className="time-icon-small-presentation"
                                                        />
                                                        <div className="part-time-presentation">
                                                            {presentationsConfig
                                                                ? getPartDuration(part.words_count, presentationsConfig)
                                                                : ""}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="part-assignee-presentation">
                                                    <Avatar
                                                        src={
                                                            part.assignee.avatar
                                                                ? import.meta.env.VITE_APP_API_BASE_URL +
                                                                part.assignee.avatar
                                                                : null
                                                        }
                                                        alt={`${part.assignee.first_name} ${part.assignee.last_name}`}
                                                        size={42}
                                                        name={part.assignee.first_name}
                                                        surname={part.assignee.last_name}
                                                        bgColor={participants.find(p => p.user.user_id === part.assignee.user_id)?.color}
                                                    />
                                                    <div className="assignee-name-presentation">
                                                        {part.assignee.first_name} {part.assignee.last_name}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="part-text-column-presentation">
                                                <div className="part-text-presentation">{part.text_preview}</div>
                                            </div>
                                        </div>
                                    )))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <InviteParticipantModal
                open={inviteModalOpen}
                onClose={() => setInviteModalOpen(false)}
                inviteLink={inviteLink}
            />
            <EditPresentationNameModal
                open={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                currentName={presentation?.name}
                presentationId={presentationId}
                onSuccess={handleEditSuccess}
            />
            <DeleteConfirmationModal
                open={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleConfirmDeletePresentation}
                confirmationTitle="Ви впевнені, що хочете видалити цей виступ?"
                confirmationDescription="Введіть назву виступу нижче для підтвердження"
                confirmationInputValue={presentation?.name}
                cancelButtonText="Скасувати"
                confirmButtonText="Так, видалити"
                reloadAfterDelete={false}
            />
            <VideoModal
                open={videoModalOpen}
                onClose={() => setVideoModalOpen(false)}
                video={selectedVideo}
            />
            <BuySubscriptionModal
                open={premiumModalOpen}
                onClose={() => setPremiumModalOpen(false)}/>

        </div>
    );
};

export default PresentationPage;
