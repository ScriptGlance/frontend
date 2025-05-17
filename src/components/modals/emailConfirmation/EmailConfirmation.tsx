import React, { useState, useRef, useEffect } from 'react';
import './style.css';
import BaseModal from "../base/BaseModal.tsx";
import {EMAIL_CONFIRMATION_TIME_SECONDS} from "../../../contstants.ts";

interface EmailConfirmationModalProps {
    show: boolean;
    onClose: () => void;
    email: string;
    onVerify: (code: string) => Promise<boolean>;
    onResendEmail: () => Promise<void>;
    onChangeEmail: () => void;
    codeLength?: number;
    initialSecondsLeft: number;
}

const EmailConfirmationModal: React.FC<EmailConfirmationModalProps> = ({
                                                                           show,
                                                                           onClose,
                                                                           email,
                                                                           onVerify,
                                                                           onResendEmail,
                                                                           onChangeEmail,
                                                                           codeLength = 6,
                                                                           initialSecondsLeft,
                                                                       }) => {
    const [code, setCode] = useState<string[]>(Array(codeLength).fill(''));
    const [isCodeIncorrect, setIsCodeIncorrect] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(initialSecondsLeft);
    const [isResendDisabled, setIsResendDisabled] = useState(initialSecondsLeft > 0);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);


    useEffect(() => {
        inputRefs.current = Array(codeLength).fill(null);
    }, [codeLength]);


    useEffect(() => {
        setTimeRemaining(initialSecondsLeft);
        setIsResendDisabled(initialSecondsLeft > 0);
    }, [initialSecondsLeft]);


    useEffect(() => {
        if (!show || timeRemaining <= 0) return;

        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    setIsResendDisabled(false);
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [show, timeRemaining]);

    const formatTimeRemaining = () => {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleInputChange = (index: number, value: string) => {
        if (value.length > 1) {
            value = value[value.length - 1];
        }

        if (!/^\d*$/.test(value)) {
            return;
        }


        if (isCodeIncorrect) {
            setIsCodeIncorrect(false);
        }

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);


        if (value !== '' && index < codeLength - 1 && inputRefs.current[index + 1]) {
            inputRefs.current[index + 1]?.focus();
        }


        if (newCode.every(digit => digit !== '') && !newCode.includes('')) {
            verifyCode(newCode.join(''));
        }
    };


    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && code[index] === '' && index > 0) {

            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < codeLength - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };


    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').trim();


        if (/^\d+$/.test(pastedData) && pastedData.length <= codeLength) {
            const newCode = Array(codeLength).fill('');

            for (let i = 0; i < pastedData.length; i++) {
                newCode[i] = pastedData[i];
            }

            setCode(newCode);


            const focusIndex = Math.min(pastedData.length, codeLength - 1);
            inputRefs.current[focusIndex]?.focus();


            if (pastedData.length === codeLength) {
                verifyCode(pastedData);
            }
        }
    };


    const verifyCode = async (fullCode: string) => {
        if (isVerifying) return;

        setIsVerifying(true);
        try {
            const isValid = await onVerify(fullCode);

            if (!isValid) {
                setIsCodeIncorrect(true);
            } else {
                onClose();
            }
        } catch (error) {
            setIsCodeIncorrect(true);
            console.error('Verification error:', error);
        } finally {
            setIsVerifying(false);
        }
    };


    const handleResendEmail = async () => {
        if (isResendDisabled || isSending) return;

        setIsSending(true);
        try {
            await onResendEmail();

            setTimeRemaining(EMAIL_CONFIRMATION_TIME_SECONDS);
            setIsResendDisabled(true);

            setCode(Array(codeLength).fill(''));
            setIsCodeIncorrect(false);
        } catch (error) {
            console.error('Error resending email:', error);
        } finally {
            setIsSending(false);
        }
    };


    useEffect(() => {
        if (show) {
            setCode(Array(codeLength).fill(''));
            setIsCodeIncorrect(false);
        }
    }, [show, codeLength]);

    return (
        <BaseModal show={show} onClose={onClose} closeOnBackdropClick={false}>
            <div className="email-confirmation-modal">
                <h2 className="confirmation-title">Підтвердження email</h2>

                <p className="confirmation-instruction">
                    Введіть код підтвердження,<br/>
                    надісланий на <span className="email-highlight">{email}</span>
                </p>

                <div className="code-input-container">
                    {Array.from({ length: codeLength }).map((_, index) => (
                        <input
                            key={index}
                            ref={el => inputRefs.current[index] = el}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={code[index]}
                            onChange={e => handleInputChange(index, e.target.value)}
                            onKeyDown={e => handleKeyDown(index, e)}
                            onPaste={index === 0 ? handlePaste : undefined}
                            className={`code-input ${isCodeIncorrect ? 'code-input-error' : ''}`}
                            disabled={isVerifying}
                            autoFocus={index === 0 && show}
                        />
                    ))}
                </div>

                <div className="resend-container">
                    {isResendDisabled ? (
                        <p className="resend-timer">
                            Надіслати повторно через {formatTimeRemaining()}
                        </p>
                    ) : (
                        <button
                            className="resend-button"
                            onClick={handleResendEmail}
                            disabled={isSending}
                        >
                            Надіслати повторно
                        </button>
                    )}
                </div>

                <button
                    className="change-email-button"
                    onClick={onChangeEmail}
                    disabled={isVerifying || isSending}
                >
                    Змінити пошту
                </button>
            </div>
        </BaseModal>
    );
};

export default EmailConfirmationModal;