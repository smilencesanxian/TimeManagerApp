import 'dotenv/config';
import { parseTaskByRule, parseTaskByAI, parseTask } from '../../src/services/aiService.js';

// ──── parseTaskByRule 单元测试 ────────────────────────────────────

describe('parseTaskByRule', () => {
  it('识别数学学科和时长', () => {
    const result = parseTaskByRule('做30分钟数学口算');
    expect(result.subject).toBe('数学');
    expect(result.duration).toBe(30);
    expect(result.priority).toBe(2);
  });

  it('识别语文学科', () => {
    const result = parseTaskByRule('朗读语文课文10分钟');
    expect(result.subject).toBe('语文');
    expect(result.duration).toBe(10);
  });

  it('识别英语学科', () => {
    const result = parseTaskByRule('英语单词背诵20分钟');
    expect(result.subject).toBe('英语');
    expect(result.duration).toBe(20);
  });

  it('识别运动学科', () => {
    const result = parseTaskByRule('跳绳运动15分钟');
    expect(result.subject).toBe('运动');
    expect(result.duration).toBe(15);
  });

  it('识别阅读学科', () => {
    const result = parseTaskByRule('课外阅读30分钟');
    expect(result.subject).toBe('阅读');
    expect(result.duration).toBe(30);
  });

  it('未知学科默认其他', () => {
    const result = parseTaskByRule('自由活动30分钟');
    expect(result.subject).toBe('其他');
  });

  it('将小时转换为分钟', () => {
    const result = parseTaskByRule('读书1小时');
    expect(result.duration).toBe(60);
  });

  it('2小时 = 120分钟', () => {
    const result = parseTaskByRule('数学复习2小时');
    expect(result.duration).toBe(120);
    expect(result.subject).toBe('数学');
  });

  it('未指定时长时默认30分钟', () => {
    const result = parseTaskByRule('数学作业');
    expect(result.duration).toBe(30);
  });

  it('标题超长时截断到20字', () => {
    const result = parseTaskByRule('这是一个非常非常长的任务标题超过了二十个字符需要截断处理');
    expect(result.title.length).toBeLessThanOrEqual(20);
  });

  it('title 去掉时间描述后仍有内容', () => {
    const result = parseTaskByRule('数学口算30分钟');
    expect(result.title).not.toBe('');
    expect(result.title).not.toMatch(/\d+分钟/);
  });

  it('duration 不超过480分钟上限', () => {
    const result = parseTaskByRule('学习10小时');
    expect(result.duration).toBe(480);
  });

  it('返回 priority 默认为 2', () => {
    const result = parseTaskByRule('随便做点什么');
    expect(result.priority).toBe(2);
  });
});

// ──── parseTaskByAI 单元测试（mock fetch） ────────────────────────

describe('parseTaskByAI', () => {
  const originalEnv = process.env['DASHSCOPE_API_KEY'];

  afterEach(() => {
    jest.restoreAllMocks();
    process.env['DASHSCOPE_API_KEY'] = originalEnv;
  });

  it('无 API Key 时抛出错误', async () => {
    delete process.env['DASHSCOPE_API_KEY'];
    await expect(parseTaskByAI('数学作业30分钟')).rejects.toThrow('DASHSCOPE_API_KEY not set');
  });

  it('成功解析 AI 返回的 JSON', async () => {
    process.env['DASHSCOPE_API_KEY'] = 'test-key';
    const mockContent = JSON.stringify({ subject: '数学', title: '数学口算', duration: 30, priority: 2 });
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: mockContent } }] }),
    } as Response);

    const result = await parseTaskByAI('做30分钟数学口算');
    expect(result.subject).toBe('数学');
    expect(result.title).toBe('数学口算');
    expect(result.duration).toBe(30);
    expect(result.priority).toBe(2);
  });

  it('AI 返回 markdown 代码块时正确解析', async () => {
    process.env['DASHSCOPE_API_KEY'] = 'test-key';
    const mockContent = '```json\n{"subject":"语文","title":"语文背诵","duration":15,"priority":1}\n```';
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: mockContent } }] }),
    } as Response);

    const result = await parseTaskByAI('背诵语文课文15分钟');
    expect(result.subject).toBe('语文');
    expect(result.duration).toBe(15);
    expect(result.priority).toBe(1);
  });

  it('AI 返回非法学科时降级为其他', async () => {
    process.env['DASHSCOPE_API_KEY'] = 'test-key';
    const mockContent = JSON.stringify({ subject: '未知科目', title: '任务', duration: 20, priority: 2 });
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: mockContent } }] }),
    } as Response);

    const result = await parseTaskByAI('某任务20分钟');
    expect(result.subject).toBe('其他');
  });

  it('AI 返回非法 duration 时使用默认 30', async () => {
    process.env['DASHSCOPE_API_KEY'] = 'test-key';
    const mockContent = JSON.stringify({ subject: '数学', title: '数学', duration: 999, priority: 2 });
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: mockContent } }] }),
    } as Response);

    const result = await parseTaskByAI('数学');
    expect(result.duration).toBe(30);
  });

  it('HTTP 请求失败时抛出错误', async () => {
    process.env['DASHSCOPE_API_KEY'] = 'test-key';
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as Response);

    await expect(parseTaskByAI('数学作业')).rejects.toThrow('DashScope error: 401');
  });

  it('网络异常时抛出错误', async () => {
    process.env['DASHSCOPE_API_KEY'] = 'test-key';
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network error'));

    await expect(parseTaskByAI('数学作业')).rejects.toThrow('network error');
  });
});

// ──── parseTask 降级逻辑测试 ──────────────────────────────────────

describe('parseTask (降级逻辑)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('AI 成功时返回 AI 结果', async () => {
    process.env['DASHSCOPE_API_KEY'] = 'test-key';
    const mockContent = JSON.stringify({ subject: '英语', title: '英语听力', duration: 25, priority: 2 });
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: mockContent } }] }),
    } as Response);

    const result = await parseTask('英语听力25分钟');
    expect(result.subject).toBe('英语');
    expect(result.duration).toBe(25);
  });

  it('AI 失败时降级为规则解析', async () => {
    process.env['DASHSCOPE_API_KEY'] = 'test-key';
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('timeout'));

    const result = await parseTask('数学口算30分钟');
    expect(result.subject).toBe('数学');
    expect(result.duration).toBe(30);
  });

  it('无 API Key 时直接使用规则解析', async () => {
    delete process.env['DASHSCOPE_API_KEY'];
    const result = await parseTask('英语背单词20分钟');
    expect(result.subject).toBe('英语');
    expect(result.duration).toBe(20);
  });
});
