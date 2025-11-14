const axios = require('axios');

(async () => {
  try {
    const response = await axios.post(
      `${process.env.RENDER_WORKER_URL || 'http://localhost:10000'}/poll-pending`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${process.env.WORKER_SECRET}`
        }
      }
    );
    console.log('Poll result:', response.data);
  } catch (error) {
    console.error('Poll error:', error.message);
  }
})();