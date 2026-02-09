# Subagent Automation

Rules for when Claude should automatically spawn subagents. Only spawn subagents when the user has explicitly requested an action — do not spawn preemptively during research, planning, or informational queries.

## Before Implementation
When the user has asked to implement a change, spawn an Explore agent to understand existing codebase patterns before writing code.

## After Code Changes
When implementation is complete and the user has asked for a commit, spawn a code-reviewer agent before creating the commit.

## Research Tasks
When the user has asked for an investigation and 3+ files need review, use parallel Explore agents to cover them efficiently.

## Before Completion
Before marking a user-requested task as done, spawn a verification agent to confirm correctness.
