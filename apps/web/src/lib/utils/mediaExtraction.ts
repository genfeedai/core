import type {
  ImageGenNodeData,
  ImageInputNodeData,
  MotionControlNodeData,
  NodeType,
  OutputNodeData,
  VideoGenNodeData,
  VideoInputNodeData,
  WorkflowNodeData,
} from '@genfeedai/types';

export interface MediaInfo {
  url: string | null;
  urls?: string[];
  type: 'image' | 'video' | null;
}

/**
 * Extract media URL and type from node data
 */
export function getMediaFromNode(nodeType: NodeType, data: WorkflowNodeData): MediaInfo {
  switch (nodeType) {
    case 'imageGen': {
      const imgData = data as ImageGenNodeData;
      const urls = imgData.outputImages?.length ? imgData.outputImages : [];
      return {
        url: imgData.outputImage,
        urls,
        type: imgData.outputImage || urls.length ? 'image' : null,
      };
    }
    case 'videoGen': {
      const vidData = data as VideoGenNodeData;
      return { url: vidData.outputVideo, type: vidData.outputVideo ? 'video' : null };
    }
    case 'imageInput': {
      const inputData = data as ImageInputNodeData;
      return { url: inputData.image, type: inputData.image ? 'image' : null };
    }
    case 'videoInput': {
      const vidInputData = data as VideoInputNodeData;
      return { url: vidInputData.video, type: vidInputData.video ? 'video' : null };
    }
    case 'motionControl': {
      const mcData = data as MotionControlNodeData;
      return { url: mcData.outputVideo, type: mcData.outputVideo ? 'video' : null };
    }
    case 'output': {
      const outData = data as OutputNodeData;
      if (outData.inputVideo) {
        return { url: outData.inputVideo, type: 'video' };
      }
      if (outData.inputImage) {
        return { url: outData.inputImage, type: 'image' };
      }
      return { url: null, type: null };
    }
    default:
      return { url: null, type: null };
  }
}
