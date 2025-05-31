import { Role } from "../types/role";

export const getSocialAuthUrl = (provider: "google" | "facebook", role: Role): string => {
  const apiBaseUrl = import.meta.env.VITE_APP_API_BASE_URL;
  return `${apiBaseUrl}/auth/${provider}?role=${role.toLowerCase()}`;
};
