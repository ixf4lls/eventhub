import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/address';
import { useRouter } from 'expo-router';

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const refreshToken = async (): Promise<string> => {
  const refreshToken = await AsyncStorage.getItem('refreshToken');
  if (!refreshToken) {
    console.error('Refresh token не найден');
    throw new Error('No refresh token available');
  }

  try {
    const response = await fetch(
      API_BASE_URL + '/api/refresh',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    );

    if (!response.ok) {
      console.error('Ошибка обновления токена:', response.status);
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    await AsyncStorage.setItem('accessToken', data.access_token);
    return data.access_token;
  } catch (error) {
    console.error('Ошибка при обновлении токена:', error);
    throw error;
  }
};

export const fetchWithToken = async (url: string, options: RequestInit = {}): Promise<Response> => {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      console.error('Токен не найден');
      throw new Error('No token available');
    }
    
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401 && !isRefreshing) {
      isRefreshing = true;
      
      try {
        const newToken = await refreshToken();
        const newHeaders = {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`,
          'Content-Type': 'application/json',
        };
        
        const newResponse = await fetch(url, { ...options, headers: newHeaders });
        processQueue(null, newToken);
        return newResponse;
      } catch (error) {
        console.error('Ошибка при обновлении токена:', error);
        processQueue(error, null);
        // Очищаем токены и перенаправляем на страницу входа
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        const router = useRouter();
        router.replace('/(auth)/login');
        throw error;
      } finally {
        isRefreshing = false;
      }
    }
    
    return response;
  } catch (error) {
    console.error('Ошибка в fetchWithToken:', error);
    throw error;
  }
};
