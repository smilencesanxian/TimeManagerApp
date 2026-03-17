import { renderHook, act } from '@testing-library/react';
import { usePomodoroTimer } from '../usePomodoroTimer';

// 使用 Jest fake timers 控制时间
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

const FOCUS_SECONDS = 25 * 60; // 1500
const BREAK_SECONDS = 5 * 60;  // 300

describe('usePomodoroTimer — 初始状态', () => {
  it('初始状态为 idle', () => {
    const { result } = renderHook(() => usePomodoroTimer());
    expect(result.current.phase).toBe('idle');
    expect(result.current.remaining).toBe(FOCUS_SECONDS);
    expect(result.current.pomodoroCount).toBe(0);
    expect(result.current.elapsedFocusSec).toBe(0);
  });
});

describe('usePomodoroTimer — 专注期', () => {
  it('start() 后状态变为 focusing，倒计时开始', () => {
    const { result } = renderHook(() => usePomodoroTimer());

    act(() => { result.current.start(); });
    expect(result.current.phase).toBe('focusing');
    expect(result.current.remaining).toBe(FOCUS_SECONDS);

    act(() => { jest.advanceTimersByTime(5000); });
    expect(result.current.remaining).toBe(FOCUS_SECONDS - 5);
  });

  it('pause() 暂停后倒计时停止', () => {
    const { result } = renderHook(() => usePomodoroTimer());

    act(() => { result.current.start(); });
    act(() => { jest.advanceTimersByTime(10000); });
    const remainingBeforePause = result.current.remaining;

    act(() => { result.current.pause(); });
    expect(result.current.phase).toBe('paused');

    act(() => { jest.advanceTimersByTime(10000); });
    // 暂停后时间不再减少
    expect(result.current.remaining).toBe(remainingBeforePause);
  });

  it('resume() 恢复倒计时', () => {
    const { result } = renderHook(() => usePomodoroTimer());

    act(() => { result.current.start(); });
    act(() => { jest.advanceTimersByTime(5000); });
    act(() => { result.current.pause(); });
    act(() => { result.current.resume(); });

    expect(result.current.phase).toBe('focusing');

    act(() => { jest.advanceTimersByTime(5000); });
    expect(result.current.remaining).toBe(FOCUS_SECONDS - 10);
  });

  it('专注期倒计时到 0 → 自动进入 onBreak，pomodoroCount+1', () => {
    const { result } = renderHook(() => usePomodoroTimer());

    act(() => { result.current.start(); });
    act(() => { jest.advanceTimersByTime(FOCUS_SECONDS * 1000); });

    expect(result.current.phase).toBe('onBreak');
    expect(result.current.pomodoroCount).toBe(1);
    expect(result.current.remaining).toBe(BREAK_SECONDS);
  });

  it('elapsedFocusSec 只累计实际专注时间（排除暂停）', () => {
    const { result } = renderHook(() => usePomodoroTimer());

    act(() => { result.current.start(); });
    act(() => { jest.advanceTimersByTime(10000); }); // 10s 专注
    act(() => { result.current.pause(); });
    act(() => { jest.advanceTimersByTime(5000); });  // 5s 暂停（不计入）
    act(() => { result.current.resume(); });
    act(() => { jest.advanceTimersByTime(5000); });  // 5s 专注

    expect(result.current.elapsedFocusSec).toBe(15);
  });
});

describe('usePomodoroTimer — 休息期', () => {
  it('休息倒计时到 0 → 状态变为 breakDone', () => {
    const { result } = renderHook(() => usePomodoroTimer());

    act(() => { result.current.start(); });
    act(() => { jest.advanceTimersByTime(FOCUS_SECONDS * 1000); }); // 完成专注
    expect(result.current.phase).toBe('onBreak');

    act(() => { jest.advanceTimersByTime(BREAK_SECONDS * 1000); }); // 完成休息
    expect(result.current.phase).toBe('breakDone');
  });

  it('startNextPomodoro() 从 breakDone 启动新番茄钟', () => {
    const { result } = renderHook(() => usePomodoroTimer());

    act(() => { result.current.start(); });
    act(() => { jest.advanceTimersByTime(FOCUS_SECONDS * 1000); });
    act(() => { jest.advanceTimersByTime(BREAK_SECONDS * 1000); });
    expect(result.current.phase).toBe('breakDone');

    act(() => { result.current.startNextPomodoro(); });
    expect(result.current.phase).toBe('focusing');
    expect(result.current.remaining).toBe(FOCUS_SECONDS);
    expect(result.current.pomodoroCount).toBe(1); // 上一个番茄钟保留
  });
});

describe('usePomodoroTimer — 完成任务', () => {
  it('finish() 在专注中完成 → 状态变为 completed', () => {
    const { result } = renderHook(() => usePomodoroTimer());

    act(() => { result.current.start(); });
    act(() => { jest.advanceTimersByTime(10000); });
    act(() => { result.current.finish(); });

    expect(result.current.phase).toBe('completed');
  });

  it('finish() 在暂停中完成 → 状态变为 completed', () => {
    const { result } = renderHook(() => usePomodoroTimer());

    act(() => { result.current.start(); });
    act(() => { jest.advanceTimersByTime(5000); });
    act(() => { result.current.pause(); });
    act(() => { result.current.finish(); });

    expect(result.current.phase).toBe('completed');
  });

  it('完成时 elapsedFocusSec 正确', () => {
    const { result } = renderHook(() => usePomodoroTimer());

    act(() => { result.current.start(); });
    act(() => { jest.advanceTimersByTime(20000); }); // 20s
    act(() => { result.current.pause(); });
    act(() => { jest.advanceTimersByTime(10000); }); // 暂停 10s
    act(() => { result.current.finish(); });

    expect(result.current.elapsedFocusSec).toBe(20);
  });

  it('reset() 重置所有状态', () => {
    const { result } = renderHook(() => usePomodoroTimer());

    act(() => { result.current.start(); });
    act(() => { jest.advanceTimersByTime(60000); });
    act(() => { result.current.reset(); });

    expect(result.current.phase).toBe('idle');
    expect(result.current.remaining).toBe(FOCUS_SECONDS);
    expect(result.current.pomodoroCount).toBe(0);
    expect(result.current.elapsedFocusSec).toBe(0);
  });
});
