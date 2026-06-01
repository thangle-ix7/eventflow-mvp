import apiClient from './apiClient';

const aiApi = {
  chat: async ({ message, draft, context, messages }) => {
    if (!message?.trim()) {
      throw new Error('Tin nhắn không được để trống');
    }

    const response = await apiClient.post('/ai/chat', {
      message,
      draft,
      context,
      messages,
    });
    return response.data;
  },
};

export default aiApi;
