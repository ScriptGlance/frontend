import React, { useRef, useState } from "react";
import "./ShareVideoModal.css";
import BaseModal from "../base/BaseModal";
import copyIcon from "../../../assets/copy-icon.svg";
import crossIcon from "../../../assets/cross-icon.svg";
import facebookIcon from "../../../assets/facebook-icon.svg";
import twitterIcon from "../../../assets/twitter-icon.svg";
import {GreenButton} from "../../appButton/AppButton.tsx";

export interface ShareVideoModalProps {
    open: boolean;
    onClose: () => void;
    videoLink: string;
}

const ShareVideoModal: React.FC<ShareVideoModalProps> = ({
                                                             open,
                                                             onClose,
                                                             videoLink
                                                         }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(videoLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            if (inputRef.current) {
                inputRef.current.select();
            }
        }
    };

    const handleFacebookShare = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(videoLink)}`, '_blank', 'noopener,noreferrer');
    };

    const handleTwitterShare = () => {
        window.open(`https://x.com/intent/tweet?url=${encodeURIComponent(videoLink)}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <BaseModal show={open} onClose={onClose} closeOnBackdropClick>
            <div className="share-video-modal-dialog">
                <button
                    className="share-video-modal-close-btn"
                    onClick={onClose}
                    aria-label="Закрити"
                    type="button"
                >
                    <img src={crossIcon} alt="Close" draggable={false} />
                </button>
                <h2 className="share-video-modal-title">Поділитися відео</h2>
                <div className="share-video-modal-desc">
                    Використовуйте посилання нижче, щоб поділитися відео
                </div>
                <div className="share-video-modal-link-block">
                    <input
                        className="share-video-modal-link-input"
                        type="text"
                        value={videoLink}
                        readOnly
                        ref={inputRef}
                        onFocus={e => e.target.select()}
                        aria-label="Посилання для поширення відео"
                    />
                    <GreenButton
                        className="share-video-modal-copy-btn"
                        type="button"
                        onClick={handleCopy}
                        aria-label="Скопіювати посилання"
                        label=""
                    >
                        <img
                            src={copyIcon}
                            alt="Copy"
                            className="share-video-modal-copy-icon"
                            draggable={false}
                        />
                    </GreenButton>
                </div>
                {copied && (
                    <div className="share-video-modal-copied-text">
                        Скопійовано!
                    </div>
                )}
                <div className="share-video-modal-social">
                    <button
                        className="share-video-modal-social-btn facebook"
                        onClick={handleFacebookShare}
                        aria-label="Поширити в Facebook"
                    >
                        <img src={facebookIcon} alt="Facebook" />
                    </button>
                    <button
                        className="share-video-modal-social-btn twitter"
                        onClick={handleTwitterShare}
                        aria-label="Поширити в Twitter"
                    >
                        <img src={twitterIcon} alt="Twitter" />
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};

export default ShareVideoModal;