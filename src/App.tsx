import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import {LoginPage} from './pages/login/LoginPage';
import {RegisterPage} from './pages/register/RegisterPage';
import {LoginSuccess} from './pages/auth/LoginSuccess';
import {FacebookEmailError} from './pages/auth/FacebookEmailError';
import {HomePage} from "./pages/home/HomePage.tsx";
import NotFound from "./pages/notFound/NotFound.tsx";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<HomePage/>}/>
                <Route path="/login" element={<LoginPage/>}/>
                <Route path="/register" element={<RegisterPage/>}/>

                <Route path="/auth/login-success" element={<LoginSuccess/>}/>
                <Route path="/auth/no-facebook-linked-emails-error" element={<FacebookEmailError/>}/>

                <Route path="*" element={<NotFound/>}/>
            </Routes>
        </Router>
    );
}

export default App;
