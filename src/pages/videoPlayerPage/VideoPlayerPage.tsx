import React, {useEffect, useState} from "react";
import {useParams, useNavigate} from "react-router-dom";
import CustomVideoPlayer from "../../components/customVideoPlayer/CustomVideoPlayer.tsx";
import {useSharedVideo} from "../../hooks/usePresentationVideo.ts";
import "./VideoPlayerPage.css";
import NotFound from "../notFound/NotFound.tsx";

const VideoPlayerPage: React.FC = () => {
    const {shareCode} = useParams<{ shareCode: string }>();
    const navigate = useNavigate();
    const {videoUrl, loading, error, fetchSharedVideo, cleanupVideoUrl} = useSharedVideo(shareCode ?? null);
    const [videoDuration, setVideoDuration] = useState<number | undefined>(undefined);

    useEffect(() => {
        fetchSharedVideo();
        return () => cleanupVideoUrl();
    }, [shareCode]);

    const handleVideoLoad = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        const video = e.currentTarget;
        if (video && video.duration) {
            setVideoDuration(video.duration);
        }
    };

    if (error) {
        return <NotFound/>;
    }

    return (
        <div className="video-player-fullscreen">
            {loading ? (
                <div className="video-player-status">
                    <span>Завантаження відео...</span>
                </div>
            ) : (
                <div className="video-player-container">
                    <CustomVideoPlayer
                        videoUrl={videoUrl ?? ""}
                        title="Записане відео"
                        showHeader={true}
                        showFooter={true}
                        autoPlay={true}
                        duration={videoDuration}
                        onLoadedMetadata={handleVideoLoad}
                    />
                </div>
            )}
        </div>

    );
};

export default VideoPlayerPage;
