import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import App from './App.tsx'
import {HeadProvider} from 'react-head';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <HeadProvider>
            <App/>
        </HeadProvider>
    </StrictMode>,
)
