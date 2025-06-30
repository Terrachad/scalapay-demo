import { apiClient } from "@/lib/api-client";

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

export const authService = {
  async login(data: LoginData): Promise<AuthResponse> {
    console.log("🔐 Attempting login with:", { email: data.email });
    try {
      const response = await apiClient.post<AuthResponse>("/auth/login", data);
      console.log("✅ Login response status:", response.status);
      console.log("✅ Login response data:", response.data);
      
      // Handle wrapped response format from TransformInterceptor
      const authData = response.data.data || response.data;
      console.log("✅ Auth data:", authData);
      console.log("✅ Has accessToken:", !!authData?.accessToken);
      console.log("✅ Has user:", !!authData?.user);
      
      return authData;
    } catch (error) {
      console.error("❌ Auth service error:", error);
      console.error("❌ Error response:", error.response?.data);
      console.error("❌ Error status:", error.response?.status);
      throw error;
    }
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/register", data);
    // Handle wrapped response format from TransformInterceptor
    return response.data.data || response.data;
  },

  async getProfile() {
    const response = await apiClient.get("/users/profile");
    return response.data;
  },
};
