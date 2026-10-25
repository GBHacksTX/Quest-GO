# QuestGo Agent Guidelines

## 1. Project Objective

QuestGo turns real-world proximity into intentional social interaction by using nearby devices to trigger a shared activity that users can complete together.

The hackathon objective is to build a reliable end-to-end experience where:

```text
proximity detected
    ↓
encounter created
    ↓
shared quest created
    ↓
participants receive the same quest
    ↓
participants accept
    ↓
activity begins
    ↓
participants verify completion
    ↓
engagement / streak updates
```

The core experience must remain understandable, reliable, and easy to demonstrate.

---

## 2. Documentation Is the Current Source of Truth

Before implementing a feature, read the relevant documentation.

- `PRODUCT.md` → current product behavior and user flows
- `DOMAIN.md` → current domain objects, relationships, and business concepts
- `ARCHITECTURE.md` → current technical stack and system architecture
- `DATABASE.md` → database implementation when defined
- `TASKS.md` → current work, ownership, and priorities

Documentation describes the current system, not an immutable specification.

If implementation changes an important documented behavior, architecture decision, or domain concept, update the relevant documentation in the same logical change.

---

## 3. Scope Rules

QuestGo is currently a hackathon project.

Prioritize:

1. working end-to-end behavior
2. reliability
3. understandable code
4. good user experience
5. additional features

Prefer the simplest solution that correctly solves the current problem.

Do not:

- overengineer
- introduce unnecessary abstractions
- build infrastructure for hypothetical scale
- create speculative features
- introduce services without a concrete need
- refactor unrelated code while implementing a feature
- expand the requested scope without a clear product reason

Do not sacrifice reasonable extensibility merely to save a few lines of code.

---

## 4. Architecture Discipline

The technology stack is allowed to evolve.

Do not assume a technology solely because it was previously discussed. Read `ARCHITECTURE.md` before making architectural decisions.

Agents may propose architectural changes when there is a clear reason.

Do not silently:

- replace major technologies
- introduce major dependencies
- create new services
- change communication patterns
- change hosting or persistence strategy

When a major architectural decision changes:

1. make the change intentionally
2. verify that it solves a real requirement
3. update `ARCHITECTURE.md`
4. include the documentation change in the same logical commit

---

## 5. Domain Model Rules

`DOMAIN.md` represents the current understanding of QuestGo's domain.

It is intentionally evolutionary.

Do not treat existing domain objects as permanent constraints.

When product requirements reveal that the current model is insufficient:

- improve the model
- update affected code
- update `DOMAIN.md`
- keep those changes together

Prefer extending or refactoring the model for a clear product requirement rather than forcing new behavior into an outdated abstraction.

Do not add domain objects, fields, relationships, or states solely because they might be useful someday.

Model what QuestGo currently needs while avoiding obvious assumptions that would make reasonable extensions unnecessarily difficult.

---

## 6. Core Product Invariants

Unless `PRODUCT.md` explicitly changes these rules:

- a proximity event may create an encounter
- participants in the same activity must reference the same shared quest/session
- required participants must accept before the activity begins
- completion requires the required participant confirmations
- successful completion may update streaks or engagement state
- duplicate proximity signals should not continuously create duplicate encounters

Implementation details may change. These behaviors should not change accidentally.

---

## 7. Coding Rules

Before editing:

1. inspect the relevant files
2. understand the existing implementation
3. identify the smallest coherent change

While implementing:

- use TypeScript types where applicable
- use descriptive names
- keep responsibilities clear
- reuse existing components and utilities when appropriate
- avoid duplicating business logic
- avoid premature abstractions
- prefer readable code over clever code
- keep functions and components reasonably focused
- follow existing project conventions unless there is a reason to improve them
- do not rewrite working unrelated code

If an existing abstraction makes the requested feature significantly harder or incorrect, it may be refactored intentionally.

---

## 8. Security Rules

Never commit:

- passwords
- API keys
- OAuth secrets
- database credentials
- private tokens
- `.env` files containing secrets

Use environment variables for credentials and secrets.

External identity providers handle their own user passwords. QuestGo must not store OAuth provider passwords.

Treat user input, hardware-originated data, and external service responses as untrusted input where appropriate.

Do not expose server-only secrets to client-side code.

---

## 9. Database Rules

When database implementation exists:

- treat schema changes as intentional changes
- use migrations where supported
- do not silently rename or remove persisted fields
- preserve data relationships and integrity
- update `DATABASE.md` when schema or persistence behavior changes

`DOMAIN.md` defines what concepts mean.

`DATABASE.md` defines how those concepts are currently persisted.

Do not force the domain model to mirror database tables one-to-one.

---

## 10. Validation Rules

Before considering a meaningful change complete:

- verify the relevant behavior
- run applicable type checks
- run applicable tests
- run the application build when reasonable
- inspect for obvious regressions
- check that changed documentation still matches implementation

Do not knowingly commit a broken application state unless explicitly requested for a specific reason.

---

## 11. Git Rules

The user creates all commits. Agents must leave staging and committing to the user and always provide a suggested Conventional Commit message. Do not run a merge or rebase operation that creates commits on the user's behalf; provide the integration commands for the user to run.

Commits must be intentional and logically scoped.

A commit should tell one understandable story.

Each commit should represent:

- one coherent feature
- one coherent fix
- one coherent refactor
- or one coherent documentation change

Do not combine unrelated work into one commit.

Do not create a commit for every tiny edit.

A feature may touch several files. That is still one logical commit when every change contributes to the same behavior.

### Before Committing

Always inspect:

```bash
git status
git diff
```

When appropriate, inspect staged changes separately:

```bash
git diff --staged
```

Confirm that:

- only intended files are included
- unrelated changes are not staged
- secrets are not present
- temporary/debug files are not included
- the commit represents one coherent change

---

## 12. Merge Safety

Assume multiple people and agents may be working on the repository simultaneously.

Design and implement changes to minimize merge conflicts.

### Before Starting Work

Synchronize with the current branch before making substantial changes.

Inspect:

```bash
git status
git branch --show-current
git log --oneline -5
```

Do not begin by rewriting files that another contributor may be actively modifying unless the task requires it.

### Feature Branch and Integration Workflow

1. Start each feature on its own `feat/<feature-name>` branch from the current `main`. Record the branch in `TASKS.md`. Do not implement features directly on `main`.
2. Implement and validate the feature on that branch. Give the user the commit message and let them stage and commit the work.
3. After the feature is committed, preserve its branch and commits exactly as they are. Keep the branch after integration; do not rebase, squash, merge into, reset, or delete it.
4. For integration, provide commands to create a separate `integration/<feature-name>` branch at the feature branch's tip and rebase that copy onto the latest `main`. Resolve any conflicts on the integration copy and validate the result.
5. Squash merge the integration copy into `main` so the feature becomes one commit on `main`. The user runs the integration commands and creates the final commit using the supplied message.
6. Keep the original `feat/<feature-name>` branch unchanged. Start the next feature from the updated `main`.

Rebasing the integration copy provides an up-to-date result while preserving the original feature history. Only begin integration with committed work and a clean working tree; never carry unrelated edits between branches.

### Keep Changes Localized

Prefer:

```text
new feature
    ↓
small number of relevant files
```

Avoid:

```text
new feature
    ↓
unrelated refactors across the repository
    ↓
formatting unrelated files
    ↓
renaming unrelated components
```

Do not make repository-wide formatting or cleanup changes while implementing an unrelated feature.

Do not reorder imports, rename variables, restructure directories, or reformat files unless necessary for the task.

These changes create unnecessary merge conflicts.

### Avoid Shared Hotspots

When possible:

- create focused components instead of making one massive shared component larger
- place feature-specific logic in feature-specific modules
- avoid putting unrelated logic into central files
- avoid unnecessary edits to global configuration files
- avoid repeatedly modifying large shared files when a smaller module can contain the behavior

Do not create abstractions solely to avoid merge conflicts, but prefer clear module boundaries when they naturally fit the design.

### Preserve Other Work

If existing uncommitted changes are present and they are not yours:

- do not delete them
- do not reset them
- do not overwrite them
- do not stage them
- do not include them in your commit

Only modify another contributor's work when it is required for the requested feature.

### Before Committing

Check whether your branch has moved behind the shared branch when appropriate.

If upstream changes exist, integrate them carefully before publishing work.

Resolve conflicts based on the intended behavior of both changes. Do not automatically choose one side of a conflict without understanding it.

After resolving a conflict:

- inspect the resulting code
- remove conflict markers
- run relevant validation again
- inspect the final diff

Never leave:

```text
<<<<<<<
=======
>>>>>>>
```

in committed files.

### Shared Files

Files such as these may become common conflict points:

```text
package.json
package-lock.json
ARCHITECTURE.md
DOMAIN.md
DATABASE.md
global styles
shared layouts
central configuration
```

Modify them only when the task actually requires it.

If adding a dependency, avoid unrelated dependency updates.

### Git History Safety

Do not:

- force push
- rewrite shared history
- delete shared branches
- reset another contributor's commits
- amend another contributor's published commit
- perform destructive rebases

unless explicitly instructed.

### Commit Early at Logical Boundaries

Do not hold several independent completed features in one uncommitted working tree.

Once a coherent feature is working and validated, give the user a commit message and leave committing to them before beginning an unrelated feature.

This reduces both merge risk and accidental mixing of work.

The goal is not to maximize the number of commits.

The goal is to create **small, coherent integration points**.

---

## 13. Commit Message Style

Use Conventional Commit-style messages:

```text
type(scope): concise description
```

The scope is optional.

Preferred types:

```text
feat      new feature or user-facing capability
fix       bug fix
refactor  internal restructuring without changing behavior
docs      documentation-only change
test      test additions or changes
chore     tooling, configuration, dependencies, or maintenance
style     formatting-only changes
perf      performance improvement
```

Examples:

```text
feat(auth): add Google OAuth login
feat(quests): add mutual quest acceptance
fix(encounters): prevent duplicate proximity events
refactor(domain): separate quest from quest session
docs: add initial architecture documentation
test(quests): add completion flow tests
chore: configure TypeScript paths
```

Rules:

- use lowercase commit types
- use imperative, concise descriptions
- do not end the subject with a period
- describe the logical change, not merely the files changed
- avoid vague messages such as `update`, `changes`, `fix stuff`, or `progress`
- one commit should represent one coherent change
- use a scope when it makes the affected area clearer
- do not force a scope when unnecessary
- documentation changes required by a feature should normally remain in the feature commit

---

## 14. Agent Workflow

For every implementation task:

```text
Understand request
      ↓
Read relevant documentation
      ↓
Inspect repository and current Git state
      ↓
Create feat/<feature-name> branch from current main
      ↓
Identify smallest coherent solution
      ↓
Implement localized changes
      ↓
Validate
      ↓
Review git diff
      ↓
Update documentation if required
      ↓
Provide commit message; user stages and commits
      ↓
Provide integration-copy rebase and squash-merge commands
      ↓
User integrates into main; original feature branch stays unchanged
```

Do not jump directly from a prompt to large-scale code generation without inspecting the repository.

---

## 15. Change Reporting

After completing work, report:

- what was implemented
- files materially changed
- important architectural/domain decisions
- validation performed
- feature branch and suggested commit message
- integration status and any commands the user still needs to run
- unresolved blocker, if any

Keep the report concise.

---

## 16. Definition of Done

A task is complete when:

- requested behavior works
- code is understandable
- relevant validation passes
- no obvious unrelated behavior was broken
- documentation reflects meaningful changes
- secrets are not committed
- the changes are ready for a coherent commit, with its message supplied to the user
- unrelated contributor changes were preserved
- the change is reasonably isolated to reduce future merge conflicts

A feature being technically possible is not enough. It should be in a state another teammate or agent can understand, integrate, and continue from.

Report implementation readiness separately from integration. A feature is integrated only after the user has completed the squash merge into `main`; preserve its original feature branch afterward.
