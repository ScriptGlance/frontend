import React from 'react';
import './ErrorModal.css';
import errorIcon from '../../../assets/error-icon.svg';
import { BeigeButton } from "../../appButton/AppButton.tsx";
import BaseModal from "../base/BaseModal.tsx";

interface ErrorModalProps {
    show: boolean;
    onClose: () => void;
    title?: string;
    message: string;
    buttonText?: string;
}

const ErrorModal: React.FC<ErrorModalProps> = ({
   show,
   onClose,
   title = 'Помилка',
   message,
   buttonText = 'Ок'
}) => {
    return (
        <BaseModal show={show} onClose={onClose}>
            <div className="modal-body-content">
                <div className="d-flex align-items-center">
                    <img
                        className="modal-icon error-icon"
                        src={errorIcon}
                        alt="Error"
                    />
                    <h3 className="modal-title ms-2 mb-0">{title}</h3>
                </div>

                <p className="modal-message mt-3">{message}</p>
                <BeigeButton style={{width: '33%'}} label={buttonText} onClick={onClose} />
            </div>
        </BaseModal>
    );
};

export default ErrorModal;