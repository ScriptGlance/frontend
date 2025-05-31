import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import backIcon from "../../assets/arrow-back-icon.svg";
import playIcon from "../../assets/play-icon.svg";
import stopIcon from "../../assets/stop-icon.svg";
import crownIcon from "../../assets/crown-icon.svg";
import videoOnIcon from "../../assets/video-on-icon.svg";
import videoOffIcon from "../../assets/video-off-icon.svg";

import { Participant, PresentationActiveJoinedUser } from "../../api/repositories/presentationsRepository.ts";
import { UserProfile } from "../../api/repositories/userRepository.ts";
import { ActiveUser } from "../../pages/presentationEditText/PresentationTextEditorPage.tsx";

import { Avatar } from "../avatar/Avatar.tsx";
import Logo from "../logo/Logo.tsx";
import './ParticipantsHeader.css';

const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const paddedSeconds = seconds < 10 ? `0${seconds}` : seconds;
    const paddedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    if (hours > 0) {
        const paddedHours = hours < 10 ? `0${hours}` : hours;
        return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
    }
    return `${paddedMinutes}:${paddedSeconds}`;
};

interface EditorHeaderProps {
    pageType: 'editor' | 'teleprompter';
    presentationName?: string;
    participants?: Participant[];
    profile?: UserProfile;
    onBack?: () => void;
    editorActiveUsers?: ActiveUser[];
    teleprompterActiveUsers?: PresentationActiveJoinedUser[];
    teleprompterOwnerId?: number | null;
    onPlayPauseClick?: () => void;
    currentPresentationStartDate?: string | null;
}

const ParticipantsHeader: React.FC<EditorHeaderProps> = ({
                                                             pageType,
                                                             presentationName,
                                                             participants,
                                                             profile,
                                                             onBack,
                                                             editorActiveUsers,
                                                             teleprompterActiveUsers,
                                                             teleprompterOwnerId,
                                                             onPlayPauseClick,
                                                             currentPresentationStartDate,
                                                         }) => {
    const navigate = useNavigate();
    const [elapsedTime, setElapsedTime] = useState<string>("00:00");

    const startTime = useMemo(() => {
        return currentPresentationStartDate ? new Date(currentPresentationStartDate).getTime() : null;
    }, [currentPresentationStartDate]);


    useEffect(() => {
        let intervalId: NodeJS.Timeout | undefined;

        if (pageType === 'teleprompter' && startTime) {
            const now = Date.now();
            const diffSeconds = Math.floor((now - startTime) / 1000);
            setElapsedTime(formatTime(diffSeconds));

            intervalId = setInterval(() => {
                const now = Date.now();
                const diffSeconds = Math.floor((now - startTime) / 1000);
                setElapsedTime(formatTime(diffSeconds));
            }, 1000);
        } else {
            setElapsedTime("00:00");
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [startTime, pageType]);


    const handleLogoClick = () => {
        navigate('/dashboard');
    };

    const getActiveUsersForDisplay = () => {
        if (!participants) {
            return [];
        }
        if (pageType === 'editor' && editorActiveUsers) {
            return participants.filter(p => editorActiveUsers.some(eau => eau.user_id === p.user.user_id));
        }
        if (pageType === 'teleprompter' && teleprompterActiveUsers) {
            return participants.filter(p => teleprompterActiveUsers.some(tau => tau.userId === p.user.user_id));
        }
        return [];
    };

    const activeParticipantsToDisplay = getActiveUsersForDisplay();


    return (
        <div className="participants-header">
            <div className="participants-nav">
                {pageType === 'editor' && onBack && (
                    <div className="participants-header-back" onClick={onBack} title="Back">
                        <img src={backIcon} alt="Back" className="participants-back-icon"/>
                    </div>
                )}
                <Logo onClick={handleLogoClick} premium={profile?.has_premium} />
                <div className="participants-presentation-name">{presentationName}</div>
                {pageType === 'teleprompter' && (
                    <>
                        {onPlayPauseClick && (
                            <button
                                className={`play-pause-button ${currentPresentationStartDate ? 'started' : ''}`}
                                onClick={onPlayPauseClick}
                                title={currentPresentationStartDate ? "Stop" : "Start"}
                                aria-label={currentPresentationStartDate ? "Stop presentation" : "Start presentation"}
                            >
                                <img src={currentPresentationStartDate ? stopIcon : playIcon} alt={currentPresentationStartDate ? "Stop" : "Start"}/>
                            </button>
                        )}
                        {currentPresentationStartDate && (
                            <div className="presentation-timer">{elapsedTime}</div>
                        )}
                    </>
                )}
            </div>

            <div className="participants-header-users">
                {activeParticipantsToDisplay.map((participant) => {
                    const user = participant.user;
                    const fullName = `${user.first_name} ${user.last_name}`;
                    let isTeleprompterOwner = false;
                    let isCameraOn = false;

                    if (pageType === 'teleprompter' && teleprompterActiveUsers) {
                        isTeleprompterOwner = user.user_id === teleprompterOwnerId;
                        const teleprompterUserInfo = teleprompterActiveUsers.find(tau => tau.userId === user.user_id);
                        isCameraOn = !!teleprompterUserInfo && teleprompterUserInfo.isRecordingModeActive;
                    }

                    return (
                        <div className="avatar-tooltip-wrapper" key={user.user_id}>
                            <div className="avatar-icon-container">
                                <Avatar
                                    src={user.avatar ? `${import.meta.env.VITE_APP_API_BASE_URL}${user.avatar}` : null}
                                    alt={fullName}
                                    size={40}
                                    className="header-user-avatar"
                                    style={{borderColor: participant.color || '#ccc'}}
                                    bgColor={participant.color || '#ccc'}
                                    name={user.first_name}
                                    surname={user.last_name}
                                />
                                {isTeleprompterOwner && (
                                    <img src={crownIcon} className="crown-icon" alt="Teleprompter Owner"/>
                                )}
                                {pageType === 'teleprompter' && (
                                    <img
                                        src={isCameraOn ? videoOnIcon : videoOffIcon}
                                        className={`camera-icon ${isCameraOn ? 'active' : ''}`}
                                        alt={isCameraOn ? "Camera On" : "Camera Off"}
                                    />
                                )}
                            </div>
                            <div className="avatar-tooltip">{fullName}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ParticipantsHeader;