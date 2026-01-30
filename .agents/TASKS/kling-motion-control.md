## Task: Kling Motion Control Integration

**ID:** kling-motion-control
**Label:** Kling Motion Control Integration
**Description:** Add Kling v2.6 Motion Control model from Replicate to enable precise motion control for animating static images with motion paths
**Type:** Feature
**Status:** Done
**Priority:** High
**Order:** 1
**Created:** 2026-01-14
**Updated:** 2026-01-14
**PRD:** [Link](../PRDS/kling-motion-control.md)

---

## Summary

Integrate the Kling v2.6 Motion Control model (`kwaivgi/kling-v2.6-motion-control`) from Replicate into the workflow system. This model enables precise control of character actions and expressions by allowing users to paint motion paths directly onto static images, turning them into animated videos.

## Key Deliverables

- New `motionControl` node type in workflow system
- Backend service integration with Replicate API
- Frontend node component with motion path editor
- API route for async prediction handling
- Cost tracking and pricing configuration
- Webhook handling for prediction completion

## Reference

- [Replicate Model Page](https://replicate.com/kwaivgi/kling-v2.6-motion-control)
- Model enables precise motion control by painting motion paths on images
- Supports up to 6 different elements with individual motion paths
- Can use reference videos (3-30 seconds) for complex movements

---

## Acceptance Criteria

- [ ] `motionControl` node type added to node registry
- [ ] Backend service method for Kling motion control generation
- [ ] API route `/api/replicate/motion-control` created
- [ ] Frontend node component with image upload and motion path editor
- [ ] Support for image + motion paths input
- [ ] Support for image + reference video input (optional)
- [ ] Video output captured and stored in node data
- [ ] Cost calculation and tracking integrated
- [ ] Webhook handling for async predictions
- [ ] Node appears in workflow editor node palette
- [ ] All tests pass with 80%+ coverage
