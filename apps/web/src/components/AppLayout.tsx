import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { GlitchText } from './effects/GlitchText';

const navCls = ({ isActive }: { isActive: boolean }) =>
  `border px-3 py-1 font-mono text-sm tracking-wider transition-colors ${
    isActive ? 'border-cyan bg-cyan/10 text-cyan' : 'border-transparent text-dim hover:text-hi'
  }`;

/** 业务页公共布局：顶部导航 + 用户信息 + <Outlet/>。 */
export default function AppLayout() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-void font-body">
      <header className="flex flex-wrap items-center gap-3 border-b border-cyan/30 px-4 py-3">
        <GlitchText
          text="TASK // 考核系统"
          className="font-display text-lg tracking-widest text-hi"
        />
        <nav className="flex items-center gap-2">
          <NavLink to="/competitions" className={navCls}>
            比赛
          </NavLink>
          <NavLink to="/dashboard" className={navCls}>
            大屏
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-xs text-dim">
            {user?.name ?? ''}
            <span className="text-cyan"> · </span>
            {user?.globalRole}
          </span>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="border border-pink/40 px-3 py-1 font-mono text-xs text-pink transition-colors hover:border-pink"
          >
            退出
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
