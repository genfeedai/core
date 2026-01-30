# Task Management

Task tracking for the content-workflow project. Compatible with Kaiban Board VS Code extension.

## Task Files

Tasks are stored as individual markdown files in this directory. Each task file follows the Kaiban Board format.

## Task Format

Tasks must follow this format (compatible with Kaiban Board extension):

```markdown
## Task: [Task Title]

**ID:** task-id
**Label:** [Task Title]
**Description:** Brief description of the task
**Type:** Feature|Bug|Enhancement|Research
**Status:** Backlog|To Do|Doing|Testing|Done|Blocked
**Priority:** High|Medium|Low
**Order:** 1 (optional)
**Created:** YYYY-MM-DD
**Updated:** YYYY-MM-DD
**PRD:** [Link](../PRDS/file.md)

---

## Additional Notes

[Additional details, subtasks, acceptance criteria, etc.]
```

### Required Fields

- `ID`: Unique identifier (e.g., `task-001`, `feature-auth`)
- `Label`: Task title
- `Type`: One of `Feature`, `Bug`, `Enhancement`, or `Research`
- `Status`: One of `Backlog`, `To Do`, `Doing`, `Testing`, `Done`, or `Blocked`
- `Priority`: One of `High`, `Medium`, or `Low`
- `Created` & `Updated`: Dates in `YYYY-MM-DD` format

### Optional Fields

- `Description`: Brief task description
- `PRD`: Link to PRD file (relative path from task file)
- `Order`: Numeric value for custom task ordering within each column

## Quick Capture

Use `INBOX.md` for quick task capture. Process into proper task files regularly.

---

**Last Updated:** 2026-01-14
