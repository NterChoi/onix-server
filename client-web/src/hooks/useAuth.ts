import { useState } from 'react';
import { getToken, removeToken } from '../utils/auth';
import toast from 'react-hot-toast';

export const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());
    const [showAuthModal, setShowAuthModal] = useState(false);

    const login = () => {
        setIsAuthenticated(true);
        setShowAuthModal(false);
    };

    const logout = () => {
        if (confirm('로그아웃 하시겠습니까?')) {
            removeToken();
            setIsAuthenticated(false);
            toast.success('로그아웃 되었습니다.');
        }
    };

    return {
        isAuthenticated,
        showAuthModal,
        setShowAuthModal,
        login,
        logout
    };
};
