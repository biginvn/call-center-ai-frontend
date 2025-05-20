import axiosInstance from "./axiosInstance";

export const getActiveUserByExtension = async (extension_number: string): Promise<string> => {
  const response = await axiosInstance.get(`/user/active/${extension_number}`);
  return response.data;
};
