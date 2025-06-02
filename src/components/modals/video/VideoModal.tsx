import React, {useState} from "react";
import BaseModal from "../base/BaseModal";
import shareIcon from "../../../assets/share-icon.svg";
import downloadIcon from "../../../assets/download-icon.svg";
import deleteIcon from "../../../assets/delete-icon.svg";
import {usePresentationVideoFile} from "../../../hooks/usePresentationVideoFile";
import {usePresentationVideo} from "../../../hooks/usePresentationVideo.ts";
import DeleteConfirmationModal from "../deleteConfirmation/DeleteConfirmationModal.tsx";
import ShareVideoModal from "../shareVideo/ShareVideoModal.tsx";
import "./VideoModal.css";
import CustomVideoPlayer from "../../customVideoPlayer/CustomVideoPlayer.tsx";

export interface VideoModalProps {
    open: boolean;
    onClose: () => void;
    video: {
        video_id: number;
        video_title: string;
        video_author: {
            first_name: string;
            last_name: string;
        };
        presentation_start: {
            start_date: string;
            end_date: string;
        };
        video_duration: number;
    } | null;
    onDelete?: () => void;
}

function formatDateTimeRange(start: string, end: string) {
    const startD = new Date(start);
    const endD = new Date(end);

    const formatDate = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day}.${month}.${year} ${hours}:${minutes}`;
    };

    return `${formatDate(startD)} - ${formatDate(endD)}`;
}

const VideoModal: React.FC<VideoModalProps> = ({open, onClose, video, onDelete}) => {
    const {videoUrl, loading, error} = usePresentationVideoFile(video?.video_id ?? null);
    const {deleteVideo, getVideoShareLink, shareLink} = usePresentationVideo();
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [shareLoading, setShareLoading] = useState(false);

    const downloadVideo = () => {
        if (!videoUrl) return;
        const a = document.createElement("a");
        a.href = videoUrl;
        a.download = (video?.video_title || "video") + ".webm";
        a.click();
    };

    const handleConfirmDelete = async () => {
        if (!video) return;
        setDeleting(true);
        await deleteVideo(video.video_id);
        setDeleting(false);
        if (typeof onDelete === "function") onDelete();
        setDeleteModalOpen(false);
    };

    const getTitleText = () => {
        if (!video) return "";
        return `${video.video_title} – ${video.video_author.first_name} ${video.video_author.last_name}`;
    };

    const handleShareClick = async () => {
        if (!video) return;
        setShareLoading(true);
        await getVideoShareLink(video.video_id);
        setShareLoading(false);
        setShareModalOpen(true);
    };

    return (
        <>
            <BaseModal show={open} onClose={onClose} fullscreen transparent closeOnBackdropClick>
                <div className="video-modal-wrapper">
                    {loading ? (
                        <div className="video-modal-loader">Завантаження відео...</div>
                    ) : error ? (
                        <div className="video-modal-error">{error}</div>
                    ) : (videoUrl && video) ? (
                        <CustomVideoPlayer
                            videoUrl={videoUrl}
                            title={getTitleText()}
                            dates={formatDateTimeRange(
                                video.presentation_start.start_date,
                                video.presentation_start.end_date
                            )}
                            duration={video.video_duration / 1000}
                            onClose={onClose}
                            actions={
                                <>
                                    <button
                                        className="cvp-action"
                                        title="Поділитися"
                                        onClick={handleShareClick}
                                        disabled={shareLoading}
                                    >
                                        <img src={shareIcon} alt="Поділитися"/>
                                    </button>
                                    <button
                                        className="cvp-action"
                                        title="Завантажити"
                                        onClick={downloadVideo}
                                    >
                                        <img src={downloadIcon} alt="Завантажити"/>
                                    </button>
                                    <button
                                        className="cvp-action"
                                        title="Видалити"
                                        onClick={() => setDeleteModalOpen(true)}
                                        disabled={deleting}
                                    >
                                        <img src={deleteIcon} alt="Видалити"/>
                                    </button>
                                </>
                            }
                        />
                    ) : null}
                </div>
            </BaseModal>
            <DeleteConfirmationModal
                open={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                confirmationTitle="Ви впевнені, що хочете видалити це відео?"
            />
            <ShareVideoModal
                open={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                videoLink={shareLink || ""}
            />
        </>
    );
};

export default VideoModal;
