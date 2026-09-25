import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, View, Pressable, ActivityIndicator, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { dispatchSession, listRuns, parseSlug, RunInfo } from './api';

type Tab = 'guide' | 'launch' | 'sessions' | 'connect';

const COLORS = {
  bg: '#0b0e14',
  card: '#141a24',
  line: '#232c3b',
  text: '#e6edf3',
  dim: '#8b98a9',
  accent: '#3fb950',
};

const OS_CHOICES = ['ubuntu-latest', 'macos-latest', 'windows-latest'];
const STACK_CHOICES = ['ide', 'terminal', 'vscode', 'desktop'];

export default function App() {
  const [tab, setTab] = useState<Tab>('guide');
  const [repo, setRepo] = useState('Seigh-sword/Giecko');
  const [token, setToken] = useState('');
  const [os, setOs] = useState('macos-latest');
  const [stack, setStack] = useState('desktop');
  const [password, setPassword] = useState('');
  const [duration, setDuration] = useState('30');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [runs, setRuns] = useState<RunInfo[]>([]);
  const [sessionUrl, setSessionUrl] = useState('');

  async function launch() {
    setBusy(true);
    setMessage('');
    try {
      const note = await dispatchSession({ repo: { slug: repo, token }, os, stack, password, duration });
      setMessage(note + ' - open the Sessions tab, wait for it to go live, then check the run log for your URL');
    } catch (e: any) {
      setMessage(String(e && e.message ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  async function refreshRuns() {
    setBusy(true);
    setMessage('');
    try {
      const list = await listRuns({ slug: repo, token });
      setRuns(list);
      setMessage(list.length + ' runs');
    } catch (e: any) {
      setMessage(String(e && e.message ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'guide', label: 'Guide' },
    { id: 'launch', label: 'Launch' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'connect', label: 'Connect' },
  ];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.brand}>GIECKO</Text>
        <Text style={styles.sub}>GitHub Actions as a machine in your pocket</Text>
      </View>
      {tab === 'connect' ? null : (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {tab === 'guide' ? <Guide /> : null}
          {tab === 'launch' ? (
            <View>
              <Field label="Repository (owner/name)" value={repo} onChange={setRepo} placeholder="Seigh-sword/Giecko" />
              <Field label="GitHub token (workflow scope)" value={token} onChange={setToken} placeholder="ghp_..." secret />
              <Chips label="Runner OS" choices={OS_CHOICES} value={os} onPick={setOs} />
              <Chips label="Stack" choices={STACK_CHOICES} value={stack} onPick={setStack} />
              <Field label="Session password (blank = open)" value={password} onChange={setPassword} placeholder="1234" secret />
              <Field label="Duration in minutes (max 360)" value={duration} onChange={setDuration} placeholder="30" />
              <Button label={busy ? 'Working...' : 'Launch session'} onPress={launch} disabled={busy} />
              <Msg text={message} />
            </View>
          ) : null}
          {tab === 'sessions' ? (
            <View>
              <Button label={busy ? 'Working...' : 'Refresh runs'} onPress={refreshRuns} disabled={busy} />
              <Msg text={message} />
              {runs.map((r) => (
                <Pressable key={r.id} style={styles.runRow} onPress={() => Linking.openURL(r.html_url)}>
                  <Text style={styles.runId}>#{r.id}</Text>
                  <Text style={styles.runStatus}>
                    {r.status}
                    {r.conclusion ? ' / ' + r.conclusion : ''}
                  </Text>
                  <Text style={styles.runDate}>{r.created_at}</Text>
                </Pressable>
              ))}
              {runs.length === 0 ? <Text style={styles.dim}>No runs loaded yet.</Text> : null}
            </View>
          ) : null}
        </ScrollView>
      )}
      {tab === 'connect' ? (
        sessionUrl ? (
          <View style={styles.webWrap}>
            <TextInput
              style={styles.urlBox}
              value={sessionUrl}
              onChangeText={setSessionUrl}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => setSessionUrl(sessionUrl.trim())}
            />
            <WebView source={{ uri: normalizeUrl(sessionUrl) }} style={styles.web} />
          </View>
        ) : (
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <Field label="Session URL (terminal or desktop)" value={sessionUrl} onChange={setSessionUrl} placeholder="https://something.trycloudflare.com" />
            <Text style={styles.dim}>
              Paste the URL from the run log (Actions tab, the GIECKO IS LIVE banner) and it opens right here. The desktop URL ends with /vnc.html, the terminal with /tty.
            </Text>
          </ScrollView>
        )
      ) : null}
      <View style={styles.tabbar}>
        {tabs.map((t) => (
          <Pressable key={t.id} style={[styles.tab, tab === t.id ? styles.tabActive : null]} onPress={() => setTab(t.id)}>
            <Text style={[styles.tabLabel, tab === t.id ? styles.tabLabelActive : null]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function normalizeUrl(u: string): string {
  const t = u.trim();
  if (!t) {
    return 'about:blank';
  }
  return t;
}

function Guide() {
  return (
    <View>
      <Text style={styles.h}>What is Giecko?</Text>
      <Text style={styles.p}>
        Giecko turns a GitHub repository into a full dev environment you can open from anywhere: a terminal, VS Code and a whole desktop, running on GitHub Actions runners, reachable through a Cloudflare tunnel.
      </Text>
      <Text style={styles.h}>How to use this app</Text>
      <Text style={styles.p}>1. Create a GitHub token with the workflow scope (Settings, Developer settings, Personal access tokens).</Text>
      <Text style={styles.p}>2. Open the Launch tab, pick the repo, runner OS and stack, set a password and duration.</Text>
      <Text style={styles.p}>3. Launch. The runner boots your session in about a minute.</Text>
      <Text style={styles.p}>4. Open the run in the Sessions tab and read the GIECKO IS LIVE banner for your private URL.</Text>
      <Text style={styles.p}>5. Paste the URL in the Connect tab to use the session inside the app.</Text>
      <Text style={styles.h}>Logins</Text>
      <Text style={styles.p}>Terminal: your username and the session password. Desktop on macOS: the session username and the full password. Desktop on Windows and Linux: the first 8 characters of the password.</Text>
      <Text style={styles.h}>Also available</Text>
      <Text style={styles.p}>The CLI (npm i -g giecko), the browser, and tiny-giecko, a portable C client that runs on nearly anything with a screen, from a Raspberry Pi Zero up.</Text>
      <Text style={styles.dim}>Session duration is capped at 6 hours by GitHub. Everything you save with giecko save lives in your repo.</Text>
    </View>
  );
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; placeholder: string; secret?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChange}
        placeholder={props.placeholder}
        placeholderTextColor={COLORS.dim}
        secureTextEntry={!!props.secret}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

function Chips(props: { label: string; choices: string[]; value: string; onPick: (v: string) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <View style={styles.chips}>
        {props.choices.map((c) => (
          <Pressable key={c} style={[styles.chip, props.value === c ? styles.chipActive : null]} onPress={() => props.onPick(c)}>
            <Text style={[styles.chipLabel, props.value === c ? styles.chipLabelActive : null]}>{c}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Button(props: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable style={[styles.button, props.disabled ? styles.buttonDisabled : null]} onPress={props.onPress} disabled={props.disabled}>
      {props.disabled ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.buttonLabel}>{props.label}</Text>}
    </Pressable>
  );
}

function Msg(props: { text: string }) {
  if (!props.text) {
    return null;
  }
  return <Text style={styles.msg}>{props.text}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingTop: 48, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  brand: { color: COLORS.accent, fontSize: 24, fontWeight: '700', letterSpacing: 2 },
  sub: { color: COLORS.dim, fontSize: 12, marginTop: 2 },
  body: { flex: 1 },
  bodyContent: { padding: 16 },
  h: { color: COLORS.text, fontSize: 17, fontWeight: '700', marginTop: 18, marginBottom: 6 },
  p: { color: COLORS.text, fontSize: 14, lineHeight: 21, marginBottom: 8 },
  dim: { color: COLORS.dim, fontSize: 12, lineHeight: 18, marginTop: 8 },
  field: { marginBottom: 14 },
  label: { color: COLORS.dim, fontSize: 12, marginBottom: 6 },
  input: { backgroundColor: COLORS.card, borderColor: COLORS.line, borderWidth: 1, borderRadius: 8, color: COLORS.text, paddingHorizontal: 12, paddingVertical: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: COLORS.card, borderColor: COLORS.line, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { borderColor: COLORS.accent, backgroundColor: '#12261a' },
  chipLabel: { color: COLORS.text, fontSize: 12 },
  chipLabelActive: { color: COLORS.accent },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonLabel: { color: '#04140a', fontSize: 15, fontWeight: '700' },
  msg: { color: COLORS.dim, fontSize: 12, marginTop: 12, lineHeight: 18 },
  runRow: { backgroundColor: COLORS.card, borderColor: COLORS.line, borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  runId: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  runStatus: { color: COLORS.accent, fontSize: 12, flex: 1 },
  runDate: { color: COLORS.dim, fontSize: 11 },
  tabbar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.line, backgroundColor: COLORS.card },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.accent },
  tabLabel: { color: COLORS.dim, fontSize: 13 },
  tabLabelActive: { color: COLORS.accent, fontWeight: '700' },
  webWrap: { flex: 1 },
  urlBox: { backgroundColor: COLORS.card, color: COLORS.text, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.line, fontSize: 12 },
  web: { flex: 1, backgroundColor: COLORS.bg },
});
