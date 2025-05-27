import React from 'react';
import backIcon from "../../assets/arrow-back-icon.svg";
import {Participant} from "../../api/repositories/presentationsRepository.ts";
import {Avatar} from "../avatar/Avatar.tsx";
import Logo from "../logo/Logo.tsx";
import {useNavigate} from "react-router-dom";
import {UserProfile} from "../../api/repositories/userRepository.ts";
import {ActiveUser} from "../../pages/presentationEditText/PresentationTextEditorPage.tsx";
import './ParticipantsHeader.css';

interface EditorHeaderProps {
    presentationName?: string;
    participants?: Participant[];
    activeUsers: ActiveUser[];
    profile?: UserProfile;
    onBack: () => void;
}

const ParticipantsHeader: React.FC<EditorHeaderProps> = ({
                                                       presentationName,
                                                       participants,
                                                       activeUsers,
                                                         profile,
                                                       onBack,
                                                   }) => {

    const navigate = useNavigate();
    const handleLogoClick = () => {
        navigate('/dashboard');
    }
    return (
        <div className="participants-header">
            <div className="participants-nav">
                <div className="participants-header-back" onClick={onBack}>
                    <img src={backIcon} alt="Back" className="participants-back-icon"/>
                </div>
                <Logo onClick={handleLogoClick} premium={profile?.has_premium} />
                <div className="participants-presentation-name">{presentationName}</div>
            </div>

            <div className="participants-header-users">
                {participants?.filter(p =>
                    activeUsers.some(u => u.user_id === p.user.user_id)
                ).map((participant) => {
                    const fullName = `${participant.user.first_name} ${participant.user.last_name}`;
                    return (
                        <div className="avatar-tooltip-wrapper" key={participant.user.user_id}>
                            <Avatar
                                src={
                                    participant.user.avatar
                                        ? `${import.meta.env.VITE_APP_API_BASE_URL}${participant.user.avatar}`
                                        : null
                                }
                                alt={fullName}
                                size={40}
                                className="header-user-avatar"
                                style={{
                                    borderColor: participant.color
                                }}
                                bgColor={participant.color}
                                name={participant.user.first_name}
                                surname={participant.user.last_name}
                            />
                            <div className="avatar-tooltip">{fullName}</div>
                        </div>
                    )
                })}
            </div>

        </div>
    );
};

export default ParticipantsHeader;