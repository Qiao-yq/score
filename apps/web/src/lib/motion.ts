import { useCallback, useState } from 'react';

export type MotionLevel = 'off' | 'reduced' | 'full';

const KEY = 'task.motionLevel';

function readStored(): MotionLevel {
  const saved = localStorage.getItem(KEY);
  if (saved === 'off' || saved === 'reduced' || saved === 'full') return saved;
  return 'full';
}

/**
 * 动效分级（M1-06 §4）：full=完整霓虹动效，reduced=降级（尊重系统减少动态偏好），
 * off=关闭（低功耗/大屏投影优先稳定）。持久化到 localStorage。
 */
export function useMotionLevel() {
  const [level, setLevel] = useState<MotionLevel>(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return 'reduced';
    }
    return readStored();
  });

  const set = useCallback((next: MotionLevel) => {
    localStorage.setItem(KEY, next);
    setLevel(next);
  }, []);

  return { level, set };
}
