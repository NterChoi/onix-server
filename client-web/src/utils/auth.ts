const TOKEN_KEY = 'onix_auth_token';

/**
 * 서버에서 받은 JWT 토큰을 브라우저의 LocalStorage에 저장합니다.
 */
export const saveToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * 저장된 JWT 토큰을 가져옵니다.
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * 저장된 토큰을 삭제합니다. (로그아웃 시 사용)
 */
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};
