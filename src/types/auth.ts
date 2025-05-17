import {BaseResponse} from "./base.ts";
import {Role} from "./role.ts";

export interface LoginRequest {
    email: string;
    password: string;
    role: Role;
}

export interface LoginResponse extends BaseResponse<{token: string}> {}