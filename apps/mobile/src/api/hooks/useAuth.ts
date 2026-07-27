import { apiRequest } from '../client';
import { API_BASE_URL } from '../../config/env';
import { useAuthStore } from '../../store/auth.store';

export async function requestOtp(phone: string) {
  return apiRequest<{ message: string; expires_in: number }>('/auth/request-otp', {
    method: 'POST',
    body: { phone },
    skipAuth: true,
  });
}

export async function verifyOtp(phone: string, otp: string) {
  return apiRequest<
    | { isNewUser: true; onboardingToken: string; phone: string }
    | { isNewUser: false; session: { accessToken: string; refreshToken: string; expiresIn: number }; userId: string; workshopId: string }
  >('/auth/verify-otp', { method: 'POST', body: { phone, otp }, skipAuth: true });
}

export async function registerWorkshop(
  onboardingToken: string,
  input: { shop_name: string; owner_name: string; city: string; address?: string; gst_number?: string; invoice_prefix: string },
) {
  const response = await fetch(`${API_BASE_URL}/api/v1/workshop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${onboardingToken}` },
    body: JSON.stringify(input),
  });
  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json?.error?.message ?? 'Registration failed');
  }
  return json.data as { workshop: { id: string; referralCode: string }; session: { accessToken: string; refreshToken: string; expiresIn: number } };
}

export async function logout() {
  const { refreshToken, clearSession } = useAuthStore.getState();
  if (refreshToken) {
    await apiRequest('/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => {});
  }
  await clearSession();
}
