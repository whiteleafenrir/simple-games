require('dotenv/config');
module.exports = {
  '/api': {
    target: `http://127.0.0.1:${process.env.API_PORT || 3000}`,
    secure: false,
    changeOrigin: true
  }
};
