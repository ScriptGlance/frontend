import { useNavigate } from 'react-router-dom';
import {BeigeButton, GreenButton} from '../../components/appButton/AppButton';
import {getSocialAuthUrl} from "../../utils/authUtils.ts";
import {Role} from "../../types/role.ts";

export const FacebookEmailError = () => {
  const navigate = useNavigate();

  return (
    <div className="error-page" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '20px'
    }}>

      <div style={{ 
        maxWidth: '500px',
        backgroundColor: '#fff',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <h2>Потрібен доступ до електронної пошти</h2>
        <p style={{ marginBottom: '20px' }}>
          На жаль, нам не вдалося отримати вашу електронну адресу з облікового запису Facebook. Для використання нашого сервісу потрібна електронна пошта.
        </p>
        <p style={{ marginBottom: '30px' }}>
          Будь ласка, спробуйте ще раз і переконайтеся, що надали доступ до електронної пошти, або зареєструйтеся іншим способом.
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <BeigeButton
            label="Спробувати ще раз"
            onClick={() => {
              window.location.href = getSocialAuthUrl('facebook', Role.User);
            }}
          />
          <GreenButton
            label="Обрати інший спосіб"
            onClick={() => navigate('/register')}
          />
        </div>
      </div>
    </div>
  );
};
