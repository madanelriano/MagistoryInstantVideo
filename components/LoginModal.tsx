
import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface LoginModalProps {
    isOpen: boolean;
    onClose?: () => void;
    message?: string;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, message }) => {
    const { login } = useAuth();
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] animate-fade-in">
            <div className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 text-center max-w-md w-full relative">
                
                {/* Close Button (Optional fallback) */}
                {onClose && (
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-500 hover:text-white"
                    >
                        ✕
                    </button>
                )}

                <h2 className="text-2xl font-bold text-white mb-2">Welcome to Magistory</h2>
                <p className="text-gray-400 mb-6">{message || "Please sign in to continue creating magic."}</p>
                
                {errorMsg && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-200 text-xs text-left">
                        <strong>Login Error:</strong> {errorMsg}
                        <br/>
                        <span className="opacity-70 mt-1 block">Ensure Backend URL is correct in Vercel Settings.</span>
                    </div>
                )}

                <div className="flex justify-center mb-6">
                    {isProcessing ? (
                        <div className="flex flex-col items-center">
                            <LoadingSpinner />
                            <span className="text-xs text-gray-400 mt-2">Verifying with Server...</span>
                        </div>
                    ) : (
                        <GoogleLogin
                            onSuccess={async (credentialResponse) => {
                                if (credentialResponse.credential) {
                                    setIsProcessing(true);
                                    setErrorMsg(null);
                                    try {
                                        await login(credentialResponse.credential);
                                        // Login success is handled by App.tsx useEffect
                                    } catch (error: any) {
                                        console.error("Login Error:", error);
                                        setIsProcessing(false);
                                        // Try to extract useful error message
                                        const msg = error.response?.data?.error || error.message || "Connection to backend failed";
                                        setErrorMsg(msg);
                                    }
                                }
                            }}
                            onError={() => {
                                setErrorMsg("Google Pop-up Failed or Closed.");
                            }}
                            theme="filled_black"
                            size="large"
                            shape="pill"
                        />
                    )}
                </div>
                
                <p className="text-xs text-gray-500">
                    By signing in, you receive <b>10 FREE Credits</b> to start generating videos!
                </p>
                
                {/* Fallback link if stuck */}
                <div className="mt-6 pt-4 border-t border-gray-700">
                    <button onClick={onClose} className="text-xs text-gray-600 hover:text-gray-400 underline">
                        Continue as Guest (Limited)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;
