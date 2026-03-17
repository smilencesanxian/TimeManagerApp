/**
 * WebSocket manager 单元测试
 */
import { jest } from '@jest/globals';

jest.mock('../../src/repositories/userRepository.js', () => ({
  findParentsByChildId: jest.fn(),
  findChildrenByParentId: jest.fn(),
}));

jest.mock('../../src/utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../src/utils/jwt.js', () => ({
  verifyToken: jest.fn(),
}));

import { emitTaskCreated, emitTaskStatusChanged, emitTaskDeleted, getIO } from '../../src/websocket/manager.js';

describe('WebSocket manager - io not initialized', () => {
  it('getIO returns null before initialization', () => {
    expect(getIO()).toBeNull();
  });

  it('emitTaskCreated should resolve without error when io is null', async () => {
    await expect(
      emitTaskCreated({ taskId: 't1', childId: 'c1', title: '作业', subject: '数学', date: '2024-01-01' })
    ).resolves.toBeUndefined();
  });

  it('emitTaskStatusChanged should resolve without error when io is null', async () => {
    await expect(
      emitTaskStatusChanged({ taskId: 't1', status: 'done', childId: 'c1', title: '作业', updatedById: 'u1' })
    ).resolves.toBeUndefined();
  });

  it('emitTaskDeleted should resolve without error when io is null', async () => {
    await expect(
      emitTaskDeleted({ taskId: 't1', childId: 'c1' })
    ).resolves.toBeUndefined();
  });
});
