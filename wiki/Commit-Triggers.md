# <img src="https://cdn.simpleicons.org/git/3FB950" width="28" valign="middle"> Commit Triggers

![how](https://img.shields.io/badge/how-tags_in_commit_messages-3FB950?labelColor=0B111C&style=flat-square)

> Push to the session branch and the message itself configures the
> smoke session — no form, no CLI, just a commit.

## Session triggers (`giecko.yml`)

Every push to the branch boots a session. The message shapes it:

| Tag | Effect |
|---|---|
| `[d=1]` | 1-minute session (quick smoke) |
| `[quick]` | 0-minute (boot and shut down immediately) |
| *(none)* | 10-minute session |
| `[noauth]` | no password — **open session** |
| *(none)* | test password `test-gieko-123` |
| `[stack=terminal]` `[stack=vscode]` `[stack=desktop]` | pick the stack (else `ide`) |
| `[distro=alpine]` `[distro=arch]` `[distro=fedora]` `[distro=ubuntu]` `[distro=debian]` | pick the distro (else `runner`) |
| `[os=macos]` `[os=windows]` | pick the runner OS (else ubuntu) |
| `[mask]` | mask mode on |
| `[skip giecko]` | no session at all for this push |

Example — a 1-minute masked alpine terminal smoke:

```text
fix the alpine boot path [d=1] [stack=terminal] [distro=alpine] [mask]
```

Push sessions always run with autosave off and the default user.

## Build triggers

| Tag | Workflow | What runs |
|---|---|---|
| `[mobile]` | mobile | Android APK build; attaches to the latest release |
| `[tiny]` | tiny-giecko | the whole cross-compile matrix + tests |
| `[release]` | ide | builds terminal + IDE bundles for all targets, uploads to the `v<version>` release |
| `[skip ide]` | ide | skip the ide build even if build files changed |

## Tag pushes (`v*`)

Pushing a `v*` tag runs the mobile and tiny-giecko pipelines for that
tag. **Note:** releases created by a workflow (via `GITHUB_TOKEN`) do
not fire tag events — GitHub's anti-recursion rule — which is why the
`[mobile]` attach-to-latest-release path exists.

## Combining

Tags stack freely in one message; they are just `contains()` checks:

```text
GIECKO 0.7.1 [release] [mobile] [d=1]
```

builds + uploads everything, and still runs a 1-minute session smoke.

## Why this exists

The agent/maintainer loop: push, watch CI boot a real session with the
change, read the report — no dispatch permissions needed. It is the
same convention the repository's own development uses (see
[Development](Development.md)).

---

← [Workflow Inputs](Workflow-Inputs.md) · [Releases](Releases.md) →
