import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import type { CompetitionRole, CompetitionWithRole } from './types';

/**
 * 拉取比赛详情（含当前用户在此比赛内的角色）。
 * 各比赛作用域页面据此做角色门禁（软控制，服务端已硬鉴权）。
 */
export function useCompetition(id: string | undefined) {
  const [competition, setCompetition] = useState<CompetitionWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setCompetition(await api<CompetitionWithRole>(`/competitions/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载比赛失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const myRole: CompetitionRole | null = competition?.myRole ?? null;
  return { competition, myRole, loading, error, reload };
}
