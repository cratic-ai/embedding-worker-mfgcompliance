// config/azureOpenai.js
const OpenAI = require("openai");

const azureOpenAI = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
  defaultHeaders: {
    "api-key": process.env.AZURE_OPENAI_API_KEY,
  },
  defaultQuery: {
    "api-version": "2025-01-01-preview", // must match Azure preview version
  },
});

module.exports = azureOpenAI;