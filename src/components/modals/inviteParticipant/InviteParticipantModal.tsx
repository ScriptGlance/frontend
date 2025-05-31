import React, { useRef, useState } from "react";
import "./InviteParticipantModal.css";
import BaseModal from "../base/BaseModal";
import copyIcon from "../../../assets/copy-icon.svg";
import crossIcon from "../../../assets/cross-icon.svg";
import {GreenButton} from "../../appButton/AppButton.tsx";

export interface InviteParticipantModalProps {
    open: boolean;
    onClose: () => void;
    inviteLink: string;
}

const InviteParticipantModal: React.FC<InviteParticipantModalProps> = ({
                                                                           open,
                                                                           onClose,
                                                                           inviteLink
                                                                       }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            if (inputRef.current) {
                inputRef.current.select();
            }
        }
    };

    return (
        <BaseModal show={open} onClose={onClose} closeOnBackdropClick>
            <div className="invite-modal-dialog">
                <button
                    className="invite-modal-close-btn"
                    onClick={onClose}
                    aria-label="Закрити"
                    type="button"
                >
                    <img src={crossIcon} alt="Close" draggable={false} />
                </button>
                <h2 className="invite-modal-title">Запросити учасника</h2>
                <div className="invite-modal-desc">
                    Поділіться посиланням, щоб дозволити іншим приєднатися до вашого виступу
                </div>
                <div className="invite-modal-link-block">
                    <input
                        className="invite-modal-link-input"
                        type="text"
                        value={inviteLink}
                        readOnly
                        ref={inputRef}
                        onFocus={e => e.target.select()}
                        aria-label="Посилання для запрошення"
                    />
                    <GreenButton
                        className="invite-modal-copy-btn"
                        type="button"
                        onClick={handleCopy}
                        aria-label="Скопіювати посилання"
                        label={""}
                    >
                        <img
                            src={copyIcon}
                            alt="Copy"
                            className="invite-modal-copy-icon"
                            draggable={false}
                        />
                    </GreenButton>
                </div>
                {copied && (
                    <div className="invite-modal-copied-text">
                        Скопійовано!
                    </div>
                )}
            </div>
        </BaseModal>
    );
};

export default InviteParticipantModal;
