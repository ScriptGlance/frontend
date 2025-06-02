import React, {useRef, useEffect, useState} from "react";
import volumeOffIcon from "../../assets/volume-off.svg";
import volumeLowIcon from "../../assets/volume-low.svg";
import volumeHighIcon from "../../assets/volume-high.svg";
import playIcon from "../../assets/play-icon.svg";
import pauseIcon from "../../assets/pause-icon.svg";
import crossIcon from "../../assets/cross-icon-white.svg";
import "./CustomVideoPlayer.css";

export interface CustomVideoPlayerProps {
    videoUrl: string;
    title?: string;
    author?: string;
    dates?: string;
    duration?: number;
    onClose?: () => void;
    actions?: React.ReactNode;
    autoPlay?: boolean;
    showHeader?: boolean;
    showFooter?: boolean;
    onLoadedMetadata?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
}

function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

const AUTO_HIDE_MS = 2500;
const VOLUME_SLIDER_HIDE_DELAY = 1000;

const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
                                                                 videoUrl,
                                                                 title,
                                                                 dates,
                                                                 duration,
                                                                 onClose,
                                                                 actions,
                                                                 autoPlay = true,
                                                                 showHeader = true,
                                                                 showFooter = true,
                                                                 onLoadedMetadata = () => null,
                                                             }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const progressContainerRef = useRef<HTMLDivElement | null>(null);
    const volumeSliderRef = useRef<HTMLDivElement | null>(null);

    const [playing, setPlaying] = useState(autoPlay);
    const [current, setCurrent] = useState(0);
    const [muted, setMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [isAdjustingVolume, setIsAdjustingVolume] = useState(false);
    const hideTimeout = useRef<number | null>(null);
    const volumeHideTimeout = useRef<number | null>(null);

    const videoDurationInSeconds = duration || 0;
    const progressPercentage = videoDurationInSeconds ? (current / videoDurationInSeconds) * 100 : 0;

    const showControls = () => {
        setControlsVisible(true);
        if (hideTimeout.current) window.clearTimeout(hideTimeout.current);
        if (playing) {
            hideTimeout.current = window.setTimeout(() => setControlsVisible(false), AUTO_HIDE_MS);
        }
    };

    useEffect(() => {
        setControlsVisible(true);
        if (hideTimeout.current) window.clearTimeout(hideTimeout.current);
        if (playing) {
            hideTimeout.current = window.setTimeout(() => setControlsVisible(false), AUTO_HIDE_MS);
        }
        return () => {
            if (hideTimeout.current) window.clearTimeout(hideTimeout.current);
            if (volumeHideTimeout.current) window.clearTimeout(volumeHideTimeout.current);
        };
    }, [videoUrl, playing]);

    useEffect(() => {
        if (!playing) {
            setControlsVisible(true);
            if (hideTimeout.current) window.clearTimeout(hideTimeout.current);
        }
    }, [playing]);

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play();
            setPlaying(true);
        } else {
            videoRef.current.pause();
            setPlaying(false);
        }
        showControls();
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        if (!muted) {
            videoRef.current.muted = true;
            setMuted(true);
        } else {
            videoRef.current.muted = false;
            videoRef.current.volume = volume;
            setMuted(false);
        }
        showVolumeControls();
        showControls();
    };

    const showVolumeControls = () => {
        setShowVolumeSlider(true);
        if (volumeHideTimeout.current) window.clearTimeout(volumeHideTimeout.current);
        if (!isAdjustingVolume) {
            volumeHideTimeout.current = window.setTimeout(() => {
                if (!isAdjustingVolume) {
                    setShowVolumeSlider(false);
                }
            }, VOLUME_SLIDER_HIDE_DELAY);
        }
    };

    const handleVolumeChange = (newVolume: number) => {
        newVolume = Math.max(0, Math.min(1, newVolume));
        setVolume(newVolume);

        if (videoRef.current) {
            videoRef.current.volume = newVolume;
            if (newVolume === 0) {
                videoRef.current.muted = true;
                setMuted(true);
            } else if (muted) {
                videoRef.current.muted = false;
                setMuted(false);
            }
        }
        showControls();
    };

    const handleVolumeSliderInteraction = (e: React.MouseEvent | React.TouchEvent) => {
        if (!volumeSliderRef.current) return;
        const rect = volumeSliderRef.current.getBoundingClientRect();
        const clientX = 'touches' in e
            ? (e as React.TouchEvent).touches[0].clientX
            : (e as React.MouseEvent).clientX;

        const offsetX = clientX - rect.left;
        const newVolume = Math.max(0, Math.min(1, offsetX / rect.width));
        handleVolumeChange(newVolume);
    };

    const handleVolumeMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        setIsAdjustingVolume(true);
        handleVolumeSliderInteraction(e);

        const handleMouseMove = (e: MouseEvent | TouchEvent) => {
            e.preventDefault();
            const mouseEvent = e as MouseEvent;
            const touchEvent = e as TouchEvent;
            const clientX = 'touches' in e
                ? touchEvent.touches[0].clientX
                : mouseEvent.clientX;

            if (!volumeSliderRef.current) return;
            const rect = volumeSliderRef.current.getBoundingClientRect();
            const offsetX = clientX - rect.left;
            const newVolume = Math.max(0, Math.min(1, offsetX / rect.width));
            handleVolumeChange(newVolume);
        };

        const handleMouseUp = () => {
            setIsAdjustingVolume(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('touchmove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchend', handleMouseUp);
            volumeHideTimeout.current = window.setTimeout(() => {
                setShowVolumeSlider(false);
            }, VOLUME_SLIDER_HIDE_DELAY);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('touchmove', handleMouseMove, {passive: false});
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchend', handleMouseUp);
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrent(videoRef.current.currentTime);
        }
    };

    const handleProgressBarClick = (e: React.MouseEvent) => {
        if (!progressContainerRef.current || !videoRef.current) return;
        const rect = progressContainerRef.current.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const seekPercentage = offsetX / rect.width;
        const seekTime = videoDurationInSeconds * seekPercentage;
        videoRef.current.currentTime = seekTime;
        setCurrent(seekTime);
        showControls();
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            videoRef.current.volume = volume;
            videoRef.current.muted = muted;
        }
        setCurrent(0);
        setPlaying(autoPlay);
    };

    const handleUserActive = () => {
        showControls();
    };

    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;
        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);
        el.addEventListener("play", onPlay);
        el.addEventListener("pause", onPause);
        return () => {
            el.removeEventListener("play", onPlay);
            el.removeEventListener("pause", onPause);
        };
    }, [videoUrl]);

    return (
        <div
            className="custom-video-player-root"
            tabIndex={0}
            onMouseMove={handleUserActive}
            onTouchStart={handleUserActive}
            onClick={handleUserActive}
            onKeyDown={handleUserActive}
        >
            {showHeader && (
                <div className={`cvp-header${controlsVisible ? '' : ' hidden'}`}>
                    <div className="cvp-title-dates-block">
                        <span className="cvp-title">{title}</span>
                        {dates && <span className="cvp-dates">{dates}</span>}
                    </div>
                    {onClose && (
                        <button className="cvp-close-btn" onClick={onClose} tabIndex={-1}>
                            <img src={crossIcon} alt="Закрити"/>
                        </button>
                    )}
                </div>
            )}

            <video
                ref={videoRef}
                src={videoUrl}
                className="cvp-video"
                autoPlay={autoPlay}
                playsInline
                onClick={togglePlay}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={(event) => {
                    if (onLoadedMetadata) onLoadedMetadata(event);
                    handleLoadedMetadata();
                }}
                muted={muted}
                tabIndex={-1}
            />

            {showFooter && (
                <div className={`cvp-footer${controlsVisible ? '' : ' hidden'}`}>
                    <div
                        ref={progressContainerRef}
                        className="cvp-progress-container"
                        onClick={handleProgressBarClick}
                    >
                        <div
                            className="cvp-progress-bar"
                            style={{width: `${progressPercentage}%`}}
                        />
                    </div>
                    <div className="cvp-controls-row">
                        <div className="cvp-left-controls">
                            <button className="cvp-ctrl cvp-play" onClick={togglePlay}>
                                {playing ? (
                                    <img src={pauseIcon} width="28" height="28" alt="Pause"/>
                                ) : (
                                    <img src={playIcon} width="28" height="28" alt="Play"/>
                                )}
                            </button>
                            <div className="cvp-volume-container">
                                <button
                                    className="cvp-ctrl cvp-mute"
                                    onClick={toggleMute}
                                    onMouseEnter={showVolumeControls}
                                >
                                    <img
                                        src={
                                            muted || volume === 0
                                                ? volumeOffIcon
                                                : volume < 0.5
                                                    ? volumeLowIcon
                                                    : volumeHighIcon
                                        }
                                        alt="Гучність"
                                        width={28}
                                        height={28}
                                    />
                                </button>
                                <div
                                    className={`cvp-volume-slider ${showVolumeSlider || controlsVisible ? 'visible' : ''}`}
                                    onMouseEnter={showVolumeControls}
                                >
                                    <div
                                        ref={volumeSliderRef}
                                        className="cvp-volume-slider-bg"
                                        onClick={handleVolumeSliderInteraction}
                                        onMouseDown={handleVolumeMouseDown}
                                        onTouchStart={handleVolumeMouseDown}
                                    >
                                        <div
                                            className="cvp-volume-slider-fill"
                                            style={{width: `${muted ? 0 : volume * 100}%`}}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <span className="cvp-timing">
                            {formatDuration(current)} / {formatDuration(videoDurationInSeconds)}
                        </span>
                        <div className="cvp-right-controls">{actions}</div>
                    </div>
                </div>
            )
            }
        </div>
    );
};

export default CustomVideoPlayer;
