import { ErrorCode } from "../types/errorCode";

export const errorMessages: Record<string, string> = {
    InvalidCredentials: 'Неправильний email або пароль',
    EmailDuplicate: 'Цей email вже використовується',
    InvalidResetPasswordToken: 'Посилання для скидання пароля недійсне або термін його дії закінчився',
    InvalidEmailVerificationCode: 'Недійсний код підтвердження email',
    EmailNotVerified: 'Email не підтверджено',
    EmailAlreadyVerified: 'Email вже підтверджено',
    EmailVerificationCodeNotExpired: 'Код підтвердження email ще не закінчився',
    PasswordResetTokenNotExpired: 'Токен для скидання пароля ще не закінчився'
};

export const getErrorMessage = (error: any): string => {
    let code = error?.error_code;
    if (typeof code === 'number' && ErrorCode[code]) code = ErrorCode[code];
    if (typeof code === 'string' && errorMessages[code]) return errorMessages[code];
    return error?.message || 'Сталася помилка. Будь ласка, спробуйте ще раз.';
};