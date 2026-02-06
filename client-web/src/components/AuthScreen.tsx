import React, { useState } from 'react';
import axios from 'axios';
import { saveToken } from '../utils/auth';

const API_BASE_URL = 'http://localhost:3000';

interface AuthScreenProps {
  onAuthenticated: (token: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // 로그인 요청
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
          email,
          password,
        });
        const { access_token } = response.data;
        saveToken(access_token);
        onAuthenticated(access_token);
      } else {
        // 회원가입 요청
        await axios.post(`${API_BASE_URL}/users`, {
          email,
          password,
        });
        alert('회원가입 성공! 이제 로그인해주세요.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '인증 과정에서 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>{isLogin ? 'Onix Login' : 'Create Account'}</h1>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="example@onix.com"
              required
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>
        <button
          onClick={() => setIsLogin(!isLogin)}
          style={styles.switchButton}
        >
          {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    fontFamily: 'sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    padding: '2.5rem',
    borderRadius: '12px',
    backgroundColor: '#2d2d2d',
    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
  },
  title: {
    textAlign: 'center',
    marginBottom: '2rem',
    fontSize: '28px',
    fontWeight: 'bold',
    letterSpacing: '-0.5px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '14px',
    color: '#aaaaaa',
    fontWeight: '500',
  },
  input: {
    padding: '0.8rem',
    borderRadius: '6px',
    border: '1px solid #444',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    fontSize: '16px',
    outline: 'none',
  },
  button: {
    padding: '1rem',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#007aff',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem',
    transition: 'background-color 0.2s',
  },
  switchButton: {
    marginTop: '1.5rem',
    background: 'none',
    border: 'none',
    color: '#007aff',
    cursor: 'pointer',
    fontSize: '14px',
    width: '100%',
    textAlign: 'center',
    textDecoration: 'underline',
  },
  error: {
    color: '#ff4d4d',
    fontSize: '14px',
    margin: 0,
    textAlign: 'center',
  },
};
