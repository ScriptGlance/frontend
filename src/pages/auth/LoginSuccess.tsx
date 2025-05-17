import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const LoginSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { saveToken } = useAuth();

  useEffect(() => {
    const handleLoginSuccess = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');

      if (token) {
        saveToken(token);

        navigate('/dashboard');
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
