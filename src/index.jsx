import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css';
import App from './app/App';
import reportWebVitals from './shared/utils/reportWebVitals';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals())
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();