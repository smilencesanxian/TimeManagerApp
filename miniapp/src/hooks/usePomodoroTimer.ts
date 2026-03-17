import { useReducer, useEffect, useRef } from 'react';

export type PomodoroPhase =
  | 'idle'
  | 'focusing'
  | 'paused'
  | 'onBreak'
  | 'breakDone'
  | 'completed';

export interface PomodoroState {
  phase: PomodoroPhase;
  remaining: number;       // 当前阶段剩余秒数
  pomodoroCount: number;   // 已完成的专注番茄钟数
  elapsedFocusSec: number; // 有效专注秒数（排除暂停和休息）
}

type Action =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'TICK' }
  | { type: 'FINISH' }
  | { type: 'RESET' }
  | { type: 'START_NEXT_POMODORO' };

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

const initialState: PomodoroState = {
  phase: 'idle',
  remaining: FOCUS_SECONDS,
  pomodoroCount: 0,
  elapsedFocusSec: 0,
};

function reducer(state: PomodoroState, action: Action): PomodoroState {
  switch (action.type) {
    case 'START':
      if (state.phase !== 'idle') return state;
      return { ...state, phase: 'focusing' };

    case 'PAUSE':
      if (state.phase !== 'focusing') return state;
      return { ...state, phase: 'paused' };

    case 'RESUME':
      if (state.phase !== 'paused') return state;
      return { ...state, phase: 'focusing' };

    case 'TICK': {
      if (state.phase === 'focusing') {
        const newRemaining = state.remaining - 1;
        const newElapsed = state.elapsedFocusSec + 1;
        if (newRemaining <= 0) {
          // 专注期结束 → 进入休息
          return {
            ...state,
            phase: 'onBreak',
            remaining: BREAK_SECONDS,
            pomodoroCount: state.pomodoroCount + 1,
            elapsedFocusSec: newElapsed,
          };
        }
        return { ...state, remaining: newRemaining, elapsedFocusSec: newElapsed };
      }
      if (state.phase === 'onBreak') {
        const newRemaining = state.remaining - 1;
        if (newRemaining <= 0) {
          return { ...state, phase: 'breakDone', remaining: 0 };
        }
        return { ...state, remaining: newRemaining };
      }
      return state;
    }

    case 'START_NEXT_POMODORO':
      if (state.phase !== 'breakDone') return state;
      return { ...state, phase: 'focusing', remaining: FOCUS_SECONDS };

    case 'FINISH':
      if (state.phase === 'idle' || state.phase === 'completed') return state;
      return { ...state, phase: 'completed' };

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

export interface PomodoroTimerResult extends PomodoroState {
  start: () => void;
  pause: () => void;
  resume: () => void;
  finish: () => void;
  reset: () => void;
  startNextPomodoro: () => void;
}

export function usePomodoroTimer(): PomodoroTimerResult {
  const [state, dispatch] = useReducer(reducer, initialState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 当 phase 变为 focusing 或 onBreak 时启动 tick，其他情况停止
  useEffect(() => {
    if (state.phase === 'focusing' || state.phase === 'onBreak') {
      intervalRef.current = setInterval(() => {
        dispatch({ type: 'TICK' });
      }, 1000);
    } else {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.phase]);

  return {
    ...state,
    start: () => dispatch({ type: 'START' }),
    pause: () => dispatch({ type: 'PAUSE' }),
    resume: () => dispatch({ type: 'RESUME' }),
    finish: () => dispatch({ type: 'FINISH' }),
    reset: () => dispatch({ type: 'RESET' }),
    startNextPomodoro: () => dispatch({ type: 'START_NEXT_POMODORO' }),
  };
}
