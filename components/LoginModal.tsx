
import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { MagicWandIcon } from './icons';

interface LoginModalProps {
    isOpen: boolean;
    onClose?: () => void;
    message?: string;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, message }) => {
    const { login, loginAsGuest } = useAuth();
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Cek keberadaan Client ID untuk menghindari crash
    const googleClientId = process.env.GOOGLE_CLIENT_ID;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] animate-fade-in">
            <div className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 text-center max-w-md w-full relative">
                
                {/* Close Button */}
                {onClose && (
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-500 hover:text-white text-xl"
                    >
                        ✕
                    </button>
                )}

                <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                         <MagicWandIcon className="w-8 h-8 text-white" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">Welcome to Magistory</h2>
                <p className="text-gray-400 mb-6">{message || "Sign in to start creating AI videos."}</p>
                
                {errorMsg && (
                    <div className="mb-6 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-200 text-xs text-left">
                        <strong>Login Error:</strong> {errorMsg}
                    </div>
                )}

                <div className="flex flex-col gap-4">
                    {/* Primary: Google Login */}
                    <div className="flex justify-center min-h-[40px]">
                        {isProcessing ? (
                            <div className="flex items-center gap-2 text-gray-400">
                                <LoadingSpinner />
                                <span className="text-xs">Signing in...</span>
                            </div>
                        ) : (
                            googleClientId ? (
                                <GoogleLogin
                                    onSuccess={async (credentialResponse) => {
                                        if (credentialResponse.credential) {
                                            setIsProcessing(true);
                                            setErrorMsg(null);
                                            try {
                                                await login(credentialResponse.credential);
                                            } catch (error: any) {
                                                console.error("Login Error:", error);
                                                setIsProcessing(false);
                                                const msg = error.response?.data?.error || error.message || "Connection failed";
                                                setErrorMsg(msg);
                                            }
                                        }
                                    }}
                                    onError={() => {
                                        setErrorMsg("Google Login Popup Closed or Failed.");
                                    }}
                                    theme="filled_black"
                                    size="large"
                                    shape="pill"
                                    text="signin_with"
                                />
                            ) : (
                                <div className="text-xs text-yellow-500 border border-yellow-600/50 p-2 rounded bg-yellow-900/10">
                                    Google Login Unavailable (Missing Client ID)
                                </div>
                            )
                        )}
                    </div>

                    <div className="flex items-center gap-2 opacity-50">
                        <div className="h-px bg-gray-600 flex-1"></div>
                        <span className="text-xs text-gray-400">OR</span>
                        <div className="h-px bg-gray-600 flex-1"></div>
                    </div>

                    {/* Secondary: Guest / Offline Mode */}
                    <button 
                        onClick={() => {
                            loginAsGuest();
                            if(onClose) onClose();
                        }}
                        className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-full transition-colors flex items-center justify-center gap-2 border border-gray-600"
                    >
                        Enter Offline Mode
                    </button>
                    <p className="text-[10px] text-gray-500">
                        *Offline mode stores data locally and uses free credits.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;
