# <img src="https://cdn.simpleicons.org/linux/3FB950" width="28" valign="middle"> The Sudo Mystery

![status](https://img.shields.io/badge/status-SOLVED-3FB950?labelColor=0B111C&style=flat-square)
![cause](https://img.shields.io/badge/cause-shadow_field_!-3FB950?labelColor=0B111C&style=flat-square)
![glitch](https://img.shields.io/badge/glitch-no-3FB950?labelColor=0B111C&style=flat-square)
![fix](https://img.shields.io/badge/fix-c7177a1-3FB950?labelColor=0B111C&style=flat-square)

> The case of the password that never existed: a session user typed
> `sudo`, got asked for a password, typed **nothing**, pressed
> Enter — and was refused. If there is no password, why doesn't
> empty work? This page is the full investigation, the controlled
> experiment, and the answer.

## The incident

| When | What happened |
|---|---|
| 0.7.0 ships | sessions run as a real OS account, created at boot with `useradd` |
| the session | user types `sudo`, gets `[sudo] password for …:`, tries nothing + Enter |
| the result | `Sorry, try again.` — three times, then `sudo: 3 incorrect password attempts` |
| the question | "you told me there is no password — so why is Enter wrong?" |
| the fix | commit `c7177a1` grants the session user passwordless sudo; the prompt never appears again |
| this page | why Enter could never have worked, proven live |

The mystery in one line: **"no password set" and "the password is
empty" are two different states of `/etc/shadow`**, and the session
account was in the first one — the one where *no answer is correct,
including silence*.

## The reproduction

A control box (Debian 12, the same `shadow-utils` family as the
Ubuntu runners) and a fresh account, created exactly the way the
boot script creates yours:

```
useradd -m -s /bin/bash gkmystery
grep '^gkmystery:' /etc/shadow | cut -d: -f1-2
gkmystery:!
```

One character in the password field: `!`.

**Attempt A — locked account, nothing + Enter (your exact move):**

```
[sudo] password for gkmystery: Sorry, try again.
[sudo] password for gkmystery:
sudo: no password was provided
sudo: 1 incorrect password attempt
```

**Attempt C — locked account, a wrong real password (`hunter2`):**

```
[sudo] password for gkmystery: Sorry, try again.
```

Identical response. sudo cannot tell "you typed nothing" from "you
typed hunter2" — both are merely wrong answers to a question that
has no right answer.

**Attempt D — the counterfactual: a truly empty password**
(`passwd -d`, which writes an empty field):

```
gkmystery is not in the sudoers file.
```

No prompt. Not even a "password:" question — the empty input
**authenticated silently** (Debian and Ubuntu ship `pam_unix` with
`nullok`, which honors empty passwords), and the run only died
later, at the sudoers check. This is the proof: *empty is a real,
answerable state — and press-Enter genuinely works in it.*

**Attempt E — re-lock the account** (`passwd -l`, field becomes
`!` again): the prompt returns, Enter fails again.

## The answer

`/etc/shadow`'s second field is not "the password" — it is
"whatever the answer must hash to", and it has more states than
people expect:

| Field | Meaning | Can any input pass? | Enter-only works? |
|---|---|---|---|
| `$6$…`, `$y$…` | a real hash | exactly one string | no |
| *(empty)* | empty password is set | the empty string, where `pam_unix` has `nullok` | **yes** |
| `!` | **locked** — what `useradd` writes for a brand-new account, and what `passwd -l` writes | **nothing, ever** | no |
| `!!` | "never set" — the Red Hat family spelling of the same idea | nothing, ever | no |
| `*` | no valid password, not locked (classic system accounts like `daemon`) | nothing, ever | no |

Your account was `!`. You read "there is no password" as *the
password is the empty string* — the second row. The account was
actually in the third row: *a deliberate refusal to have a
password at all*. `!` is not the hash of anything, not even of
nothing.

And why did it ask at all, if no answer could exist? sudo hands
authentication to PAM, and `pam_unix` does one job: hash what you
typed and compare it to the stored field. It does not peek at the
field first and say "don't bother asking". So it asked, you
answered, the comparison failed — a **dead prompt**: a question
whose correct answer does not exist. It looks exactly like a
glitch. It is documented, deterministic behavior.

There was a second wall behind the first, by the way: attempt D
shows that even a *correct* authentication ended in `gkmystery is
not in the sudoers file` — before the fix, the session user had no
sudo rights either. The prompt was unanswerable **and** the door
beyond it was closed.

## Same prompt, other runner OSes

| Runner | What the session account had | Enter works? |
|---|---|---|
| Ubuntu/Debian (default) | locked field `!` | no — this incident |
| macOS | a real password: the web login password (boot set it via `sysadminctl`) | no — but the prompt was answerable until the fix removed it |
| Windows | no unix sudo at all | the question never comes up |

## The fix

Not "tell everyone the password" — there was nothing to tell. The
fix removed the dead prompt entirely: boot now grants the session
user passwordless sudo through a `visudo`-validated
`/etc/sudoers.d` entry ([Security](Security.md)), distro containers
get the same grant, and the report carries a `- sudo:` fact line.
On an ephemeral runner you already own, asking for a password that
cannot exist was the bug.

## Lessons

- **Locked is not empty.** `useradd` has locked new accounts by
  design for decades: an account is supposed to get a real
  password, an SSH key, or a sudoers grant — never to sit
  remotely reachable with a password anyone can type by pressing
  Enter. The safe default is only surprising when something asks
  it for a password anyway.
- **A prompt that cannot be answered is indistinguishable from a
  glitch.** The way out is not a better answer — it is not asking.
- The bug was found by a human pressing Enter in exactly the state
  no automated test had covered. Reproduction took one `useradd`
  and two minutes; the explanation took a shadow field.

---

**Verdict: mystery solved.** It was never a glitch, and the
password was never "nothing" — it was `!`, one character that
refuses every answer, including yours.

← [FAQ](FAQ.md) · [Security](Security.md) · [Home](Home.md)
