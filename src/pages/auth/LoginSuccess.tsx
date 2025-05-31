import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { jwtDecode } from 'jwt-decode';
import { Role } from '../../types/role';

type JWTPayload = { role?: string };

export const LoginSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { saveToken } = useAuth();

  useEffect(() => {
    const handleLoginSuccess = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');

      if (token) {
        let role: string;
        try {
          const payload = jwtDecode<JWTPayload>(token);
          if (payload.role === Role.Admin) {
            role = Role.Admin;
          } else if (payload.role === Role.Moderator) {
            role = Role.Moderator;
          } else {
            role = Role.User;
          }
        } catch {
          role = "user";
        }

        saveToken(token, role);

        switch (role) {
          case Role.Admin:
            navigate('/admin/dashboard');
            break;
          case Role.Moderator:
            navigate('/moderator/dashboard');
            break;
          default:
            navigate('/dashboard');
        }
      } else {
        navigate('/login');
      }
    };

    handleLoginSuccess().then();
  }, [location, navigate, saveToken]);

  return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Завантаження…</p>
      </div>
  );
};
