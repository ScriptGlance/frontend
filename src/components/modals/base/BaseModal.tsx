import React, {useEffect, useState, useRef} from 'react';
import './BaseModal.css';

interface BaseModalProps {
    show: boolean;
    onClose: () => void;
    children: React.ReactNode;
    closeOnBackdropClick?: boolean;
}

const ANIMATION_DURATION_MS = 320;

const BaseModal: React.FC<BaseModalProps> = ({
     show,
     onClose,
     children,
     closeOnBackdropClick = true
 }) => {
    const [visible, setVisible] = useState(show);
    const [isClosing, setIsClosing] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (show) {
            setVisible(true);
            setIsClosing(false);
            document.body.classList.add('modal-open');
        } else if (visible) {
            setIsClosing(true);
            timeoutRef.current = window.setTimeout(() => {
                setVisible(false);
                setIsClosing(false);
                document.body.classList.remove('modal-open');
            }, ANIMATION_DURATION_MS);
        }
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            document.body.classList.remove('modal-open');
        };
    }, [show, visible]);

    useEffect(() => {
        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && show) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscapeKey);
        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [show, onClose]);

    if (!visible) return null;

    const handleBackdropClick = () => {
        if (closeOnBackdropClick) {
            onClose();
        }
    };

    return (
        <div className="base-modal-container">
            <div
                className={`base-modal-backdrop ${isClosing ? 'closing' : 'opening'}`}
                onClick={handleBackdropClick}
            ></div>
            <div className="base-modal">
                <div className={`base-modal-content ${isClosing ? 'closing' : 'opening'}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default BaseModal;
