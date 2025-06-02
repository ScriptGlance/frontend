import {useEffect, useState} from "react";
import {GreenButton} from "../appButton/AppButton";
import RoundButton from "../roundButton/RoundButton";
import {Avatar} from "../avatar/Avatar";
import chatIcon from "../../assets/chat.svg";
import logoutIcon from "../../assets/logout.svg";
import './RightHeaderButtons.css';
import {useProfile} from "../../hooks/ProfileContext.tsx";
import UpdateProfileModal from "../modals/updateProfile/UpdateProfileModal.tsx";
import PremiumSubscriptionModal from "../modals/subscriptionStatus/SubscriptionStatusModal.tsx";
import BuySubscriptionModal from "../modals/buySubscription/BuySubscriptionModal.tsx";
import {Role} from "../../types/role.ts";
import {UserChatWindow} from "../draggableWindow/userChat/UserChatWindow.tsx";
import {useUserUnreadCount} from "../../hooks/useChat";
import {disconnectChatSocketManager, useChatSocket} from "../../hooks/useChatSocket";
import {Role as AppRole} from "../../types/role";
import {UserProfile} from "../../api/repositories/profileRepository.ts";

interface RightHeaderButtonsProps {
    onChat?: () => void;
    onLogout?: () => void;
    role?: Role;
}

const RightHeaderButtons = ({
                                onChat,
                                onLogout,
                                role = Role.User,
                            }: RightHeaderButtonsProps) => {
    const {profile, updateProfile, loading} = useProfile(role);
    const [modalOpen, setModalOpen] = useState(false);
    const [premiumModalOpen, setPremiumModalOpen] = useState(false);

    const [chatOpen, setChatOpen] = useState(false);

    const {unread, refetch: refetchUnread} = useUserUnreadCount();

    useChatSocket({
        role: AppRole.User,
        onMessage: () => refetchUnread(),
        onChatClosed: () => refetchUnread()
    });

    const handleAvatarClick = () => {
        if (profile) setModalOpen(true);
    };

    const handleProfileSave = async (fields: { first_name: string; last_name: string; avatar?: File | null }) => {
        await updateProfile(fields);
        setModalOpen(false);
    };

    const handlePremiumClick = () => {
        setPremiumModalOpen(true);
    };

    const handleChatClick = () => {
        setChatOpen(true);
        refetchUnread();
        onChat?.();
    };

    useEffect(() => {
        if (chatOpen) {
            refetchUnread();
        }
    }, [chatOpen, refetchUnread]);

    return (
        <div className="header-buttons" style={{position: "relative"}}>
            {role === Role.User && (
                <GreenButton
                    label={(profile as UserProfile | undefined)?.has_premium ? "Керувати підпискою" : "Купити преміум"}
                    className="premium-btn"
                    onClick={handlePremiumClick}
                />
            )}
            {role === Role.User && (
                <div style={{position: "relative", display: "inline-block"}}>
                    <RoundButton
                        icon={<img src={chatIcon} alt="Чат"/>}
                        ariaLabel="Чат"
                        className="round-btn"
                        onClick={handleChatClick}
                    />
                    {unread > 0 && (
                        <span
                            style={{
                                position: "absolute",
                                top: -6,
                                right: -4,
                                background: "#EF4747",
                                color: "#fff",
                                borderRadius: "50%",
                                minWidth: 22,
                                height: 22,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "1.03rem",
                                fontWeight: 600,
                                boxShadow: "0 1.5px 5px 0 rgba(60,0,0,0.10)",
                                zIndex: 2,
                                pointerEvents: "none",
                                padding: "0 5px"
                            }}
                        >
                            {unread}
                        </span>
                    )}
                </div>
            )}
            <Avatar
                src={profile?.avatar ? import.meta.env.VITE_APP_API_BASE_URL + profile.avatar : null}
                onClick={handleAvatarClick}
                alt={profile?.first_name || "Користувач"}
                size={42}
                name={profile?.first_name || ""}
                surname={profile?.last_name || ""}
            />
            <RoundButton
                icon={<img src={logoutIcon} alt="Вихід"/>}
                ariaLabel="Вихід"
                className="round-btn"
                onClick={() => {
                    if(onLogout) {
                        disconnectChatSocketManager(Role.User);
                        onLogout();
                    }
                }}
            />
            {profile && (
                <UpdateProfileModal
                    open={modalOpen}
                    initialProfile={{
                        first_name: profile.first_name,
                        last_name: profile.last_name,
                        avatar: profile.avatar,
                    }}
                    onClose={() => setModalOpen(false)}
                    onSave={handleProfileSave}
                    loading={loading}
                />
            )}
            {(profile as UserProfile | undefined)?.has_premium ? (
                <PremiumSubscriptionModal
                    open={premiumModalOpen}
                    onClose={() => setPremiumModalOpen(false)}
                />
            ) : (
                <BuySubscriptionModal
                    open={premiumModalOpen}
                    onClose={() => setPremiumModalOpen(false)}
                />
            )}
            <UserChatWindow
                visible={chatOpen}
                onClose={() => setChatOpen(false)}
            />
        </div>
    );
};

export default RightHeaderButtons;