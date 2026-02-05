# PRD: UGC Factory Integration

**Status:** Done
**Priority:** High
**Created:** 2026-01-31
**Updated:** 2026-02-05
**Author:** Vincent (via Blaise)

---

## Problem

UGC (User-Generated Content) video creation requires multiple manual steps: writing a script, generating voiceover, creating motion video, and lip-syncing. This should be a one-click workflow.

## Solution

UGC Factory is now implemented as a **workflow JSON** in core (`core/packages/workflows/workflows/ugc-factory.json`), not a separate service. This leverages the existing node-based workflow system and can be executed via the web UI or the Telegram bot.

## Architecture Change

**Previous approach:** Separate UGC Factory service with custom processors, controllers, DTOs.

**Current approach:** Standard workflow JSON that chains existing node types:
```
Script (prompt) → Text-to-Speech (ElevenLabs) → Lip Sync → Download
Avatar Image (imageInput) → Motion Control ↗
```

### Workflow Nodes
| Node | Type | Purpose |
|------|------|---------|
| Script | `prompt` | UGC script text input |
| Avatar Image | `imageInput` | Face/person image for motion |
| Voice Over | `textToSpeech` | ElevenLabs TTS (configurable voice) |
| Avatar Motion | `motionControl` | Apply motion to avatar image |
| Lip Sync | `lipSync` | Sync avatar with voiceover |
| Download | `download` | Download final video output |

### Benefits of Workflow Approach
- Uses existing execution engine (no custom processors needed)
- Visible/editable in the web UI workflow editor
- Accessible via Telegram bot (auto-detects required inputs)
- Version-controlled as JSON
- Can be extended by users (add subtitles, upscale, etc.)

## Integration Points

- **Web UI:** Available in workflow templates list
- **Telegram Bot:** Listed as "UGC Factory" in /workflows command
- **API:** Executable via standard workflow execution endpoints

## Configuration Options (via node data)
- **Voice:** Any ElevenLabs voice (40+ options)
- **Lip Sync Model:** sync/lipsync-2, sync/lipsync-2-pro, pixverse/lipsync, etc.
- **Sync Mode:** loop, bounce, cut_off, silence, remap

## Implementation Status

- [x] UGC Factory workflow JSON created
- [x] Available in Telegram bot workflow list
- [x] Add to web UI workflow templates gallery
- [x] Multi-format support (16:9, 9:16, 1:1) — configurable via motionControl node aspectRatio
- [x] Batch generation — handled by BottomBar batch runner (1–10x)
