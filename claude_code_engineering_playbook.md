# Claude Code Engineering Playbook

## Core Philosophy
- You are the planner. Claude is the executor.
- Never start with "build the app".
- Always: Plan → Build → Verify → Iterate.
- Optimize for a working demo, not perfection.

---

## Standard Project Workflow

### Phase 0: Scope the Idea
- One clear user
- One core flow
- One wow moment
- Must be demoable even if 60% complete

### Phase 1: Create Project Files

#### spec.md
- Problem
- User
- Core flow
- Success criteria
- Non-goals

#### CLAUDE.md
- Stack
- Commands
- Rules (small scope, no extra features)
- Testing expectations

#### PROJECT_STATE.md
- Current milestone
- Done criteria
- Constraints
- Next 3 tasks
- Known blockers

---

## Claude Code Usage Pattern

### Step 1: Plan First
Prompt:
"Read spec.md and CLAUDE.md. Do not code yet.
Propose smallest MVP. Break into steps. Identify risks."

### Step 2: Build in Small Steps
- One task per prompt
- Never multiple features

Example:
"Implement only static UI shell. No backend."

### Step 3: Always Verify
After each step:
- Run app
- Test happy path
- Check output
- Fix immediately

---

## Build Order (Golden Sequence)
1. Static UI
2. Mocked happy path
3. End-to-end demo works
4. Real integrations
5. Validation & error handling
6. Polish

---

## Happy Path Definition
The single ideal user flow where everything works.

Ignore edge cases until this works.

---

## Prompting Best Practices

### Good Prompt
- Clear scope
- One task
- Constraints
- Verification instructions

### Bad Prompt
- "Build everything"
- Vague goals
- Multiple systems at once

---

## Validation Strategy
Always include:
- Schema validation
- Output checks
- Fallback handling

Example checks:
- JSON valid
- Constraints met
- Required fields present

---

## Timeboxing Rules
- UI bug: 20 min
- API bug: 30 min
- Infra issue: 30 min

If exceeded:
- Simplify
- Mock
- Fallback

---

## Fallback Strategy
Every feature must have fallback.

Examples:
- API fails → mock response
- AR fails → overlay preview
- Model fails → sample output

---

## Multi-Agent System Design

### Core Rule
Few agents, clear roles.

### Recommended Agents (max 5)
1. Planner
2. Builder
3. Debugger
4. Reviewer
5. Ops

### Orchestrator Responsibilities
- Track milestone
- Assign tasks
- Maintain state
- Final decisions

### Anti-patterns
- Multiple agents editing same code
- No shared state
- Overlapping roles

---

## Session Management
- Use fresh sessions for new tasks
- Avoid long messy threads
- Reset when output quality drops

---

## Review Loop
After milestone:
Prompt:
"Act as senior engineer. Find top 5 issues only."

---

## AR / Advanced Features Strategy

### Always Layer Features
1. Core product works
2. Add preview mode
3. Add real feature (AR, etc.)

### Never Start With
- AR
- Complex integrations
- Multi-system architecture

---

## Personal Discipline Rules
- Never skip planning
- Never build multiple features at once
- Always verify before moving on
- Always define "done"
- Always have fallback

---

## Weekly Project Structure

### Weekend 1
- MVP complete
- Demo ready

### Weekend 2
- Add advanced feature (AR, AI upgrade, etc.)

---

## Key Mindset Shift

Old:
"Can Claude build this?"

New:
"How do I structure this so Claude cannot fail?"

---

## End Goal

Become a system designer, not just a coder.

Claude is your execution engine.
You are the architect.

