# Security Policy

## Supported Versions

Security fixes target the current `master` branch. Installs made with `npx skills` or the Claude Code plugin pick
them up on the next update.

## Reporting a Vulnerability

Please do not open a public issue for suspected vulnerabilities.

Report security concerns privately through GitHub's
[private vulnerability reporting](https://github.com/lezli01/skills/security/advisories/new) for this repository, or
by contacting the maintainer through the maintainer's GitHub profile.

Include:

- The affected skill and file.
- A clear description of the vulnerability.
- Steps to reproduce, including the agent and the prompt used, if safe to share.
- Any known impact or mitigation.

## Response Expectations

The maintainer will try to acknowledge valid reports within 7 days, then coordinate a fix and disclosure plan based
on severity and project capacity.

## Security Principles

Skills run inside agents that can read files and execute commands, so every skill must:

- Keep data local: nothing is sent to a network service unless that is the skill's documented purpose.
- Ship its scripts in the repo, so they can be reviewed, instead of downloading and running code at runtime.
- Contain no secrets or credentials, and never ask the agent to reveal them.
- Document every external tool, service, or permission it needs in its README.
