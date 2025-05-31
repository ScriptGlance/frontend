import React, { useState, useEffect } from "react";
import "./BuySubscriptionModal.css";
import BaseModal from "../base/BaseModal";
import crossIcon from "../../../assets/cross-icon.svg";
import checkIcon from "../../../assets/check-mark-icon.svg";
import closeIcon from "../../../assets/close-icon.svg";
import { useCreateSubscriptionCheckout } from "../../../hooks/useSubscriptionData";
import { useAuth } from "../../../hooks/useAuth";
import { Role } from "../../../types/role";
import { useCallback } from "react";
import presentationsRepository from "../../../api/repositories/presentationsRepository";
import { DEFAULT_ERROR_MESSAGE } from "../../../contstants";

export interface BuySubscriptionModalProps {
    open: boolean;
    onClose: () => void;
}

export interface PresentationsConfig {
    words_per_minute_min: number;
    words_per_minute_max: number;
    premium_config: {
        max_free_recording_time_seconds: number;
        max_free_participants_count: number;
        max_free_video_count: number;
        premium_price_cents: number;
    };
}

function formatRecordingTimeLimit(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} хв.`;
}

const BuySubscriptionModal: React.FC<BuySubscriptionModalProps> = ({
                                                                       open,
                                                                       onClose,
                                                                   }) => {
    const { loading: checkoutLoading, createCheckout } = useCreateSubscriptionCheckout();
    const [error, setError] = useState<string | null>(null);
    const [config, setConfig] = useState<PresentationsConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const { getToken } = useAuth();

    const fetchConfig = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            const data = await presentationsRepository.getConfig(token);
            setConfig(data);
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return;
            setError(DEFAULT_ERROR_MESSAGE);
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    useEffect(() => {
        const controller = new AbortController();
        fetchConfig();
        return () => controller.abort();
    }, [fetchConfig]);

    const freeFeatures = config ? [
        {
            text: `Обмеження тривалості відео до ${formatRecordingTimeLimit(config.premium_config.max_free_recording_time_seconds)}`,
            icon: closeIcon,
            iconAlt: "No",
            isPremium: false
        },
        {
            text: `Обмеження на ${config.premium_config.max_free_participants_count} учасника спільного виступу`,
            icon: closeIcon,
            iconAlt: "No",
            isPremium: false
        },
        {
            text: `Обмеження на запис ${config.premium_config.max_free_video_count} відео`,
            icon: closeIcon,
            iconAlt: "No",
            isPremium: false
        },
        {
            text: "Водяний знак",
            icon: closeIcon,
            iconAlt: "No",
            isPremium: false
        },
    ] : [];

    const premiumFeatures = [
        { text: "Монтаж записаних відео", icon: checkIcon, iconAlt: "Yes", isPremium: true },
        { text: "Жодних обмежень", icon: checkIcon, iconAlt: "Yes", isPremium: true },
        { text: "Без водяного знаку", icon: checkIcon, iconAlt: "Yes", isPremium: true },
    ];

    const handleBuy = async () => {
        setError(null);
        const url = await createCheckout();
        if (url) {
            window.location.href = url;
            onClose();
        } else {
            setError("Не вдалося отримати посилання. Спробуйте ще раз.");
        }
    };

    const formatPrice = (cents: number): string => {
        return `${cents / 100}$ / місяць`;
    };

    return (
        <BaseModal show={open} onClose={onClose} wide={true} closeOnBackdropClick>
            <div className="premium-purchase-modal-dialog">
                <button
                    className="premium-purchase-modal-close-btn"
                    onClick={onClose}
                    aria-label="Закрити"
                    type="button"
                >
                    <img src={crossIcon} alt="Close" draggable={false} />
                </button>
                <h2 className="premium-purchase-modal-title">
                    Отримайте ScriptGlance преміум
                </h2>
                <div className="premium-purchase-modal-desc">
                    Підпишіться, щоб розблокувати всі можливості
                </div>
                <div className="premium-purchase-modal-table">
                    <div className="premium-purchase-modal-col">
                        <div className="premium-purchase-modal-col-title free">
                            Безкоштовно
                        </div>
                        <ul className="premium-purchase-modal-features-list">
                            {(config ? freeFeatures : []).map((f, i) => (
                                <li className="premium-purchase-modal-feature free" key={i}>
                                    <img src={f.icon} className="feature-icon" alt={f.iconAlt} draggable={false} />
                                    {f.text}
                                </li>
                            ))}
                            {!config && loading && <li className="premium-purchase-modal-feature">Завантаження...</li>}
                        </ul>
                    </div>
                    <div className="premium-purchase-modal-col">
                        <div className="premium-purchase-modal-col-title premium">
                            Преміум-версія
                        </div>
                        <ul className="premium-purchase-modal-features-list">
                            {premiumFeatures.map((f, i) => (
                                <li className="premium-purchase-modal-feature premium" key={i}>
                                    <img src={f.icon} className="feature-icon" alt={f.iconAlt} draggable={false} />
                                    {f.text}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="premium-purchase-modal-price-block">
                    <div className="premium-purchase-modal-price">
                        {config
                            ? formatPrice(config.premium_config.premium_price_cents)
                            : "5$ / місяць"}
                    </div>
                    <button
                        className="premium-purchase-modal-buy-btn"
                        type="button"
                        onClick={handleBuy}
                        disabled={checkoutLoading || loading}
                    >
                        Купити преміум
                    </button>
                    {error && (
                        <div style={{ color: "#d33", marginTop: 10, fontSize: 15 }}>
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </BaseModal>
    );
};

export default BuySubscriptionModal;