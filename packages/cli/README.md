# @genfeedai/cli

CLI tool to download and manage Genfeed workflow templates.

## Installation

```bash
# Run directly with npx (recommended)
npx @genfeedai/cli

# Or install globally
npm install -g @genfeedai/cli
```

## Commands

### List workflows

```bash
npx @genfeedai/cli list
```

Shows all available workflow templates organized by category.

### Get workflow info

```bash
npx @genfeedai/cli info <workflow-name>
```

Shows detailed information about a specific workflow, including:
- Description and metadata
- Node and edge counts
- Workflow structure (inputs/outputs)

### Download a workflow

```bash
npx @genfeedai/cli add <workflow-name>
```

Downloads a workflow template to your local workflows directory.

**Options:**
- `-f, --force` - Overwrite existing workflow without prompting
- `-o, --output <path>` - Custom output path for the workflow file

## Workflow Directory

The CLI saves workflows to a directory determined by this priority:

1. `GENFEED_DATA_DIR` environment variable
2. `workflowsDir` setting in `genfeed.config.json` or `.genfeedrc`
3. Project's `./data/workflows` directory (if package.json exists)
4. `~/.local/share/genfeed/workflows` (XDG)
5. `~/.genfeed/workflows` (fallback)

## Available Workflows

| Workflow | Category | Description |
|----------|----------|-------------|
| `single-image` | image | Generate an AI image from a source image |
| `single-video` | video | Generate an AI video from a source image |
| `image-series` | image | Generate a series of related images using LLM expansion |
| `image-to-video` | video | Create interpolated video between two images |
| `full-pipeline` | full-pipeline | Complete workflow: concept → images → videos → output |

## Examples

```bash
# List all available workflows
npx @genfeedai/cli list

# Get details about the single-image workflow
npx @genfeedai/cli info single-image

# Download the single-image workflow
npx @genfeedai/cli add single-image

# Download to a specific location
npx @genfeedai/cli add single-image --output ./my-workflows/starter.json
```

## Configuration

Create a `genfeed.config.json` or `.genfeedrc` file to customize the CLI:

```json
{
  "workflowsDir": "./my-workflows"
}
```

## License

AGPL-3.0
