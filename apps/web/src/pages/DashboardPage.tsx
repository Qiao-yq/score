import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type {
  ProgressResponse,
  RadarResponse,
  RankingItem,
  SankeyResponse,
  TickerItem,
  WordCloudItem,
} from '@task/contracts';
import { GlitchText } from '../components/effects/GlitchText';
import { CRTOverlay } from '../components/effects/CRTOverlay';
import { CodeRain } from '../components/effects/CodeRain';
import { ProgressPanel } from '../components/dashboard/ProgressPanel';
import { RadarChart } from '../components/dashboard/RadarChart';
import { RankingList } from '../components/dashboard/RankingList';
import { RankingPodium } from '../components/dashboard/RankingPodium';
import { SankeyDiagram } from '../components/dashboard/SankeyDiagram';
import { Ticker } from '../components/dashboard/Ticker';
import { WordCloud } from '../components/dashboard/WordCloud';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useMotionLevel, type MotionLevel } from '../lib/motion';
import { useRealtime } from '../lib/ws';

interface Competition {
  id: string;
  name: string;
  status: string;
  dashboardPublished: boolean;
}

const DESIGN_W = 1600;
const DESIGN_H = 900;
const MOTION_LABEL: Record<MotionLevel, string> = {
  full: '动效:全',
  reduced: '动效:降',
  off: '动效:关',
};

function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = () => setMatch(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return match;
}

function useAutoScale(w: number, h: number): number {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const compute = () => setScale(Math.min(window.innerWidth / w, window.innerHeight / h));
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [w, h]);
  return scale;
}

function Panel({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-cyan/30 bg-deep/60 p-3 backdrop-blur ${className ?? ''}`}>
      {title && (
        <h3 className="mb-2 font-display text-xs uppercase tracking-[0.2em] text-cyan">{title}</h3>
      )}
      {children}
    </section>
  );
}

export default function DashboardPage() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();
  const { level, set } = useMotionLevel();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const scale = useAutoScale(DESIGN_W, DESIGN_H);
  const isAdmin = user?.globalRole === 'admin';

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [competitionId, setCompetitionId] = useState<string | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [radar, setRadar] = useState<RadarResponse>({ dimensions: [], teamCount: 0 });
  const [progress, setProgress] = useState<ProgressResponse>({
    totalTeams: 0,
    scoredTeams: 0,
    approvedTeams: 0,
  });
  const [wordcloud, setWordcloud] = useState<WordCloudItem[]>([]);
  const [ticker, setTicker] = useState<TickerItem[]>([]);
  const [sankey, setSankey] = useState<SankeyResponse>({ nodes: [], links: [] });
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!competitionId) return;
    try {
      const [r, rad, prog, wc, tk, sk] = await Promise.all([
        api<RankingItem[]>(`/competitions/${competitionId}/dashboard/ranking`),
        api<RadarResponse>(`/competitions/${competitionId}/dashboard/radar`),
        api<ProgressResponse>(`/competitions/${competitionId}/dashboard/progress`),
        api<WordCloudItem[]>(`/competitions/${competitionId}/dashboard/wordcloud`),
        api<TickerItem[]>(`/competitions/${competitionId}/dashboard/ticker`),
        isAdmin
          ? api<SankeyResponse>(`/competitions/${competitionId}/dashboard/sankey`)
          : Promise.resolve({ nodes: [], links: [] }),
      ]);
      setRanking(r);
      setRadar(rad);
      setProgress(prog);
      setWordcloud(wc);
      setTicker(tk);
      setSankey(sk);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '数据加载失败');
    }
  }, [competitionId, isAdmin]);

  // 加载比赛列表，默认选第一个
  useEffect(() => {
    api<Competition[]>('/competitions')
      .then((list) => {
        setCompetitions(list);
        if (list.length > 0) setCompetitionId((cur) => cur ?? list[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : '加载比赛列表失败'));
  }, []);

  // 轮询兜底 + 实时 WS 触发刷新
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const wsStatus = useRealtime(
    competitionId,
    useCallback(() => refreshRef.current(), []),
  );

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  };

  const cycleMotion = () => {
    const next: MotionLevel = level === 'full' ? 'reduced' : level === 'reduced' ? 'off' : 'full';
    set(next);
  };

  const header = (
    <header className="flex flex-wrap items-center gap-3 border-b border-cyan/30 px-4 py-3">
      <GlitchText
        text="TASK // 考核大屏"
        className="font-display text-xl tracking-widest text-hi"
      />
      <select
        value={competitionId ?? ''}
        onChange={(e) => setCompetitionId(e.target.value)}
        className="border border-cyan/30 bg-void px-2 py-1 font-mono text-sm text-hi outline-none"
      >
        {competitions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.dashboardPublished ? '' : '（未发布）'}
          </option>
        ))}
      </select>
      <div className="ml-auto flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${wsStatus === 'connected' ? 'bg-success' : 'bg-danger'}`}
        />
        <span className="font-mono text-xs text-dim">
          {wsStatus === 'connected' ? '实时已连接' : wsStatus === 'connecting' ? '连接中…' : '离线'}
        </span>
        <Link
          to="/competitions"
          className="border border-cyan/30 px-2 py-1 font-mono text-xs text-hi hover:border-cyan"
        >
          返回比赛
        </Link>
        <button
          type="button"
          onClick={cycleMotion}
          className="border border-cyan/30 px-2 py-1 font-mono text-xs text-hi hover:border-cyan"
        >
          {MOTION_LABEL[level]}
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="border border-cyan/30 px-2 py-1 font-mono text-xs text-hi hover:border-cyan"
        >
          全屏
        </button>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="border border-pink/40 px-2 py-1 font-mono text-xs text-pink hover:border-pink"
        >
          退出
        </button>
      </div>
    </header>
  );

  const content = (
    <>
      {error && (
        <div className="mx-4 mt-3 border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-sm text-danger">
          {error}
        </div>
      )}
      <div
        className={`grid gap-3 p-4 ${isDesktop ? 'grid-cols-12 grid-rows-[auto_1fr_auto]' : 'grid-cols-1'}`}
      >
        <Panel title="实时排名" className={isDesktop ? 'col-span-8 row-span-1' : ''}>
          <RankingPodium items={ranking} />
          <div className={isDesktop ? 'mt-3 h-[300px]' : 'mt-3 max-h-[40vh]'}>
            <RankingList items={ranking} />
          </div>
        </Panel>

        <div className={`grid gap-3 ${isDesktop ? 'col-span-4 grid-rows-2' : ''}`}>
          <Panel title="维度均值" className="flex items-center justify-center">
            <div className={isDesktop ? 'h-[220px] w-full' : 'h-[280px] w-full'}>
              <RadarChart data={radar} />
            </div>
          </Panel>
          <Panel title="进度" className="flex items-center">
            <ProgressPanel data={progress} />
          </Panel>
        </div>

        <Panel title="公示关键词" className={isDesktop ? 'col-span-6' : ''}>
          <div className="max-h-[200px] overflow-hidden">
            <WordCloud items={wordcloud} />
          </div>
        </Panel>

        <Panel title="互评映射（仅管理员）" className={isDesktop ? 'col-span-6' : ''}>
          {isAdmin ? (
            <div className="h-[200px]">
              <SankeyDiagram data={sankey} />
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center font-mono text-sm text-dim">
              无权限查看
            </div>
          )}
        </Panel>

        <Panel title="最新评语" className={isDesktop ? 'col-span-12' : ''}>
          <Ticker items={ticker} />
        </Panel>
      </div>
    </>
  );

  if (isDesktop) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-void font-body text-base">
        <CodeRain active={level === 'full'} />
        <div className="relative z-10 flex h-screen w-screen items-center justify-center">
          <div
            style={{
              width: DESIGN_W,
              height: DESIGN_H,
              transform: `scale(${scale})`,
              transformOrigin: 'center',
            }}
          >
            <div className="flex h-full flex-col">
              {header}
              <div className="min-h-0 flex-1 overflow-hidden">{content}</div>
            </div>
          </div>
        </div>
        <CRTOverlay />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void font-body text-base">
      <CodeRain active={level === 'full'} />
      <div className="relative z-10">
        {header}
        {content}
      </div>
      <CRTOverlay />
    </div>
  );
}
