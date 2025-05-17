import React, { useEffect } from 'react';
import './style.css';

interface BaseModalProps {
    show: boolean;
    onClose: () => void;
    children: React.ReactNode;
    closeOnBackdropClick?: boolean;
}

const BaseModal: React.FC<BaseModalProps> = ({
     show,
     onClose,
     children,
     closeOnBackdropClick = true
 }) => {
    useEffect(() => {
        if (show) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }

        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [show]);

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

    if (!show) {
        return null;
    }

    const handleBackdropClick = () => {
        if (closeOnBackdropClick) {
            onClose();
        }
    };

    return (
        <div className="base-modal-container">
            <div className="base-modal-backdrop" onClick={handleBackdropClick}></div>
            <div className="base-modal">
                <div className="base-modal-content">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default BaseModal;