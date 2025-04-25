import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/home/HomePage.tsx';
import NotFound from './pages/NotFound';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                {/* Маршрут для 404 */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Router>
    );
}

export default App;
