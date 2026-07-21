module.exports = {
  PORT: process.env.PORT || 3000,
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  EXTERNAL_LOGGER: 'https://shtl.pw/proxy/logger.php',
  ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  MAX_BODY_SIZE: '10mb',
  TIMEOUT: 30000
};
