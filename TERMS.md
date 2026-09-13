# Giecko Terms of Use (v1)

Last updated: 2026-09-13

By launching a Giecko session you agree to the following:

1. GitHub rules apply. Sessions run on GitHub Actions runners, so the
   GitHub Terms of Service and Acceptable Use Policies apply in full.
   Do not mine cryptocurrency, attack other systems, host malware,
   spam, or run anything else GitHub prohibits.

2. Cloudflare rules apply. Tunnels run over Cloudflare's network, so the
   Cloudflare Terms of Service apply too.

3. Free tiers are shared. Giecko rides on free GitHub runner minutes and
   free Cloudflare tunnels. Keep sessions to what you actually need.
   Abusive usage patterns can get runners throttled or accounts flagged,
   for you and for everyone else.

4. Sessions are public by URL. Anyone holding a session URL reaches its
   login screen. Always set a strong password unless the session holds
   nothing you care about. Giecko is not responsible for sessions left
   unprotected.

5. Everything is ephemeral. Session disks are wiped when the session ends
   (at most ~6 hours). Use `giecko save` or autosave for backups, but keep
   anything important in real source control. Lost session data is not
   recoverable by us.

6. No warranty. Giecko is provided as-is, without warranty of any kind.
   It may break, lose data, or stop working if upstream providers change
   their terms, limits, or APIs.

7. Privacy. Session reports published to your own repository never contain
   passwords. With masking off, run reports, logs, and summaries in public
   repositories are visible to anyone, including tunnel URLs. Turn masking
   on (or use a private repository) if that bothers you.

Questions: open an issue on the Giecko repository.
