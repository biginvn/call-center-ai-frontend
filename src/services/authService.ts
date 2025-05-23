import axiosInstance from "./axiosInstance";

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

interface UserInfo {
  username: string;
  extension_number: string;
  role: string;
  fullName: string; // changed from fullname to fullName
}

export const loginAgent = async ({
  username,
  password,
  extension_number
}: { username: string, password: string, extension_number: string }): Promise<AuthResponse> => {
  const response = await axiosInstance.post('/login/agent', { username, password, extension_number });
  return {
    access_token: response.data.access_token,
    refresh_token: response.data.refresh_token,
    token_type: response.data.token_type
  };
};

export const loginAdmin = async ({
  username,
  password
}: { username: string, password: string }): Promise<AuthResponse> => {
  const response = await axiosInstance.post('/login/admin', { username, password });
  return {
    access_token: response.data.access_token,
    refresh_token: response.data.refresh_token,
    token_type: response.data.token_type
  };
};

export const logoutUser = async (access_token: string): Promise<void> => {
  await axiosInstance.patch('/logout/', {}, {
    headers: {
      Authorization: `Bearer ${access_token}`
    }
  });
};

export const refreshToken = async (refresh_token: string): Promise<AuthResponse> => {
  const response = await axiosInstance.post(`/login/refresh?refresh_token=${refresh_token}`);
  return {
    access_token: response.data.access_token,
    refresh_token: response.data.refresh_token,
    token_type: response.data.token_type
  };
};

export const getUserInfo = async (access_token: string): Promise<UserInfo> => {
  const response = await axiosInstance.get('/user/', {
    headers: {
      Authorization: `Bearer ${access_token}`
    }
  });
  return {
    username: response.data.username,
    extension_number: response.data.extension_number,
    role: response.data.role,
    fullName: response.data.fullName || response.data.fullname // support both cases
  };
};

export const connectUser = async ({
  username,
  extension
}: {
  username: string;
  extension: string;
}): Promise<void> => {
  await axiosInstance.post('/user/connect', {
    username,
    extension
  });
};

export const disconnectUser = async ({
  username,
  extension
}: {
  username: string;
  extension: string;
}): Promise<void> => {
  await axiosInstance.post('/user/disconnect', {
    username,
    extension
  });
};

