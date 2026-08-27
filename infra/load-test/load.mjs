/**
 * 压测脚本（M6）：REST 排名接口 + WebSocket 订阅/往返延迟。
 * 运行（在 Linux/Docker 环境，先启动 api + seed）：
 *   node infra/load-test/load.mjs
 * 环境变量：
 *   API_BASE    默认 http://localhost:3000/api/v1
 *   WS_URL      默认 http://localhost:3000（自动加 /ws 命名空间）
 *   ADMIN_EMAIL / ADMIN_PASS  默认 admin@task.dev / Passw0rd!
 *   ITER        REST 请求总数（默认 200）
 *   CONCURRENCY 并发数（默认 20）
 *   WS_CONN     WebSocket 连接数（默认 20）
 * 输出：JSON 汇总（latency p50/p95、错误率、WS 连接/往返）。
 */

import { io } from 'socket.io-client';

const API_BASE = process.env.API_BASE ?? 'http://localhost:3000/api/v1';
const WS_URL = process.env.WS_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@task.dev';
const ADMIN_PASS = process.env.ADMIN_PASS ?? 'Passw0rd!';
const ITER = Number(process.env.ITER ?? 200);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 20);
const WS_CONN = Number(process.env.WS_CONN ?? 20);

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function login() {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status} ${await res.text()}`);
  const { accessToken } = await res.json();
  return accessToken;
}

async function listCompetition(token) {
  const res = await fetch(`${API_BASE}/competitions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const list = await res.json();
  return list[0]?.id;
}

async function runRest(token, competitionId) {
  const latencies = [];
  let errors = 0;
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const i = cursor++;
      if (i >= ITER) return;
      const start = performance.now();
      try {
        const res = await fetch(`${API_BASE}/competitions/${competitionId}/dashboard/ranking`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) errors++;
      } catch {
        errors++;
      }
      latencies.push(performance.now() - start);
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  latencies.sort((a, b) => a - b);
  return {
    total: latencies.length + errors,
    ok: latencies.length,
    errors,
    p50: Math.round(percentile(latencies, 50) ?? 0),
    p95: Math.round(percentile(latencies, 95) ?? 0),
    max: Math.round(latencies[latencies.length - 1] ?? 0),
  };
}

function wsRoundTrip(token, competitionId) {
  return new Promise((resolve) => {
    const socket = io(`${WS_URL}/ws`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });
    const start = performance.now();
    let connectedAt = null;
    let done = false;
    const finish = (rtt) => {
      if (done) return;
      done = true;
      socket.disconnect();
      resolve(rtt);
    };
    const timeout = setTimeout(() => finish(null), 5000);

    socket.on('connect', () => {
      connectedAt = performance.now();
      socket.emit('subscribe', { competitionId });
      socket.emit('ping');
    });
    socket.on('pong', () => {
      clearTimeout(timeout);
      finish(Math.round(performance.now() - (connectedAt ?? start)));
    });
    socket.on('connect_error', () => {
      clearTimeout(timeout);
      finish(null);
    });
  });
}

async function runWs(token, competitionId) {
  const results = await Promise.all(
    Array.from({ length: WS_CONN }, () => wsRoundTrip(token, competitionId)),
  );
  const ok = results.filter((r) => r != null);
  const rtts = ok.sort((a, b) => a - b);
  return {
    total: WS_CONN,
    ok: ok.length,
    failed: WS_CONN - ok.length,
    connectP95: Math.round(percentile(rtts, 95) ?? 0),
    connectMax: Math.round(rtts[rtts.length - 1] ?? 0),
  };
}

async function main() {
  const token = await login();
  const competitionId = await listCompetition(token);
  if (!competitionId) throw new Error('无比赛数据，请先运行 seed');

  console.log('压测开始：competition=%s iter=%d concurrency=%d ws=%d', competitionId, ITER, CONCURRENCY, WS_CONN);
  const rest = await runRest(token, competitionId);
  const ws = await runWs(token, competitionId);

  console.log(JSON.stringify({ rest, ws }, null, 2));
}

main().catch((e) => {
  console.error('压测失败：', e.message);
  process.exit(1);
});
