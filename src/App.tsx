import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import {LoginPage} from './pages/login/LoginPage';
import {RegisterPage} from './pages/register/RegisterPage';
import {LoginSuccess} from './pages/auth/LoginSuccess';
import {FacebookEmailError} from './pages/auth/FacebookEmailError';
import {HomePage} from "./pages/home/HomePage.tsx";
import NotFound from "./pages/notFound/NotFound.tsx";
import ResetEmailSentPage from "./pages/forgotPassword/ResetEmailSentPage.tsx";
import ForgotPasswordPage from "./pages/forgotPassword/ForgotPasswordPage.tsx";
import ResetPasswordPage from "./pages/forgotPassword/ResetPasswordPage.tsx";
import {Role} from "./types/role.ts";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<HomePage/>}/>

                <Route path="/login" element={<LoginPage role={Role.User}/>}/>
                <Route path="/moderator/login" element={<LoginPage role={Role.Moderator}/>}/>
                <Route path="/admin/login" element={<LoginPage role={Role.Admin}/>}/>

                <Route path="/register" element={<RegisterPage/>}/>

                <Route path="/forgot-password" element={<ForgotPasswordPage role={Role.User} />} />
                <Route path="/moderator/forgot-password" element={<ForgotPasswordPage role={Role.Moderator} />} />
                <Route path="/admin/forgot-password" element={<ForgotPasswordPage role={Role.Admin} />} />
                <Route path="/forgot-password/sent" element={<ResetEmailSentPage/>}/>
                <Route path="/reset-password" element={<ResetPasswordPage/>}/>

                <Route path="/auth/login-success" element={<LoginSuccess/>}/>
                <Route path="/auth/no-facebook-linked-emails-error" element={<FacebookEmailError/>}/>

                <Route path="*" element={<NotFound/>}/>
            </Routes>
        </Router>
    );
}

export default App;
