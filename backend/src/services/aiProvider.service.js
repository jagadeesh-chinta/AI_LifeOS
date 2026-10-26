const axios = require('axios');
const AppError = require('../utils/AppError');

exports.callAI = async (prompt) => {
  const provider = process.env.AI_PROVIDER || 'openai';
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    throw new AppError('AI API key is missing', 500);
  }

  try {
    if (provider === 'openai') {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: process.env.AI_MODEL || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: "json_object" }
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return JSON.parse(response.data.choices[0].message.content);
    } else {
      // Add other providers (Gemini, Claude) here as needed
      throw new AppError(`Provider ${provider} not supported yet`, 500);
    }
  } catch (error) {
    console.error('AI Provider Error:', error?.response?.data || error.message);
    throw new AppError('Error communicating with AI service', 502);
  }
};
