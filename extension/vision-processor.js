/**
 * VisionProcessor - Local Screen Analysis & UI Element Extraction
 * Coordinates with the offscreen ML document for ViT / Object Detection,
 * with adaptive fallback heuristic parsing for zero-latency execution.
 */
class VisionProcessor {
  constructor(options = {}) {
    this.options = options;
    this.isReady = false;
    this.offscreenReady = false;
    this.modelName = 'Xenova/detr-resnet-50';
  }

  /**
   * Initializes the vision processor by checking or pinging the offscreen ML context.
   */
  async initialize() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        // Ping offscreen or background for model readiness
        const res = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'CHECK_VISION_MODEL' }, (response) => {
            if (chrome.runtime.lastError || !response) {
              resolve({ status: 'fallback_ready' });
            } else {
              resolve(response);
            }
          });
        });
        this.isReady = true;
        this.offscreenReady = res.status === 'loaded';
      } else {
        this.isReady = true;
      }
      return { success: true, isReady: this.isReady };
    } catch (err) {
      console.warn('VisionProcessor initialization notice:', err.message);
      this.isReady = true;
      return { success: true, fallback: true };
    }
  }

  /**
   * Analyzes screen screenshot and extracts UI interactive elements.
   * @param {string} screenshotData - Base64 screenshot
   * @param {Array} domElements - Optional DOM metadata from active tab
   * @returns {Promise<Array>} List of UI elements: [{ id, type, label, bbox: [x, y, w, h], confidence, selector }]
   */
  async analyzeScreen(screenshotData, domElements = []) {
    let detections = [];

    // 1. If offscreen document is available, request ViT object detection
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { type: 'OFFSCREEN_ANALYZE_SCREEN', screenshot: screenshotData },
            (res) => {
              if (chrome.runtime.lastError || !res) {
                resolve(null);
              } else {
                resolve(res);
              }
            }
          );
        });

        if (response && response.detections) {
          detections = response.detections;
        }
      } catch (e) {
        console.warn('Offscreen ViT analysis unavailable, using visual DOM heuristics:', e);
      }
    }

    // 2. Synthesize ViT detections with DOM layout
    return this.extractUIElements(detections, domElements);
  }

  /**
   * Parses detection outputs and combines with DOM element positions.
   * Produces grounded bounding boxes and unique selectors for agent execution.
   */
  extractUIElements(detections = [], domElements = []) {
    const uiElements = [];
    let idCounter = 1;

    // A. Add DOM interactive elements (buttons, inputs, links, selects, clickable cards)
    if (Array.isArray(domElements)) {
      for (const el of domElements) {
        uiElements.push({
          id: `elem_${idCounter++}`,
          type: el.type || 'element',
          label: el.text || el.placeholder || el.ariaLabel || el.name || '',
          selector: el.selector,
          bbox: el.bbox || [0, 0, 0, 0], // [x, y, w, h]
          confidence: 0.98,
          isInteractive: true,
          attributes: el.attributes || {}
        });
      }
    }

    // B. Merge or augment with visual ViT detections
    if (Array.isArray(detections)) {
      for (const det of detections) {
        // ViT labels like 'button', 'keyboard', 'laptop', 'cell phone', etc.
        const label = det.label || 'ui_component';
        const box = det.box || (det.bbox ? {
          x: det.bbox[0],
          y: det.bbox[1],
          width: det.bbox[2],
          height: det.bbox[3]
        } : null);

        if (box) {
          uiElements.push({
            id: `vit_${idCounter++}`,
            type: this.mapViTLabelToUIType(label),
            label: label,
            selector: null,
            bbox: [box.x, box.y, box.width, box.height],
            confidence: Math.round((det.score || 0.85) * 100) / 100,
            isInteractive: true
          });
        }
      }
    }

    return uiElements;
  }

  mapViTLabelToUIType(label) {
    const l = String(label).toLowerCase();
    if (l.includes('button') || l.includes('icon')) return 'button';
    if (l.includes('text') || l.includes('keyboard')) return 'input';
    if (l.includes('cell') || l.includes('card') || l.includes('screen')) return 'container';
    return 'ui_element';
  }
}

// Universal module export
if (typeof globalThis !== 'undefined') {
  globalThis.VisionProcessor = VisionProcessor;
}
if (typeof window !== 'undefined') {
  window.VisionProcessor = VisionProcessor;
}
if (typeof self !== 'undefined') {
  self.VisionProcessor = VisionProcessor;
}

export default VisionProcessor;
export { VisionProcessor };

