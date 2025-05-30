import {useState} from "react";
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
    const {profile, updateProfile, loading} = useProfile();
    const [modalOpen, setModalOpen] = useState(false);
    const [premiumModalOpen, setPremiumModalOpen] = useState(false);

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

    return (
        <div className="header-buttons">
            {role === Role.User && <GreenButton
                label={profile?.has_premium ? "Керувати підпискою" : "Купити преміум"}
                className="premium-btn"
                onClick={handlePremiumClick}
            />}
            {role === Role.User && <RoundButton
                icon={<img src={chatIcon} alt="Чат"/>}
                ariaLabel="Чат"
                className="round-btn"
                onClick={onChat}
            />}
            <Avatar
                src={profile?.avatar ? import.meta.env.VITE_APP_API_BASE_URL + profile.avatar : null}
                onClick={handleAvatarClick}
                alt={profile?.first_name || "Користувач"}
                size={42}
            />
            <RoundButton
                icon={<img src={logoutIcon} alt="Вихід"/>}
                ariaLabel="Вихід"
                className="round-btn"
                onClick={onLogout}
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
            {profile?.has_premium ? (
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
        </div>
    );
};

export default RightHeaderButtons;