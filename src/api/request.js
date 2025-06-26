import axios from 'axios';

// Dify API 配置
const DIFY_API_URL = 'https://agent-x.maas.com.cn/v1/chat-messages';
const DIFY_API_KEY = 'app-3qSFKoWAVzyqiuqoCnD4kE6i';

const request = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || '/api',
  timeout: 10000,
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 在这里可以添加token等认证信息
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Dify API 请求方法
export const sendMessageToDify = async (content, userId = `user_${Date.now()}`, conversationId = '') => {
  try {
    const requestData = {
      inputs: {},
      query: content,
      response_mode: "blocking",
      conversation_id: conversationId,
      user: userId,
      files: []
    };

    const response = await axios.post(
      DIFY_API_URL,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DIFY_API_KEY}`
        }
      }
    );

    console.log('AI 返回的聊天文本:', response.data.answer);
    return response.data;
  } catch (error) {
    console.error('发送消息到 Dify 失败:', error);
    throw error;
  }
};

export default request; 