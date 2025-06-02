import {ErrorCode} from "./errorCode.ts";

export interface BaseResponse<T> {
    data?: T;
    error: boolean;
    description?: string;
    error_code?: ErrorCode;
}