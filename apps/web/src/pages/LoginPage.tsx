import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlitchButton } from '@task/ui';
import { api } from '../lib/api';
import { useAuth, type GlobalRole } from '../lib/auth';

interface LoginResponse {
  accessToken: string;
  user: { id: string; email: string; name: string; globalRole: GlobalRole };
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      login(res.user, res.accessToken);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-void px-4 font-body">
      <form
        onSubmit={submit}
        className="w-full max-w-sm border border-cyan/40 bg-deep/70 p-8 backdrop-blur"
      >
        <h1 className="mb-1 font-display text-2xl tracking-widest text-hi">
          TASK
          <span className="text-cyan" style={{ textShadow: '0 0 8px #00f3ff' }}>
            {' '}
            //
          </span>
          大屏
        </h1>
        <p className="mb-6 font-mono text-xs text-dim">登录后进入考核大屏 · 赛博朋克实时看板</p>

        {error && <p className="mb-4 font-mono text-sm text-danger">{error}</p>}

        <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-dim">
          邮箱
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          autoComplete="email"
          className="mb-4 w-full border border-cyan/30 bg-void px-3 py-2 font-mono text-base text-hi outline-none focus:border-cyan"
        />

        <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-dim">
          密码
        </label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          autoComplete="current-password"
          className="mb-6 w-full border border-cyan/30 bg-void px-3 py-2 font-mono text-base text-hi outline-none focus:border-cyan"
        />

        <GlitchButton type="submit" disabled={loading}>
          {loading ? '接入中…' : '接入大屏'}
        </GlitchButton>
      </form>
    </main>
  );
}
