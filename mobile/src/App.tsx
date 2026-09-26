import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import {
  cancelRun,
  dispatchSession,
  getContents,
  getRun,
  latestRelease,
  listBranches,
  listRepos,
  listRuns,
  parseReport,
  parseSlug,
  pollReportOnce,
  putContents,
  rawFile,
  realUrl,
  runLogText,
  validateToken,
  RunInfo,
  ReportData,
} from './api';
import { loadConfig, saveConfig, tokenFor, activeAccount, MobileConfig, SessionRecord, emptyConfig } from './store';
import { BigButton, Badge, Card, Chips, C, Divider, Empty, Field, KeyValue, LiveDot, Mono, QrView, SectionLabel, statusTint } from './ui';

const APP_VERSION = '0.7.0';
const DEFAULT_REPO = 'Seigh-sword/Giecko';
const STACKS = ['ide', 'terminal', 'vscode', 'desktop'];
const OSES = ['ubuntu-latest', 'macos-latest', 'windows-latest'];
const DISTROS = ['runner', 'ubuntu', 'debian', 'fedora', 'arch', 'alpine'];
const DURATIONS = ['15', '30', '60', '120', '180', '360'];

type Route =
  | { s: 'home' }
  | { s: 'launch' }
  | { s: 'sessions' }
  | { s: 'more' }
  | { s: 'accounts' }
  | { s: 'setup' }
  | { s: 'local' }
  | { s: 'plugins' }
  | { s: 'update' }
  | { s: 'changelog' }
  | { s: 'about' }
  | { s: 'run'; id: string }
  | { s: 'logs'; id: string };

type WebSession = { url: string; title: string; subtitle: string } | null;

export default function App() {
  const [cfg, setCfg] = useState<MobileConfig>(emptyConfig);
  const [ready, setReady] = useState(false);
  const [stack, setStack] = useState<Route[]>([{ s: 'home' }]);
  const [tab, setTab] = useState<'home' | 'launch' | 'sessions' | 'more'>('home');
  const [repo, setRepo] = useState(DEFAULT_REPO);
  const [web, setWeb] = useState<WebSession>(null);

  useEffect(() => {
    loadConfig().then((c) => {
      setCfg(c);
      if (c.lastRepo) setRepo(c.lastRepo);
      setReady(true);
    });
  }, []);

  const updateCfg = useCallback((c: MobileConfig) => {
    setCfg(c);
    saveConfig(c);
  }, []);

  const route = stack[stack.length - 1];
  const push = (r: Route) => setStack((s) => [...s, r]);
  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const goTab = (t: 'home' | 'launch' | 'sessions' | 'more') => {
    setTab(t);
    setStack([{ s: t }]);
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (web) {
        setWeb(null);
        return true;
      }
      if (stack.length > 1) {
        pop();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, web]);

  const openSession = (url: string, title: string, subtitle: string) => {
    if (!url) return;
    setWeb({ url, title, subtitle });
  };

  const withRepo = useMemo(() => ({ slug: repo, token: tokenFor(cfg) }), [repo, cfg]);

  if (!ready) {
    return (
      <SafeAreaView style={g.root}>
        <View style={g.splash}>
          <Text style={g.splashBrand}>GIECKO</Text>
          <Text style={g.splashSub}>GitHub Actions as a machine in your pocket</Text>
          <ActivityIndicator color={C.green} style={{ marginTop: 18 }} />
        </View>
      </SafeAreaView>
    );
  }

  const showTabs = ['home', 'launch', 'sessions', 'more'].includes(route.s);

  return (
    <SafeAreaView style={g.root}>
      <View style={g.header}>
        <Pressable onPress={() => goTab('home')} hitSlop={8}>
          <Text style={g.brand}>GIECKO</Text>
        </Pressable>
        <View style={g.headerRight}>
          {activeAccount(cfg) ? (
            <Pressable style={g.accountPill} onPress={() => push({ s: 'accounts' })}>
              <LiveDot size={7} />
              <Text style={g.accountPillText}>{activeAccount(cfg)?.login || activeAccount(cfg)?.name}</Text>
            </Pressable>
          ) : (
            <Pressable style={[g.accountPill, { borderColor: C.amber + '88' }]} onPress={() => push({ s: 'accounts' })}>
              <Text style={[g.accountPillText, { color: C.amber }]}>ADD ACCOUNT</Text>
            </Pressable>
          )}
        </View>
      </View>
      <View style={g.flex}>
        <ScrollView style={g.body} contentContainerStyle={g.bodyContent} keyboardShouldPersistTaps="handled">
          {route.s === 'home' ? <HomeScreen cfg={cfg} repo={repo} openSession={openSession} push={push} goTab={goTab} withRepo={withRepo} /> : null}
          {route.s === 'launch' ? (
            <LaunchScreen cfg={cfg} repo={repo} setRepo={setRepo} updateCfg={updateCfg} openSession={openSession} push={push} />
          ) : null}
          {route.s === 'sessions' ? <SessionsScreen withRepo={withRepo} push={push} /> : null}
          {route.s === 'more' ? <MoreScreen push={push} /> : null}
          {route.s === 'accounts' ? <AccountsScreen cfg={cfg} updateCfg={updateCfg} /> : null}
          {route.s === 'setup' ? <SetupScreen withRepo={withRepo} repo={repo} setRepo={setRepo} /> : null}
          {route.s === 'local' ? <LocalScreen /> : null}
          {route.s === 'plugins' ? <PluginsScreen withRepo={withRepo} /> : null}
          {route.s === 'update' ? <UpdateScreen withRepo={withRepo} /> : null}
          {route.s === 'changelog' ? <ChangelogScreen withRepo={withRepo} /> : null}
          {route.s === 'about' ? <AboutScreen openSession={openSession} /> : null}
          {route.s === 'run' ? <RunScreen withRepo={withRepo} runId={route.id} openSession={openSession} push={push} /> : null}
          {route.s === 'logs' ? <LogsScreen withRepo={withRepo} runId={route.id} /> : null}
        </ScrollView>
      </View>
      {web ? (
        <View style={g.webWrap}>
          <View style={g.webBar}>
            <Pressable style={g.webClose} onPress={() => setWeb(null)}>
              <Text style={g.webCloseText}>CLOSE</Text>
            </Pressable>
            <View style={g.webTitleWrap}>
              <Text style={g.webTitle} numberOfLines={1}>
                {web.title}
              </Text>
              <Text style={g.webSub} numberOfLines={1}>
                {web.subtitle}
              </Text>
            </View>
            <LiveDot size={8} />
          </View>
          <WebView
            source={{ uri: web.url }}
            style={g.web}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={g.webLoad}>
                <ActivityIndicator color={C.green} size="large" />
              </View>
            )}
          />
        </View>
      ) : null}
      {showTabs ? (
        <View style={g.tabbar}>
          {(
            [
              ['home', 'HOME'],
              ['launch', 'LAUNCH'],
              ['sessions', 'SESSIONS'],
              ['more', 'MORE'],
            ] as const
          ).map(([id, label]) => (
            <Pressable key={id} style={[g.tab, tab === id ? g.tabActive : null]} onPress={() => goTab(id)}>
              <View style={[g.tabDot, tab === id ? { backgroundColor: C.green } : { backgroundColor: C.line2 }]} />
              <Text style={[g.tabLabel, tab === id ? g.tabLabelActive : null]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={g.tabbar}>
          <Pressable style={g.tab} onPress={pop}>
            <View style={[g.tabDot, { backgroundColor: C.cyan }]} />
            <Text style={[g.tabLabel, { color: C.cyan }]}>BACK</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function HomeScreen(props: {
  cfg: MobileConfig;
  repo: string;
  openSession: (url: string, title: string, subtitle: string) => void;
  push: (r: Route) => void;
  goTab: (t: 'home' | 'launch' | 'sessions' | 'more') => void;
  withRepo: { slug: string; token: string };
}): React.JSX.Element {
  const { cfg, openSession, push, goTab, withRepo } = props;
  const [connectUrl, setConnectUrl] = useState('');
  const [lastRun, setLastRun] = useState<RunInfo | null>(null);
  const [runErr, setRunErr] = useState('');

  useEffect(() => {
    if (!withRepo.token) return;
    listRuns(withRepo, 1)
      .then((r) => setLastRun(r[0] || null))
      .catch((e) => setRunErr(e instanceof Error ? e.message : String(e)));
  }, [withRepo]);

  const recent = cfg.sessions.slice(0, 6);

  return (
    <View>
      <Card style={g.hero} glow={C.green}>
        <Text style={g.heroTitle}>GITHUB ACTIONS</Text>
        <Text style={g.heroTitle2}>AS A MACHINE</Text>
        <Text style={g.heroSub}>IN YOUR POCKET</Text>
        <Divider />
        <View style={g.heroRow}>
          <View style={g.heroStat}>
            <Text style={g.heroStatNum}>{cfg.accounts.length}</Text>
            <Text style={g.heroStatLabel}>ACCOUNTS</Text>
          </View>
          <View style={g.heroStat}>
            <Text style={g.heroStatNum}>{cfg.sessions.length}</Text>
            <Text style={g.heroStatLabel}>SESSIONS</Text>
          </View>
          <View style={g.heroStat}>
            <Text style={g.heroStatNum}>{withRepo.token ? 'OK' : '--'}</Text>
            <Text style={g.heroStatLabel}>TOKEN</Text>
          </View>
        </View>
      </Card>

      <SectionLabel text="quick connect" tint={C.cyan} />
      <Card>
        <Field label="Session URL" value={connectUrl} onChange={setConnectUrl} placeholder="https://something.trycloudflare.com" mono tint={C.cyan} />
        <BigButton label="Open in app" variant="cyan" disabled={!connectUrl.startsWith('http')} onPress={() => openSession(connectUrl.trim(), 'Session', connectUrl.trim())} />
        <Text style={g.hint}>Sessions open inside Giecko, never in an external browser.</Text>
      </Card>

      {withRepo.token ? (
        <React.Fragment>
          <SectionLabel text="latest run" tint={C.purple} />
          {lastRun ? (
            <Card>
              <View style={g.rowBetween}>
                <Mono color={C.text}>{props.repo}</Mono>
                <Badge text={lastRun.status + (lastRun.conclusion ? ' / ' + lastRun.conclusion : '')} tint={statusTint(lastRun.status, lastRun.conclusion)} />
              </View>
              <Divider />
              <BigButton label="Open run" variant="ghost" onPress={() => push({ s: 'run', id: String(lastRun.id) })} />
            </Card>
          ) : (
            <Empty text={runErr ? runErr : 'No runs found for ' + props.repo + ' yet. Launch one from the LAUNCH tab.'} />
          )}
        </React.Fragment>
      ) : (
        <Card glow={C.amber}>
          <Text style={g.warnTitle}>NO ACCOUNT CONNECTED</Text>
          <Text style={g.hint}>Add a GitHub token to dispatch and watch sessions from this phone.</Text>
          <BigButton label="Add account" variant="ghost" onPress={() => push({ s: 'accounts' })} />
        </Card>
      )}

      {recent.length ? (
        <React.Fragment>
          <SectionLabel text="recent sessions" />
          {recent.map((s) => (
            <Card key={s.runId + s.startedAt}>
              <View style={g.rowBetween}>
                <Mono color={C.text}>{'run ' + s.runId}</Mono>
                <Badge text={s.stack} tint={C.purple} />
              </View>
              <Text style={g.hint}>
                {s.repo} - {s.startedAt}
              </Text>
              <Divider />
              <View style={g.rowGap}>
                {s.term ? (
                  <BigButton label="Terminal" onPress={() => openSession(s.term, 'Terminal', 'run ' + s.runId)} />
                ) : null}
                {s.code ? (
                  <BigButton label="VS Code" variant="cyan" onPress={() => openSession(s.code, 'VS Code', 'run ' + s.runId)} />
                ) : null}
                {s.desk ? (
                  <BigButton label="Desktop" variant="ghost" onPress={() => openSession(s.desk, 'Desktop', 'run ' + s.runId)} />
                ) : null}
              </View>
            </Card>
          ))}
        </React.Fragment>
      ) : null}

      <Card style={g.navGridCard}>
        <Text style={g.navGridTitle}>JUMP TO</Text>
        <View style={g.navGrid}>
          {(
            [
              ['LAUNCH', C.green, () => goTab('launch')],
              ['SESSIONS', C.cyan, () => goTab('sessions')],
              ['PLUGINS', C.purple, () => push({ s: 'plugins' })],
              ['SETUP', C.pink, () => push({ s: 'setup' })],
              ['LOCAL', C.amber, () => push({ s: 'local' })],
              ['CHANGELOG', C.blue, () => push({ s: 'changelog' })],
            ] as const
          ).map(([label, tint, fn]) => (
            <Pressable key={label} style={[g.navCell, { borderColor: tint + '66' }]} onPress={fn}>
              <Text style={[g.navCellText, { color: tint }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
    </View>
  );
}

function LaunchScreen(props: {
  cfg: MobileConfig;
  repo: string;
  setRepo: (r: string) => void;
  updateCfg: (c: MobileConfig) => void;
  openSession: (url: string, title: string, subtitle: string) => void;
  push: (r: Route) => void;
}): React.JSX.Element {
  const { cfg, repo, setRepo, updateCfg, openSession } = props;
  const [stack, setStack] = useState('ide');
  const [os, setOs] = useState('ubuntu-latest');
  const [distro, setDistro] = useState('runner');
  const [duration, setDuration] = useState('60');
  const [packages, setPackages] = useState('');
  const [autosave, setAutosave] = useState('15');
  const [restore, setRestore] = useState('');
  const [plugins, setPlugins] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState('');
  const [report, setReport] = useState<ReportData | null>(null);
  const [runId, setRunId] = useState('');

  const distros = os === 'ubuntu-latest' ? DISTROS : ['runner'];
  useEffect(() => {
    if (os !== 'ubuntu-latest' && distro !== 'runner') setDistro('runner');
  }, [os, distro]);

  async function launch() {
    setBusy(true);
    setError('');
    setReport(null);
    setRunId('');
    const withRepo = { slug: repo, token: tokenFor(cfg) };
    try {
      setPhase('dispatching session');
      const note = await dispatchSession({
        repo: withRepo,
        stack,
        os,
        distro,
        duration,
        packages,
        autosave,
        restore,
        plugins,
      });
      setPhase(note + ' - waiting for the run to appear');
      if (cfg.lastRepo !== repo) {
        updateCfg({ ...cfg, lastRepo: repo });
      }
      let found = '';
      for (let i = 0; i < 12 && !found; i++) {
        await sleep(5000);
        const runs = await listRuns(withRepo, 5);
        found = String((runs[0] || {}).id || '');
      }
      if (!found) throw new Error('could not find the new run');
      setRunId(found);
      setPhase('run ' + found + ' booting - polling for the live report');
      const rep = await waitForReport(withRepo, found, (p) => setPhase(p));
      if (!rep) throw new Error('run ended without publishing a report');
      const parsed = parseReport(rep);
      setReport(parsed);
      setPhase('');
      const rec: SessionRecord = {
        runId: found,
        repo: parseSlug(repo),
        stack: parsed.stack || stack,
        startedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        term: realUrl(parsed.term),
        code: realUrl(parsed.code),
        desk: realUrl(parsed.desk),
      };
      const sessions = [rec, ...cfg.sessions.filter((s) => s.runId !== found)].slice(0, 30);
      updateCfg({ ...cfg, lastRepo: parseSlug(repo), sessions });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <SectionLabel text="new session" tint={C.green} />
      <Card glow={stack === 'desktop' ? C.purple : C.green}>
        <Field label="Repository (owner/name)" value={repo} onChange={(v) => setRepo(v)} placeholder={DEFAULT_REPO} mono />
        <Chips label="Stack" choices={STACKS} value={stack} onPick={setStack} />
        <Chips label="Runner OS" choices={OSES} value={os} onPick={setOs} tint={C.cyan} />
        <Chips label="Distro" choices={distros} value={distro} onPick={setDistro} tint={C.purple} />
        <Chips label="Duration (minutes)" choices={DURATIONS} value={duration} onPick={setDuration} tint={C.amber} />
        <Field label="Extra packages (space separated)" value={packages} onChange={setPackages} placeholder="htop ripgrep" mono />
        <Chips label="Autosave every N minutes" choices={['0', '5', '15', '30']} value={autosave} onPick={setAutosave} tint={C.blue} />
        <Field label="Restore from run id (optional)" value={restore} onChange={setRestore} placeholder="1234567890" mono />
        <Field label="Session plugins (optional)" value={plugins} onChange={setPlugins} placeholder="gcko.pkg-ripgrep gcko.pkg-neovim" mono />
        <Divider />
        <View style={g.rowBetween}>
          <Badge text="OPEN SESSION" tint={C.green} />
          <Text style={g.hint}>no password: anyone with the link gets in</Text>
        </View>
        <BigButton label="Launch session" onPress={launch} disabled={busy || !tokenFor(cfg)} busy={busy} />
        {!tokenFor(cfg) ? <Text style={g.warnText}>add an account first (More, then Accounts)</Text> : null}
      </Card>

      {phase ? (
        <Card glow={C.cyan}>
          <View style={g.rowBetween}>
            <LiveDot tint={C.cyan} />
            <Text style={g.phaseText}>{phase}</Text>
          </View>
        </Card>
      ) : null}

      {error ? (
        <Card glow={C.red}>
          <Text style={g.errorText}>{error}</Text>
        </Card>
      ) : null}

      {report ? <LiveReport report={report} runId={runId} openSession={openSession} /> : null}
    </View>
  );
}

function LiveReport(props: {
  report: ReportData;
  runId: string;
  openSession: (url: string, title: string, subtitle: string) => void;
}): React.JSX.Element {
  const { report, runId, openSession } = props;
  const [qrFor, setQrFor] = useState('');
  const term = realUrl(report.term);
  const code = realUrl(report.code);
  const desk = realUrl(report.desk);
  const qrUrl = qrFor || term || code || desk;
  return (
    <View>
      <Card glow={C.green}>
        <View style={g.rowBetween}>
          <LiveDot />
          <Text style={g.liveTitle}>GIECKO IS LIVE</Text>
          <Badge text={'run ' + runId} tint={C.green} />
        </View>
        <Divider />
        <KeyValue k="stack" v={report.stack} tint={C.purple} />
        <KeyValue k="distro" v={report.distro} />
        <KeyValue k="region" v={report.region} tint={C.cyan} />
        <KeyValue k="boot" v={report.boot + 's'} tint={C.amber} />
        {report.work ? <KeyValue k="work branch" v={report.work} /> : null}
        <Divider />
        <View style={g.rowGap}>
          {term ? <BigButton label="Terminal" onPress={() => openSession(term, 'Terminal', 'run ' + runId)} /> : null}
          {code ? <BigButton label="VS Code" variant="cyan" onPress={() => openSession(code, 'VS Code', 'run ' + runId)} /> : null}
          {desk ? <BigButton label="Desktop" variant="ghost" onPress={() => openSession(desk, 'Desktop', 'run ' + runId)} /> : null}
        </View>
      </Card>
      {qrUrl ? (
        <Card style={{ alignItems: 'center' }}>
          <SectionLabel text="scan to open on another device" />
          <QrView value={qrUrl} size={Math.min(Dimensions.get('window').width - 96, 300)} />
          <View style={g.rowGap}>
            {term ? (
              <Pressable onPress={() => setQrFor(term)}>
                <Badge text="QR: terminal" tint={qrFor === term ? C.green : C.dim} />
              </Pressable>
            ) : null}
            {code ? (
              <Pressable onPress={() => setQrFor(code)}>
                <Badge text="QR: vscode" tint={qrFor === code ? C.cyan : C.dim} />
              </Pressable>
            ) : null}
            {desk ? (
              <Pressable onPress={() => setQrFor(desk)}>
                <Badge text="QR: desktop" tint={qrFor === desk ? C.purple : C.dim} />
              </Pressable>
            ) : null}
          </View>
        </Card>
      ) : null}
    </View>
  );
}

function SessionsScreen(props: { withRepo: { slug: string; token: string }; push: (r: Route) => void }): React.JSX.Element {
  const { withRepo, push } = props;
  const [runs, setRuns] = useState<RunInfo[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    setBusy(true);
    setError('');
    try {
      const [r, b] = await Promise.all([listRuns(withRepo, 15), listBranches(withRepo).catch(() => [] as string[])]);
      setRuns(r);
      setBranches(b.filter((x) => x.startsWith('giecko-saves/') || x.startsWith('giecko-work/')).sort().reverse().slice(0, 10));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (withRepo.token) refresh();
  }, [withRepo]);

  if (!withRepo.token) {
    return <Empty text="Add an account first, then sessions show up here." />;
  }

  return (
    <View>
      <SectionLabel text="workflow runs" tint={C.cyan} />
      <BigButton label={busy ? 'Refreshing' : 'Refresh'} variant="ghost" onPress={refresh} busy={busy} />
      {error ? (
        <Card glow={C.red}>
          <Text style={g.errorText}>{error}</Text>
        </Card>
      ) : null}
      {runs.length === 0 && !busy ? <Empty text={'No giecko.yml runs yet for ' + withRepo.slug + '.'} /> : null}
      {runs.map((r) => (
        <Pressable key={r.id} onPress={() => push({ s: 'run', id: String(r.id) })}>
          <Card style={g.runCard}>
            <View style={g.rowBetween}>
              <Mono color={C.text}>{'#' + r.id}</Mono>
              <Badge text={r.status + (r.conclusion ? ' / ' + r.conclusion : '')} tint={statusTint(r.status, r.conclusion)} />
            </View>
            <Text style={g.hint}>{r.name}</Text>
            <Text style={g.hint}>{r.created_at.replace('T', ' ').replace('Z', '')}</Text>
            {(r.status === 'in_progress' || r.status === 'queued') ? (
              <View style={g.rowGap}>
                <LiveDot tint={C.amber} size={8} />
                <Text style={[g.hint, { color: C.amber }]}>live now - tap to manage</Text>
              </View>
            ) : null}
          </Card>
        </Pressable>
      ))}
      {branches.length ? (
        <React.Fragment>
          <SectionLabel text="session branches" tint={C.purple} />
          <Card>
            {branches.map((b) => (
              <KeyValue key={b} k={b.startsWith('giecko-saves/') ? 'save' : 'work'} v={b} tint={b.startsWith('giecko-saves/') ? C.green : C.cyan} />
            ))}
          </Card>
        </React.Fragment>
      ) : null}
    </View>
  );
}

function RunScreen(props: {
  withRepo: { slug: string; token: string };
  runId: string;
  openSession: (url: string, title: string, subtitle: string) => void;
  push: (r: Route) => void;
}): React.JSX.Element {
  const { withRepo, runId, openSession } = props;
  const [run, setRun] = useState<RunInfo | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [phase, setPhase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function loadRun() {
    try {
      const r = await getRun(withRepo, runId);
      setRun(r);
      const w = await pollReportOnce(withRepo, runId);
      if (w.found) setReport(parseReport(w.text));
      else if (!w.ended) setPhase('run is ' + r.status + ' - report not published yet');
      else setPhase('run ended without a published report');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    loadRun();
  }, [runId]);

  async function watch() {
    setBusy(true);
    setError('');
    try {
      const text = await waitForReport(withRepo, runId, (p) => setPhase(p));
      if (!text) throw new Error('run ended without publishing a report');
      setReport(parseReport(text));
      setPhase('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setError('');
    try {
      await cancelRun(withRepo, runId);
      setPhase('cancel requested');
      await loadRun();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const active = run ? run.status === 'in_progress' || run.status === 'queued' : false;

  return (
    <View>
      <SectionLabel text={'run ' + runId} tint={C.cyan} />
      {run ? (
        <Card>
          <View style={g.rowBetween}>
            <Mono color={C.text}>{withRepo.slug}</Mono>
            <Badge text={run.status + (run.conclusion ? ' / ' + run.conclusion : '')} tint={statusTint(run.status, run.conclusion)} />
          </View>
          <Text style={g.hint}>{run.name}</Text>
          <Text style={g.hint}>{run.created_at.replace('T', ' ').replace('Z', '')}</Text>
          <Divider />
          <View style={g.rowGap}>
            <BigButton label="Watch for report" variant="cyan" onPress={watch} busy={busy} />
            {active ? <BigButton label="Cancel run" variant="danger" onPress={cancel} disabled={busy} /> : null}
          </View>
        </Card>
      ) : (
        <Card>
          <Text style={g.hint}>loading run...</Text>
        </Card>
      )}
      {phase ? (
        <Card glow={C.amber}>
          <View style={g.rowBetween}>
            <LiveDot tint={C.amber} />
            <Text style={g.phaseText}>{phase}</Text>
          </View>
        </Card>
      ) : null}
      {error ? (
        <Card glow={C.red}>
          <Text style={g.errorText}>{error}</Text>
        </Card>
      ) : null}
      {report ? <LiveReport report={report} runId={runId} openSession={openSession} /> : null}
      <BigButton label="View logs" variant="ghost" onPress={() => props.push({ s: 'logs', id: runId })} />
    </View>
  );
}

function LogsScreen(props: { withRepo: { slug: string; token: string }; runId: string }): React.JSX.Element {
  const { withRepo, runId } = props;
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tail, setTail] = useState('120');

  async function load() {
    setBusy(true);
    setError('');
    try {
      const raw = await runLogText(withRepo, runId);
      setText(raw);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, [runId]);

  const lines = text ? text.split('\n') : [];
  const n = tail === 'all' ? lines.length : Math.min(Number(tail) || 120, lines.length);
  const shown = lines.slice(-n);

  return (
    <View>
      <SectionLabel text={'logs ' + runId} tint={C.amber} />
      <Chips label="Tail" choices={['60', '120', '400', 'all']} value={tail} onPick={setTail} tint={C.amber} />
      <BigButton label={busy ? 'Fetching' : 'Refresh logs'} variant="ghost" onPress={load} busy={busy} />
      {error ? (
        <Card glow={C.red}>
          <Text style={g.errorText}>{error}</Text>
        </Card>
      ) : null}
      {busy ? (
        <Card style={{ alignItems: 'center' }}>
          <ActivityIndicator color={C.amber} />
        </Card>
      ) : null}
      {shown.length ? (
        <Card style={g.logCard}>
          <ScrollView horizontal={false} nestedScrollEnabled>
            <Text style={g.logText}>
              {shown.join('\n')}
            </Text>
          </ScrollView>
        </Card>
      ) : null}
    </View>
  );
}

function AccountsScreen(props: { cfg: MobileConfig; updateCfg: (c: MobileConfig) => void }): React.JSX.Element {
  const { cfg, updateCfg } = props;
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  async function add() {
    setBusy(true);
    setError('');
    setNote('');
    try {
      const clean = name.trim();
      if (!/^[A-Za-z0-9_.-]{1,64}$/.test(clean)) throw new Error('account name: letters, numbers, _ . - (max 64)');
      const login = await validateToken(token.trim());
      const accounts = [...cfg.accounts.filter((a) => a.name !== clean), { name: clean, token: token.trim(), login }];
      updateCfg({ ...cfg, accounts, activeAccount: cfg.activeAccount || clean });
      setNote('saved account ' + clean + ' (' + login + ')');
      setName('');
      setToken('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <SectionLabel text="accounts" tint={C.green} />
      {cfg.accounts.length === 0 ? <Empty text="No accounts yet. Add one with a GitHub token (workflow scope)." /> : null}
      {cfg.accounts.map((a) => (
        <Card key={a.name} glow={a.name === cfg.activeAccount ? C.green : undefined}>
          <View style={g.rowBetween}>
            <Mono color={C.text}>{a.name}</Mono>
            {a.name === cfg.activeAccount ? <Badge text="ACTIVE" tint={C.green} /> : null}
          </View>
          <Text style={g.hint}>github user: {a.login}</Text>
          <Divider />
          <View style={g.rowGap}>
            {a.name !== cfg.activeAccount ? (
              <BigButton
                label="Make active"
                variant="ghost"
                onPress={() => updateCfg({ ...cfg, activeAccount: a.name })}
              />
            ) : null}
            <BigButton
              label="Remove"
              variant="danger"
              onPress={() => {
                const accounts = cfg.accounts.filter((x) => x.name !== a.name);
                const activeAccount = cfg.activeAccount === a.name ? (accounts[0] ? accounts[0].name : '') : cfg.activeAccount;
                updateCfg({ ...cfg, accounts, activeAccount });
              }}
            />
          </View>
        </Card>
      ))}
      <SectionLabel text="add account" tint={C.cyan} />
      <Card>
        <Field label="Account name" value={name} onChange={setName} placeholder="work" />
        <Field label="GitHub token (workflow + contents scope)" value={token} onChange={setToken} placeholder="github_pat_..." secret mono tint={C.cyan} />
        <BigButton label="Validate and save" variant="cyan" onPress={add} disabled={busy || !name || !token} busy={busy} />
        {note ? <Text style={g.okText}>{note}</Text> : null}
        {error ? <Text style={g.errorText}>{error}</Text> : null}
        <Text style={g.hint}>The token is checked against the GitHub API before it is stored on this device.</Text>
      </Card>
    </View>
  );
}

function SetupScreen(props: {
  withRepo: { slug: string; token: string };
  repo: string;
  setRepo: (r: string) => void;
}): React.JSX.Element {
  const { withRepo, repo, setRepo } = props;
  const [repos, setRepos] = useState<string[]>([]);
  const [stack, setStack] = useState('ide');
  const [os, setOs] = useState('ubuntu-latest');
  const [distro, setDistro] = useState('runner');
  const [duration, setDuration] = useState('120');
  const [autosave, setAutosave] = useState('15');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!withRepo.token) return;
    listRepos(withRepo.token)
      .then((r) => setRepos(r.map((x) => x.full_name)))
      .catch(() => setRepos([]));
  }, [withRepo]);

  async function save() {
    setBusy(true);
    setError('');
    setNote('');
    try {
      const existing = await getContents(withRepo, '.giecko.json');
      const conf: Record<string, unknown> = existing ? safeJson(existing.content) : {};
      conf.repo = parseSlug(repo);
      conf.stack = stack;
      conf.os = os;
      conf.distro = distro;
      conf.duration = duration;
      conf.autosave_minutes = autosave;
      await putContents(withRepo, '.giecko.json', JSON.stringify(conf, null, 2) + '\n', 'giecko mobile: update session config', undefined, existing ? existing.sha : undefined);
      setNote('saved .giecko.json in ' + parseSlug(repo));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <SectionLabel text="repo setup" tint={C.pink} />
      <Card glow={C.pink}>
        <Text style={g.hint}>This writes .giecko.json to the repository default branch, the same file the CLI writes with giecko init.</Text>
        <Field label="Repository (owner/name)" value={repo} onChange={setRepo} placeholder={DEFAULT_REPO} mono />
        {repos.length ? (
          <View>
            <Text style={g.fieldMini}>YOUR REPOSITORIES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={g.repoScroll}>
              {repos.slice(0, 30).map((r) => (
                <Pressable key={r} onPress={() => setRepo(r)} style={[g.repoChip, r === repo ? { borderColor: C.pink, backgroundColor: C.pink + '22' } : null]}>
                  <Text style={[g.repoChipText, r === repo ? { color: C.pink } : null]}>{r}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
        <Chips label="Default stack" choices={STACKS} value={stack} onPick={setStack} />
        <Chips label="Runner OS" choices={OSES} value={os} onPick={setOs} tint={C.cyan} />
        <Chips label="Distro" choices={os === 'ubuntu-latest' ? DISTROS : ['runner']} value={distro} onPick={setDistro} tint={C.purple} />
        <Chips label="Duration (minutes)" choices={DURATIONS} value={duration} onPick={setDuration} tint={C.amber} />
        <Chips label="Autosave every N minutes" choices={['0', '5', '15', '30']} value={autosave} onPick={setAutosave} tint={C.blue} />
        <BigButton label="Save configuration" onPress={save} disabled={busy || !withRepo.token} busy={busy} />
        {note ? <Text style={g.okText}>{note}</Text> : null}
        {error ? <Text style={g.errorText}>{error}</Text> : null}
      </Card>
    </View>
  );
}

function LocalScreen(): React.JSX.Element {
  const [stack, setStack] = useState('terminal');
  const [duration, setDuration] = useState('120');
  const [packages, setPackages] = useState('');
  const [autosave, setAutosave] = useState('0');
  const cmd =
    'giecko local --stack ' + stack + ' --duration ' + duration + (packages ? ' --packages "' + packages + '"' : '') + ' --autosave ' + autosave;
  return (
    <View>
      <SectionLabel text="local mode" tint={C.amber} />
      <Card glow={C.amber}>
        <Text style={g.hint}>Local mode runs the same Giecko session on your own machine with Docker. Configure it here, then run the generated command where the CLI is installed.</Text>
        <Chips label="Stack" choices={['terminal', 'ide', 'vscode', 'desktop']} value={stack} onPick={setStack} tint={C.amber} />
        <Chips label="Duration (minutes)" choices={['30', '60', '120', '240']} value={duration} onPick={setDuration} />
        <Field label="Extra packages" value={packages} onChange={setPackages} placeholder="htop ripgrep" mono />
        <Chips label="Autosave every N minutes" choices={['0', '5', '15']} value={autosave} onPick={setAutosave} tint={C.blue} />
        <Divider />
        <Text style={g.fieldMini}>GENERATED COMMAND</Text>
        <View style={g.cmdBox}>
          <Mono color={C.amber} size={12}>{cmd}</Mono>
        </View>
      </Card>
      <Card>
        <Text style={g.hint}>Install the CLI with npm i -g giecko, then paste the command. The session prints its own live URL and QR when it boots.</Text>
      </Card>
    </View>
  );
}

function PluginsScreen(props: { withRepo: { slug: string; token: string } }): React.JSX.Element {
  const { withRepo } = props;
  const [plugins, setPlugins] = useState<string[]>([]);
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!withRepo.token) return;
    getContents(withRepo, '.giecko.json')
      .then((f) => {
        if (f) {
          const conf = safeJson(f.content);
          const list = Array.isArray(conf.plugins) ? (conf.plugins as string[]) : [];
          setPlugins(list);
        }
        setLoaded(true);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setLoaded(true);
      });
  }, [withRepo]);

  async function save(list: string[]) {
    setBusy(true);
    setError('');
    setNote('');
    try {
      const existing = await getContents(withRepo, '.giecko.json');
      const conf: Record<string, unknown> = existing ? safeJson(existing.content) : {};
      conf.plugins = list;
      await putContents(withRepo, '.giecko.json', JSON.stringify(conf, null, 2) + '\n', 'giecko mobile: update plugins', undefined, existing ? existing.sha : undefined);
      setPlugins(list);
      setNote('plugins saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <SectionLabel text="plugins" tint={C.purple} />
      <Card glow={C.purple}>
        <Text style={g.hint}>Plugins are npm packages tagged gcko.pkg-name. They install into new sessions at boot.</Text>
        {!loaded ? <ActivityIndicator color={C.purple} /> : null}
        {plugins.length === 0 && loaded ? <Text style={g.hint}>No plugins configured in .giecko.json yet.</Text> : null}
        {plugins.map((p) => (
          <View key={p} style={g.rowBetween}>
            <Mono color={C.purple}>{p}</Mono>
            <Pressable onPress={() => save(plugins.filter((x) => x !== p))} disabled={busy}>
              <Badge text="REMOVE" tint={C.red} />
            </Pressable>
          </View>
        ))}
        <Divider />
        <Field label="Plugin id (gcko.pkg-name)" value={next} onChange={setNext} placeholder="gcko.pkg-neovim" mono tint={C.purple} />
        <BigButton
          label="Add plugin"
          variant="ghost"
          disabled={busy || !/^gcko\.pkg(-[a-z0-9][a-z0-9._-]*)?$/i.test(next)}
          busy={busy}
          onPress={() => {
            save([...plugins, next.trim()]);
            setNext('');
          }}
        />
        {note ? <Text style={g.okText}>{note}</Text> : null}
        {error ? <Text style={g.errorText}>{error}</Text> : null}
      </Card>
    </View>
  );
}

function UpdateScreen(props: { withRepo: { slug: string; token: string } }): React.JSX.Element {
  const { withRepo } = props;
  const [latest, setLatest] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true);
    setError('');
    try {
      const r = await latestRelease(withRepo);
      setLatest(r.tag_name);
      setBody((r.body || '').slice(0, 2000));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const upToDate = latest ? latest.replace(/^v/, '') === APP_VERSION : false;

  return (
    <View>
      <SectionLabel text="update" tint={C.blue} />
      <Card glow={C.blue}>
        <View style={g.rowBetween}>
          <View>
            <Text style={g.updateLabel}>APP</Text>
            <Mono color={C.text} size={16}>{APP_VERSION}</Mono>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={g.updateLabel}>LATEST RELEASE</Text>
            <Mono color={latest ? (upToDate ? C.green : C.amber) : C.dim} size={16}>{latest || 'unknown'}</Mono>
          </View>
        </View>
        <Divider />
        <BigButton label={busy ? 'Checking' : 'Check for updates'} variant="ghost" onPress={check} busy={busy} disabled={!withRepo.token} />
        {latest ? (
          <Text style={upToDate ? g.okText : g.warnText}>
            {upToDate ? 'this app is current' : 'a newer release exists: rebuild the APK from the release workflow'}
          </Text>
        ) : null}
        {error ? <Text style={g.errorText}>{error}</Text> : null}
        {body ? (
          <View>
            <Divider />
            <Text style={g.logText}>{body}</Text>
          </View>
        ) : null}
      </Card>
    </View>
  );
}

function ChangelogScreen(props: { withRepo: { slug: string; token: string } }): React.JSX.Element {
  const { withRepo } = props;
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setError('');
    try {
      setText(await rawFile(withRepo, 'CHANGELOG.md', 'main'));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, [withRepo]);

  return (
    <View>
      <SectionLabel text="changelog" tint={C.blue} />
      <BigButton label={busy ? 'Fetching' : 'Refresh'} variant="ghost" onPress={load} busy={busy} />
      {error ? (
        <Card glow={C.red}>
          <Text style={g.errorText}>{error}</Text>
        </Card>
      ) : null}
      {text ? (
        <Card style={g.logCard}>
          <Text style={g.logText}>{text.slice(0, 12000)}</Text>
        </Card>
      ) : null}
    </View>
  );
}

function AboutScreen(props: { openSession: (url: string, title: string, subtitle: string) => void }): React.JSX.Element {
  const [spin] = useState(new Animated.Value(0));
  useEffect(() => {
    const a = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [spin]);
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View>
      <Card style={g.aboutHero} glow={C.green}>
        <Animated.View style={{ transform: [{ rotate: rot }] }}>
          <View style={g.aboutRing}>
            <View style={g.aboutCore} />
          </View>
        </Animated.View>
        <Text style={g.aboutTitle}>GIECKO</Text>
        <Text style={g.aboutSub}>GitHub Actions as a machine in your pocket</Text>
        <Divider />
        <KeyValue k="app" v={APP_VERSION} tint={C.green} />
        <KeyValue k="sessions" v="open in-app, never a browser" tint={C.cyan} />
        <KeyValue k="auth" v="no passwords inside the app" tint={C.purple} />
        <KeyValue k="parity" v="launch, ls, watch, logs, cancel, init, local, plugin, update, changelog, auth" tint={C.pink} />
        <KeyValue k="license" v="ISC" />
      </Card>
      <Card>
        <SectionLabel text="project home" />
        <Text style={g.hint}>github.com/Seigh-sword/Giecko - the same workflow, CLI and mobile client, all ISC licensed.</Text>
        <BigButton
          label="Open project README"
          variant="ghost"
          onPress={() => props.openSession('https://github.com/Seigh-sword/Giecko', 'Giecko on GitHub', 'project home')}
        />
      </Card>
    </View>
  );
}

function MoreScreen(props: { push: (r: Route) => void }): React.JSX.Element {
  const cells: [string, string, () => void][] = [
    ['ACCOUNTS', C.green, () => props.push({ s: 'accounts' })],
    ['SETUP', C.pink, () => props.push({ s: 'setup' })],
    ['LOCAL', C.amber, () => props.push({ s: 'local' })],
    ['PLUGINS', C.purple, () => props.push({ s: 'plugins' })],
    ['UPDATE', C.blue, () => props.push({ s: 'update' })],
    ['CHANGELOG', C.cyan, () => props.push({ s: 'changelog' })],
    ['ABOUT', C.text, () => props.push({ s: 'about' })],
  ];
  return (
    <View>
      <SectionLabel text="everything else" tint={C.purple} />
      <Card style={g.navGridCard}>
        <View style={g.navGrid}>
          {cells.map(([label, tint, fn]) => (
            <Pressable key={label} style={[g.navCell, { borderColor: tint + '66' }]} onPress={fn}>
              <Text style={[g.navCellText, { color: tint }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
      <Card>
        <Text style={g.hint}>Every CLI command has a home here: auth, init, launch, ls, watch, logs, cancel, local, update, plugin, changelog.</Text>
      </Card>
    </View>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForReport(repo: { slug: string; token: string }, runId: string, onPhase: (p: string) => void): Promise<string> {
  const deadline = Date.now() + 6 * 60 * 1000;
  let tick = 0;
  while (Date.now() < deadline) {
    const w = await pollReportOnce(repo, runId);
    if (w.found) return w.text;
    if (w.ended) return '';
    tick++;
    onPhase('poll ' + tick + ': run still booting (up to 6 min)');
    await sleep(10000);
  }
  return '';
}

function safeJson(text: string): Record<string, unknown> {
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const g = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  flex: {
    flex: 1,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  splashBrand: {
    color: C.green,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 8,
  },
  splashSub: {
    color: C.dim,
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    backgroundColor: C.bg2,
  },
  brand: {
    color: C.green,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: C.green + '88',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
    backgroundColor: C.green + '14',
  },
  accountPillText: {
    color: C.green,
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 14,
    paddingBottom: 40,
  },
  hero: {
    paddingTop: 22,
    paddingBottom: 18,
  },
  heroTitle: {
    color: C.dim,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 3,
  },
  heroTitle2: {
    color: C.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
  },
  heroSub: {
    color: C.green,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 2,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: C.bg2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    paddingVertical: 12,
  },
  heroStatNum: {
    color: C.green,
    fontSize: 22,
    fontWeight: '900',
  },
  heroStatLabel: {
    color: C.faint,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  hint: {
    color: C.dim,
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 4,
  },
  warnTitle: {
    color: C.amber,
    fontWeight: '800',
    letterSpacing: 1,
    fontSize: 13,
    marginBottom: 4,
  },
  warnText: {
    color: C.amber,
    fontSize: 12.5,
    marginTop: 6,
  },
  okText: {
    color: C.green,
    fontSize: 12.5,
    marginTop: 6,
  },
  errorText: {
    color: C.red,
    fontSize: 12.5,
    lineHeight: 18,
  },
  phaseText: {
    color: C.cyan,
    fontSize: 13,
    flex: 1,
    marginLeft: 8,
  },
  liveTitle: {
    color: C.green,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 2,
    flex: 1,
    marginLeft: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowGap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 6,
  },
  runCard: {
    paddingVertical: 12,
  },
  fieldMini: {
    color: C.faint,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  repoScroll: {
    marginBottom: 14,
  },
  repoChip: {
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginRight: 8,
    backgroundColor: C.bg2,
  },
  repoChipText: {
    color: C.dim,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  cmdBox: {
    backgroundColor: '#0a0f18',
    borderWidth: 1,
    borderColor: C.amber + '55',
    borderRadius: 10,
    padding: 12,
  },
  updateLabel: {
    color: C.faint,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  logCard: {
    backgroundColor: '#0a0f18',
    padding: 12,
  },
  logText: {
    color: C.dim,
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  navGridCard: {
    paddingBottom: 10,
  },
  navGridTitle: {
    color: C.faint,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  navCell: {
    width: '30.5%',
    aspectRatio: 1.35,
    borderWidth: 1.5,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg2,
  },
  navCellText: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  tabbar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: C.bg2,
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: C.green + '14',
  },
  tabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tabLabel: {
    color: C.faint,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tabLabelActive: {
    color: C.green,
  },
  webWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.bg,
    zIndex: 40,
  },
  webBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    backgroundColor: C.bg2,
  },
  webClose: {
    borderWidth: 1.5,
    borderColor: C.red + '99',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: C.red + '18',
  },
  webCloseText: {
    color: C.red,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
  },
  webTitleWrap: {
    flex: 1,
  },
  webTitle: {
    color: C.text,
    fontWeight: '800',
    fontSize: 14,
  },
  webSub: {
    color: C.dim,
    fontSize: 11,
  },
  web: {
    flex: 1,
    backgroundColor: C.bg,
  },
  webLoad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
  aboutHero: {
    alignItems: 'center',
    paddingTop: 26,
  },
  aboutRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutCore: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.green,
  },
  aboutTitle: {
    color: C.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 10,
    marginTop: 16,
  },
  aboutSub: {
    color: C.dim,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
});
