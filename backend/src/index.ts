import 'dotenv/config';
import { createServer } from 'http';
import { createApp } from './app.js';
import { initWebSocket } from './websocket/manager.js';
import logger from './utils/logger.js';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

const app = createApp();
const httpServer = createServer(app);

initWebSocket(httpServer);

httpServer.listen(PORT, () => {
  logger.info(`🚀 服务已启动，端口: ${PORT}`);
  logger.info(`📡 环境: ${process.env['NODE_ENV'] ?? 'development'}`);
  logger.info(`🔌 WebSocket 路径: /ws`);
});
