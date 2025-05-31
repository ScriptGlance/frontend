import React, { KeyboardEvent } from "react";
import googleIcon from "../../assets/google-icon.png";
import facebookIcon from "../../assets/facebook-icon.png";
import { getSocialAuthUrl } from "../../utils/authUtils";
import { Role } from "../../types/role";
import "./SocialAuthButtons.css";

interface SocialAuthButtonsProps {
  role: Role;
  className?: string;
}

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({ role, className = "" }) => {
  const handleSocialLogin = (provider: "google" | "facebook") => {
    window.location.href = getSocialAuthUrl(provider, role);
  };

  return (
    <>
      <div className="divider-container">
        <div className="divider-line" />
        <div className="divider-text">Або</div>
        <div className="divider-line" />
      </div>

      <div className={`social-buttons ${className}`}>
        <div
          className="social-button"
          onClick={() => handleSocialLogin("google")}
          role="button"
          tabIndex={0}
          onKeyPress={(e: KeyboardEvent) =>
            e.key === "Enter" && handleSocialLogin("google")
          }
        >
          <img src={googleIcon} alt="Google" className="social-icon" />
        </div>
        <div
          className="social-button"
          onClick={() => handleSocialLogin("facebook")}
          role="button"
          tabIndex={0}
          onKeyPress={(e: KeyboardEvent) =>
            e.key === "Enter" && handleSocialLogin("facebook")
          }
        >
          <img src={facebookIcon} alt="Facebook" className="social-icon" />
        </div>
      </div>
    </>
  );
};
