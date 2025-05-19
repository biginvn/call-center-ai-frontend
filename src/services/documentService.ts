import axiosInstance from "./axiosInstance";

export const uploadDocument = async (file: File): Promise<{ success: boolean; message: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axiosInstance.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return {
      success: true,
      message: 'Document uploaded successfully'
    };
  } catch (error) {
    console.error('Document upload failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to upload document'
    };
  }
};
