import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import "./SubscriptionStatusModal.css";
import BaseModal from "../base/BaseModal";
import crossIcon from "../../../assets/cross-icon.svg";
import visaLogo from "../../../assets/visa.svg";
import mastercardLogo from "../../../assets/mastercard.svg";
import {
    useSubscription,
    useCancelSubscription,
    useSubscriptionTransactions,
    useUpdateSubscriptionCard
} from "../../../hooks/useSubscriptionData";
import { SubscriptionStatus, InvoiceStatus } from "../../../api/repositories/subscriptionRepository";
import { RedButton } from "../../appButton/AppButton.tsx";
import DeleteConfirmationModal from "../deleteConfirmation/DeleteConfirmationModal.tsx";
import { usePaymentsSocket } from "../../../hooks/usePaymentsSocket";
import {PaymentEventType, PaymentsEvent} from "../../../api/socket/paymentsSocketManager.ts";

export interface SubscriptionStatusModalProps {
    open: boolean;
    onClose: () => void;
}

const CARD_LOGOS: Record<string, string> = {
    visa: visaLogo,
    mastercard: mastercardLogo,
};
const TRANSACTIONS_PER_PAGE = 20;

function formatCardNumber(masked: string) {
    return masked.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const dd = d.getDate().toString().padStart(2, "0");
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
}

function getStatusText(status: SubscriptionStatus) {
    switch (status) {
        case SubscriptionStatus.ACTIVE:
            return "Активна";
        case SubscriptionStatus.PAST_DUE:
            return "Прострочена";
        case SubscriptionStatus.CANCELLED:
            return "Скасована";
        case SubscriptionStatus.CREATED:
            return "Очікує оплату";
        default:
            return status;
    }
}

function getTransactionStatus(invoiceStatus: InvoiceStatus | null) {
    switch (invoiceStatus) {
        case InvoiceStatus.SUCCESS:
            return <span className="subscription-status-transaction-status-success">Успішно</span>;
        case InvoiceStatus.FAILURE:
            return <span className="subscription-status-transaction-status-failed">Недостатньо коштів</span>;
        case InvoiceStatus.PROCESSING:
            return <span className="subscription-status-transaction-status-processing">Очікування</span>;
        default:
            return null;
    }
}

const SubscriptionStatusModal: React.FC<SubscriptionStatusModalProps> = ({ open, onClose }) => {
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);

    const transactionsRef = useRef<HTMLDivElement>(null);

    const {
        subscription,
        loading: subscriptionLoading,
        refetch: refetchSubscription
    } = useSubscription();
    const {
        transactions,
        loading: transactionsLoading,
        fetchTransactions,
        clearTransactions,
    } = useSubscriptionTransactions();
    const { loading: cancelLoading, cancel } = useCancelSubscription();
    const { loading: updateCardLoading, updateCard } = useUpdateSubscriptionCard();

    const isCardLoading = useMemo(
        () => subscriptionLoading || !subscription?.payment_card?.masked_number,
        [subscriptionLoading, subscription]
    );

    const isTransactionsInitialLoading = transactionsLoading && transactions.length === 0;

    useEffect(() => {
        if (open) {
            setOffset(0);
            setHasMore(true);
            setIsLoadingMore(false);
            clearTransactions();
            fetchTransactions(0, TRANSACTIONS_PER_PAGE);
        }
    }, [open, fetchTransactions, clearTransactions]);

    useEffect(() => {
        if (open && offset > 0) {
            setIsLoadingMore(true);
            fetchTransactions(offset, TRANSACTIONS_PER_PAGE).then(() => setIsLoadingMore(false));
        }
    }, [offset, open, fetchTransactions]);

    useEffect(() => {
        if (transactions.length % TRANSACTIONS_PER_PAGE !== 0 || transactions.length === 0) {
            setHasMore(false);
        } else {
            setHasMore(true);
        }
    }, [transactions]);

    const handleScroll = useCallback(() => {
        const container = transactionsRef.current;
        if (!container || isLoadingMore || transactionsLoading || !hasMore) return;
        const { scrollTop, scrollHeight, clientHeight } = container;
        if (scrollHeight - scrollTop - clientHeight < 50) {
            setOffset(prev => prev + TRANSACTIONS_PER_PAGE);
        }
    }, [isLoadingMore, transactionsLoading, hasMore]);

    useEffect(() => {
        const container = transactionsRef.current;
        if (!container) return;
        container.addEventListener("scroll", handleScroll);
        return () => {
            container.removeEventListener("scroll", handleScroll);
        };
    }, [handleScroll, open]);

    const handleConfirmCancel = async () => {
        await cancel();
        setCancelModalOpen(false);
        onClose();
    };

    const handleCardUpdate = async () => {
        const url = await updateCard();
        if (url) window.open(url, "_blank", "noopener");
    };

    usePaymentsSocket(
        useCallback(
            (event: PaymentsEvent) => {
                if (event.event_type === PaymentEventType.CARD_LINKED) {
                    refetchSubscription();
                }
                if (event.event_type === PaymentEventType.TRANSACTION_UPDATED) {
                    fetchTransactions(0, TRANSACTIONS_PER_PAGE);
                }
            },
            [refetchSubscription, fetchTransactions]
        ),
    );

    const cardLogo = subscription?.payment_card?.payment_system?.toLowerCase();
    const cardMasked = subscription?.payment_card?.masked_number ?? "";
    const cardLogoSrc = cardLogo && CARD_LOGOS[cardLogo] ? CARD_LOGOS[cardLogo] : undefined;

    return (
        <>
            <BaseModal show={open} onClose={onClose} wide={true} closeOnBackdropClick>
                <div className="subscription-status-wrapper">
                    <button
                        className="subscription-status-close-btn"
                        onClick={onClose}
                        aria-label="Закрити"
                        type="button"
                    >
                        <img src={crossIcon} alt="Close" draggable={false} width="40" height="40" />
                    </button>
                    <h2 className="subscription-status-title">Преміум-підписка</h2>

                    {!subscription ? (
                        subscriptionLoading ? (
                            <div className="subscription-status-loading-indicator" style={{ minHeight: 200 }}>
                                <div className="subscription-status-loading-dots">
                                    <div></div>
                                    <div></div>
                                    <div></div>
                                </div>
                            </div>
                        ) : (
                            <div className="subscription-status-no-subscription">
                                Дані підписки не знайдено
                            </div>
                        )
                    ) : (
                        <>
                            <div className="subscription-status-info">
                                <div className="subscription-status-details">
                                    <p className="subscription-status-label">
                                        Стан: <strong>{getStatusText(subscription.status)}</strong>
                                    </p>
                                    <p className="subscription-status-label">
                                        Наступна оплата: <strong>{formatDate(subscription.next_payment_date)}</strong>
                                    </p>
                                </div>
                                {subscription.status === SubscriptionStatus.ACTIVE && (
                                    <RedButton
                                        label="Скасувати підписку"
                                        className="subscription-status-cancel-btn"
                                        type="button"
                                        onClick={() => setCancelModalOpen(true)}
                                        disabled={cancelLoading}
                                    />
                                )}
                            </div>

                            <h3 className="subscription-status-section-title">Платіжна картка</h3>
                            <div className="subscription-status-card">
                                {isCardLoading ? (
                                    <div className="subscription-status-card-loader">
                                        <div className="subscription-status-loading-dots">
                                            <div></div>
                                            <div></div>
                                            <div></div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {cardLogoSrc && (
                                            <img
                                                src={cardLogoSrc}
                                                alt={cardLogo}
                                                className="subscription-status-card-logo"
                                                draggable={false}
                                            />
                                        )}
                                        <span className="subscription-status-card-number">{formatCardNumber(cardMasked)}</span>
                                        <button
                                            className="subscription-status-card-update-btn"
                                            type="button"
                                            onClick={handleCardUpdate}
                                            disabled={updateCardLoading}
                                        >
                                            Змінити
                                        </button>
                                    </>
                                )}
                            </div>

                            <h3 className="subscription-status-section-title">Транзакції</h3>
                            <div
                                ref={transactionsRef}
                                className="subscription-status-transactions"
                            >
                                {isTransactionsInitialLoading ? (
                                    <div className="subscription-status-transactions-loader">
                                        <div className="subscription-status-loading-dots">
                                            <div></div>
                                            <div></div>
                                            <div></div>
                                        </div>
                                    </div>
                                ) : transactions.length > 0 ? (
                                    <>
                                        {transactions.map(tx => (
                                            <div className="subscription-status-transaction-row" key={tx.id}>
                                                <span
                                                    className="subscription-status-transaction-date">{formatDate(tx.date)}</span>
                                                <span className="subscription-status-transaction-amount">
                                                    {(tx.amount % 100 === 0)
                                                        ? (tx.amount / 100).toFixed(0) + '$'
                                                        : (tx.amount / 100).toFixed(2) + '$'
                                                    }
                                                </span>
                                                {getTransactionStatus(tx.status)}
                                            </div>
                                        ))}
                                        {(isLoadingMore || (transactionsLoading && offset > 0)) && hasMore && (
                                            <div className="subscription-status-loading-indicator">
                                                <div className="subscription-status-loading-dots">
                                                    <div></div>
                                                    <div></div>
                                                    <div></div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="subscription-status-no-transactions">
                                        Транзакцій не знайдено
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </BaseModal>
            <DeleteConfirmationModal
                open={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                onConfirm={handleConfirmCancel}
                confirmationTitle="Ви впевнені, що хочете скасувати підписку?"
            />
        </>
    );
};

export default SubscriptionStatusModal;
