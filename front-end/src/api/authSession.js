export const saveAuthSession = (authData) => {
  if (!authData) {
    return null;
  }

  const { token, refreshToken, ...user } = authData;

  if (token) {
    localStorage.setItem('token', token);
  }

  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }

  localStorage.setItem('user', JSON.stringify(user));
  return user;
};

export const clearAuthSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

export const getRefreshToken = () => localStorage.getItem('refreshToken');
