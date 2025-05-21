import axiosInstance from "./axiosInstance";

interface ActiveUser {
  _id: string;
  username: string;
  fullname: string;
  email: string;
  password: string;
  role: string;
  extension_number: string;
  last_login: string | null;
}

export const getActiveUserByExtension = async (extension_number: string): Promise<string> => {
  const response = await axiosInstance.get(`/user/active/${extension_number}`);
  return response.data.fullname;
};

export const getAllActiveUsers = async (): Promise<ActiveUser[]> => {
  const response = await axiosInstance.get('/user/active');
  return response.data.active_users;
};
