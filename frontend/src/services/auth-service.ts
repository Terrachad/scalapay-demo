import { apiClient } from '@/lib/api-client';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData extends LoginData {
  name: string;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    creditLimit: number;
    availableCredit: number;
  };
}

export interface UpdateUserProfileDto {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  paymentReminders: boolean;
  transactionUpdates: boolean;
  promotional: boolean;
}

export interface SecurityPreferences {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  loginNotifications: boolean;
  deviceVerification: boolean;
}

export interface UserProfileResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  creditLimit?: number;
  isActive?: boolean;
  notificationPreferences?: NotificationPreferences;
  securityPreferences?: SecurityPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export const authService = {
  async login(data: LoginData): Promise<AuthResponse> {
    console.log('🔐 Attempting login with:', { email: data.email });
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', data);
      console.log('✅ Login response status:', response.status);
      console.log('✅ Login response data:', response.data);

      // Handle wrapped response format from TransformInterceptor
      const authData = response.data.data || response.data;
      console.log('✅ Auth data:', authData);
      console.log('✅ Has accessToken:', !!authData?.accessToken);
      console.log('✅ Has user:', !!authData?.user);

      return authData;
    } catch (error) {
      console.error('❌ Auth service error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      throw error;
    }
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    // Handle wrapped response format from TransformInterceptor
    return response.data.data || response.data;
  },

  async getProfile() {
    const response = await apiClient.get('/users/profile');
    return response.data;
  },

  // Extended Profile Management - NO MORE MOCKING
  async getExtendedProfile(): Promise<UserProfileResponse> {
    const response = await apiClient.get('/users/profile/extended');
    // Handle wrapped response format from TransformInterceptor
    return response.data.data || response.data;
  },

  async updateProfile(updateData: UpdateUserProfileDto): Promise<UserProfileResponse> {
    const response = await apiClient.put('/users/profile/update', updateData);
    // Handle wrapped response format from TransformInterceptor
    return response.data.data || response.data;
  },

  async getNotificationPreferences(): Promise<NotificationPreferences> {
    const response = await apiClient.get('/users/notification-preferences');
    return response.data.data || response.data;
  },

  async updateNotificationPreferences(
    preferences: NotificationPreferences,
  ): Promise<NotificationPreferences> {
    const response = await apiClient.put('/users/notification-preferences', { preferences });
    return response.data.data || response.data;
  },

  async getSecurityPreferences(): Promise<SecurityPreferences> {
    const response = await apiClient.get('/users/security-preferences');
    return response.data.data || response.data;
  },

  async updateSecurityPreferences(preferences: SecurityPreferences): Promise<SecurityPreferences> {
    const response = await apiClient.put('/users/security-preferences', { preferences });
    return response.data.data || response.data;
  },
};
