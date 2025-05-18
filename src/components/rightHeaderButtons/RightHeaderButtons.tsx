import { GreenButton } from "../appButton/AppButton";
import RoundButton from "../roundButton/RoundButton";
import { Avatar } from "../avatar/Avatar";
import chatIcon from "../../assets/chat.svg";
import logoutIcon from "../../assets/logout.svg";
import './RightHeaderButtons.css'

interface RightHeaderButtonsProps {
    avatar: string | null;
    userName: string;
    onChat?: () => void;
    onLogout?: () => void;
    onBuyPremium?: () => void;
}

const RightHeaderButtons = ({
                                avatar,
                                userName,
                                onChat,
                                onLogout,
                                onBuyPremium,
                            }: RightHeaderButtonsProps) => (
    <div className="header-buttons">
        <GreenButton
            label="Купити преміум"
            className="premium-btn"
            onClick={onBuyPremium}
        />
        <RoundButton
            icon={<img src={chatIcon} alt="Чат" />}
            ariaLabel="Чат"
            className="round-btn"
            onClick={onChat}
        />
        <Avatar src={avatar} alt={userName || "Користувач"} size={42} />
        <RoundButton
            icon={<img src={logoutIcon} alt="Вихід" />}
            ariaLabel="Вихід"
            className="round-btn"
            onClick={onLogout}
        />
    </div>
);

export default RightHeaderButtons;
