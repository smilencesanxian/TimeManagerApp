import logger from '../utils/logger.js';

export interface ParsedTask {
  subject: string;
  title: string;
  duration: number;
  priority: number;
}

const DASHSCOPE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

const VALID_SUBJECTS = ['数学', '语文', '英语', '运动', '阅读', '其他'] as const;

const SUBJECT_RULES: Array<{ keywords: string[]; subject: string }> = [
  { keywords: ['数学', '口算', '算术', '计算', '几何', '代数'], subject: '数学' },
  { keywords: ['英语', 'english', '单词', '听力', '口语', 'abc'], subject: '英语' },
  { keywords: ['语文', '朗读', '背诵', '作文', '汉字', '古诗', '字词'], subject: '语文' },
  { keywords: ['运动', '体育', '跑步', '跳绳', '篮球', '游泳'], subject: '运动' },
  { keywords: ['阅读', '读书', '课外书'], subject: '阅读' },
];

export function parseTaskByRule(description: string): ParsedTask {
  const lower = description.toLowerCase();

  // 识别学科
  let subject = '其他';
  for (const { keywords, subject: s } of SUBJECT_RULES) {
    if (keywords.some((k) => lower.includes(k))) {
      subject = s;
      break;
    }
  }

  // 提取时长：小时优先
  let duration = 30;
  const hourMatch = description.match(/(\d+)\s*小时/);
  const minuteMatch = description.match(/(\d+)\s*分钟/);
  if (hourMatch) {
    duration = Math.min(480, parseInt(hourMatch[1], 10) * 60);
  } else if (minuteMatch) {
    duration = Math.min(480, Math.max(1, parseInt(minuteMatch[1], 10)));
  }

  // 提取标题：去掉时间表达式后取前20字
  let title = description
    .replace(/\d+\s*小时/g, '')
    .replace(/\d+\s*分钟/g, '')
    .trim();
  if (!title) title = description;
  if (title.length > 20) title = title.slice(0, 20);

  return { subject, title, duration, priority: 2 };
}

interface DashScopeResponse {
  choices: Array<{
    message: { content: string };
  }>;
}

export async function parseTaskByAI(description: string): Promise<ParsedTask> {
  const apiKey = process.env['DASHSCOPE_API_KEY'];
  if (!apiKey) throw new Error('DASHSCOPE_API_KEY not set');

  const prompt =
    `你是一个任务解析助手。从以下任务描述中提取结构化信息，只返回JSON，不要有任何其他内容：` +
    `{"subject":"学科（数学/语文/英语/运动/阅读/其他之一）","title":"简短任务标题（最多15字）",` +
    `"duration":预估时长分钟数整数1到480,"priority":优先级1高2中3低默认2}` +
    `任务描述：${description}`;

  const response = await fetch(DASHSCOPE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`DashScope error: ${response.status}`);
  }

  const data = (await response.json()) as DashScopeResponse;
  const content = data.choices[0]?.message?.content ?? '';

  // 去掉可能的 markdown 代码块
  const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleaned) as Partial<ParsedTask>;

  return {
    subject: VALID_SUBJECTS.includes(parsed.subject as (typeof VALID_SUBJECTS)[number])
      ? parsed.subject!
      : '其他',
    title:
      typeof parsed.title === 'string' && parsed.title
        ? parsed.title.slice(0, 20)
        : description.slice(0, 20),
    duration:
      Number.isInteger(parsed.duration) &&
      (parsed.duration as number) >= 1 &&
      (parsed.duration as number) <= 480
        ? (parsed.duration as number)
        : 30,
    priority: [1, 2, 3].includes(parsed.priority ?? 0) ? (parsed.priority as number) : 2,
  };
}

export async function parseTask(description: string): Promise<ParsedTask> {
  try {
    return await parseTaskByAI(description);
  } catch (err) {
    logger.warn(`AI解析失败，降级规则解析: ${(err as Error).message}`);
    return parseTaskByRule(description);
  }
}

const DEFAULT_COMMENT_SUGGESTIONS = [
  '今天表现得非常好，继续保持！',
  '很棒的进步，爸爸妈妈为你骄傲！',
  '你的努力我们都看到了，加油！',
  '太厉害了，比昨天又进步了！',
  '认真学习的你最可爱！',
];

export async function suggestComments(childName: string, taskInfo?: string): Promise<string[]> {
  const apiKey = process.env['DASHSCOPE_API_KEY'];
  if (!apiKey) return DEFAULT_COMMENT_SUGGESTIONS;

  try {
    const prompt =
      `你是一个温暖的父母助理。孩子"${childName}"刚完成了学习任务${taskInfo ? `（${taskInfo}）` : ''}。` +
      `请生成5条简短温暖的鼓励评语，每条不超过20字，只返回JSON数组，格式：["评语1","评语2","评语3","评语4","评语5"]`;

    const response = await fetch(DASHSCOPE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error(`DashScope error: ${response.status}`);
    const data = (await response.json()) as DashScopeResponse;
    const content = data.choices[0]?.message?.content ?? '';
    const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const suggestions = JSON.parse(cleaned) as string[];
    if (Array.isArray(suggestions) && suggestions.length >= 3) return suggestions.slice(0, 5);
    return DEFAULT_COMMENT_SUGGESTIONS;
  } catch (err) {
    logger.warn(`AI评语推荐失败，使用默认推荐: ${(err as Error).message}`);
    return DEFAULT_COMMENT_SUGGESTIONS;
  }
}

export { DEFAULT_COMMENT_SUGGESTIONS };
