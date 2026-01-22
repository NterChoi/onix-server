import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator
} from 'react-native';
import Toast from 'react-native-toast-message';

// API Base URL (iOS Simulator: localhost, Android: 10.0.2.2)
const API_BASE_URL = 'http://localhost:3000'; 

interface AuthScreenProps {
    onAuthenticated: (token: string) => void;
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAuth = async () => {
        if (!email || !password) {
            Toast.show({
                type: 'info',
                text1: '입력 확인',
                text2: '이메일과 비밀번호를 모두 입력해주세요.'
            });
            return;
        }

        // 간단한 이메일 형식 검사 (Client-side Validation)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Toast.show({
                type: 'error',
                text1: '형식 오류',
                text2: '유효한 이메일 주소를 입력해주세요.'
            });
            return;
        }

        setIsLoading(true);
        try {
            if (isLoginMode) {
                // 로그인 요청
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || '로그인에 실패했습니다.');
                }

                Toast.show({
                    type: 'success',
                    text1: '반갑습니다!',
                    text2: '성공적으로 로그인되었습니다.'
                });
                onAuthenticated(data.access_token);
            } else {
                // 회원가입 요청
                const response = await fetch(`${API_BASE_URL}/users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (!response.ok) {
                    const errorMessage = Array.isArray(data.message) 
                        ? data.message.join(', ') 
                        : data.message || '회원가입에 실패했습니다.';
                    throw new Error(errorMessage);
                }

                Toast.show({
                    type: 'success',
                    text1: '가입 성공',
                    text2: '계정이 생성되었습니다. 로그인을 진행해주세요. 🎉'
                });
                setIsLoginMode(true);
            }
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: '인증 실패',
                text2: error.message
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{isLoginMode ? 'Onix 로그인' : '새 계정 만들기'}</Text>
            
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="이메일"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                />
                <TextInput
                    style={styles.input}
                    placeholder="비밀번호"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
            </View>

            <TouchableOpacity 
                style={[styles.button, isLoading && styles.buttonDisabled]} 
                onPress={handleAuth}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>{isLoginMode ? '로그인' : '회원가입'}</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.switchButton} 
                onPress={() => setIsLoginMode(!isLoginMode)}
            >
                <Text style={styles.switchText}>
                    {isLoginMode ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
        color: '#333',
    },
    inputContainer: {
        gap: 15,
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 15,
        fontSize: 16,
        backgroundColor: '#fafafa',
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#a0cfff',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    switchButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    switchText: {
        color: '#007AFF',
        fontSize: 14,
    }
});
