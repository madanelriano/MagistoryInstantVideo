
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';

// Use environment variable for Client ID
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";

const rootElement = (window as any).document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

if (!GOOGLE_CLIENT_ID) {
    console.warn("GOOGLE_CLIENT_ID is missing in environment variables. Google Login will fail.");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AuthProvider>
            <App />
        </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
