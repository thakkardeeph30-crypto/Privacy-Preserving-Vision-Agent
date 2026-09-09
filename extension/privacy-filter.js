/**
 * PrivacyFilter - Comprehensive Client-Side PII Detection & Redaction Engine
 * Detects and sanitizes faces, passwords, emails, phone numbers, and credit cards
 * before any screenshot data is transmitted.
 */
class PrivacyFilter {
  constructor(options = {}) {
    this.options = {
      blurFaces: true,
      maskPasswords: true,
      maskEmails: true,
      maskPhones: true,
      maskCreditCards: true,
      ...options
    };

    this.redactionMethods = {
      face: 'blur',         // Pixelated blur / mosaic
      password: 'blackout', // Complete blackout block
      email: 'mask',        // us***@domain.com
      phone: 'mask',        // XXX-XXX-1234
      creditcard: 'partial' // **** **** **** 1234
    };

    this.patterns = {
      email: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
      phone: /(?:\+?\d{1,3}[-.\s]?)?(?:\(\d{3}\)|\b\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      creditCard: /\b(?:\d{4}[ -]?){3}\d{4}\b|\b\d{16}\b|\b3[47]\d{2}[ -]?\d{6}[ -]?\d{5}\b/g
    };
  }

  // --- 1. Luhn Check for Validating Credit Cards ---
  luhnCheck(val) {
    const clean = String(val).replace(/[\s-]/g, '');
    if (!/^\d{13,19}$/.test(clean)) return false;
    let sum = 0;
    let shouldDouble = false;
    for (let i = clean.length - 1; i >= 0; i--) {
      let digit = parseInt(clean.charAt(i), 10);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  // --- 2. PII Detection in Text ---
  detectEmailPatterns(text) {
    if (!text || typeof text !== 'string') return [];
    const matches = [];
    const re = new RegExp(this.patterns.email);
    let match;
    while ((match = re.exec(text)) !== null) {
      matches.push({
        type: 'email',
        raw: match[0],
        masked: this.maskEmail(match[0]),
        index: match.index
      });
    }
    return matches;
  }

  detectPhoneNumbers(text) {
    if (!text || typeof text !== 'string') return [];
    const matches = [];
    const re = new RegExp(this.patterns.phone);
    let match;
    while ((match = re.exec(text)) !== null) {
      matches.push({
        type: 'phone',
        raw: match[0],
        masked: this.maskPhone(match[0]),
        index: match.index
      });
    }
    return matches;
  }

  detectCreditCards(text) {
    if (!text || typeof text !== 'string') return [];
    const matches = [];
    const re = new RegExp(this.patterns.creditCard);
    let match;
    while ((match = re.exec(text)) !== null) {
      const candidate = match[0];
      if (this.luhnCheck(candidate)) {
        matches.push({
          type: 'creditcard',
          raw: candidate,
          masked: this.maskCreditCard(candidate),
          index: match.index
        });
      }
    }
    return matches;
  }

  maskEmail(email) {
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***.com';
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 2 ? name.substring(0, 2) + '***' : name + '***';
    return `${maskedName}@${domain}`;
  }

  maskPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 4) {
      const last4 = digits.slice(-4);
      return `XXX-XXX-${last4}`;
    }
    return 'XXX-XXX-XXXX';
  }

  maskCreditCard(card) {
    const clean = card.replace(/[\s-]/g, '');
    const last4 = clean.slice(-4);
    return `**** **** **** ${last4}`;
  }

  // --- 3. DOM Detection (Runs in Content Script Context) ---
  detectDOMSensitivities(doc = document) {
    const regions = [];
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;

    // A. Detect Password Fields & Visually Obscured Inputs
    if (this.options.maskPasswords) {
      const passwordInputs = doc.querySelectorAll(
        'input[type="password"], input[autocomplete*="password"], input[name*="password"], input[id*="password"], input[data-sensitive="true"]'
      );
      passwordInputs.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          regions.push({
            type: 'password',
            method: 'blackout',
            label: 'PASSWORD FIELD',
            box: {
              x: Math.round(rect.left * dpr),
              y: Math.round(rect.top * dpr),
              width: Math.round(rect.width * dpr),
              height: Math.round(rect.height * dpr)
            },
            selector: this.getElementSelector(el)
          });
        }
      });
    }

    // B. Detect Face Avatars & Profile Images from DOM heuristics
    if (this.options.blurFaces) {
      const avatarElements = doc.querySelectorAll(
        'img[src*="avatar"], img[src*="profile"], img[alt*="avatar"], img[alt*="profile"], img[alt*="portrait"], [class*="avatar"], [class*="profile-pic"], [id*="avatar"]'
      );
      avatarElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        // Faces/avatars are usually roughly square or circular portraits
        if (rect.width >= 24 && rect.height >= 24 && rect.width <= 400 && rect.height <= 400) {
          regions.push({
            type: 'face',
            method: 'blur',
            label: 'FACE / AVATAR',
            box: {
              x: Math.round(rect.left * dpr),
              y: Math.round(rect.top * dpr),
              width: Math.round(rect.width * dpr),
              height: Math.round(rect.height * dpr)
            },
            selector: this.getElementSelector(el)
          });
        }
      });
    }

    // C. Detect Text Nodes with Sensitive PII
    const textNodes = this.getTextNodes(doc.body || doc);
    textNodes.forEach((node) => {
      const text = node.nodeValue;
      if (!text || text.trim().length === 0) return;

      const piiFound = [];
      if (this.options.maskEmails) {
        piiFound.push(...this.detectEmailPatterns(text));
      }
      if (this.options.maskPhones) {
        piiFound.push(...this.detectPhoneNumbers(text));
      }
      if (this.options.maskCreditCards) {
        piiFound.push(...this.detectCreditCards(text));
      }

      if (piiFound.length > 0 && node.parentElement) {
        const parentRect = node.parentElement.getBoundingClientRect();
        if (parentRect.width > 0 && parentRect.height > 0) {
          piiFound.forEach((pii) => {
            regions.push({
              type: pii.type,
              method: this.redactionMethods[pii.type] || 'mask',
              label: pii.type.toUpperCase(),
              value: pii.raw,
              maskedValue: pii.masked,
              box: {
                x: Math.round(parentRect.left * dpr),
                y: Math.round(parentRect.top * dpr),
                width: Math.round(parentRect.width * dpr),
                height: Math.round(parentRect.height * dpr)
              },
              selector: this.getElementSelector(node.parentElement)
            });
          });
        }
      }
    });

    return regions;
  }

  // --- 4. Canvas-Level Image Redaction (Runs in Background/Offscreen/Content) ---
  /**
   * Redacts sensitive regions from a screenshot image.
   * @param {string|HTMLImageElement|ImageBitmap} imageSource - Base64 data URL or Image element
   * @param {Array} detections - List of { type, method, box: { x, y, width, height } }
   * @returns {Promise<{ sanitizedBase64: string, redactedCount: number, detectedTypes: string[] }>}
   */
  async redactImage(imageSource, detections = []) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = typeof OffscreenCanvas !== 'undefined'
            ? new OffscreenCanvas(img.width, img.height)
            : document.createElement('canvas');

          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');

          // Draw pristine screenshot
          ctx.drawImage(img, 0, 0);

          let redactedCount = 0;
          const detectedTypes = new Set();

          // Apply Redactions
          for (const det of detections) {
            const { box, method, type, label } = det;
            if (!box || box.width <= 0 || box.height <= 0) continue;

            const x = Math.max(0, Math.min(box.x, canvas.width - 1));
            const y = Math.max(0, Math.min(box.y, canvas.height - 1));
            const w = Math.min(box.width, canvas.width - x);
            const h = Math.min(box.height, canvas.height - y);

            if (w <= 0 || h <= 0) continue;

            detectedTypes.add(type);
            redactedCount++;

            if (method === 'blur' || type === 'face') {
              this.applyMosaicBlur(ctx, x, y, w, h, 14);
            } else if (method === 'blackout' || type === 'password') {
              this.applyBlackout(ctx, x, y, w, h, label || 'PASSWORD');
            } else {
              // Masking for email, phone, creditcard
              this.applyMaskPill(ctx, x, y, w, h, label || 'PII REDACTED');
            }
          }

          // Convert to base64
          if (canvas.convertToBlob) {
            canvas.convertToBlob({ type: 'image/png' }).then((blob) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                resolve({
                  sanitizedBase64: reader.result,
                  redactedCount,
                  detectedTypes: Array.from(detectedTypes)
                });
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            }).catch(reject);
          } else {
            const dataUrl = canvas.toDataURL('image/png');
            resolve({
              sanitizedBase64: dataUrl,
              redactedCount,
              detectedTypes: Array.from(detectedTypes)
            });
          }
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = (e) => reject(new Error('Failed to load image for redaction: ' + e));

      if (typeof imageSource === 'string') {
        img.src = imageSource;
      } else if (imageSource instanceof Image || imageSource.src) {
        img.src = imageSource.src;
      }
    });
  }

  // --- 5. Redaction Canvas Effects ---
  applyMosaicBlur(ctx, x, y, w, h, blockSize = 12) {
    ctx.save();
    // 1. Clip region
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    // 2. High-strength pixelation
    const imgData = ctx.getImageData(x, y, w, h);
    const data = imgData.data;

    for (let py = 0; py < h; py += blockSize) {
      for (let px = 0; px < w; px += blockSize) {
        let r = 0, g = 0, b = 0, count = 0;
        for (let subY = 0; subY < blockSize && py + subY < h; subY++) {
          for (let subX = 0; subX < blockSize && px + subX < w; subX++) {
            const idx = ((py + subY) * w + (px + subX)) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            count++;
          }
        }
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);

        for (let subY = 0; subY < blockSize && py + subY < h; subY++) {
          for (let subX = 0; subX < blockSize && px + subX < w; subX++) {
            const idx = ((py + subY) * w + (px + subX)) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
          }
        }
      }
    }
    ctx.putImageData(imgData, x, y);

    // 3. Draw protective translucent cyber-shield overlay & border
    ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // 4. Draw mini badge
    if (w > 60 && h > 24) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      const bw = Math.min(100, w - 8);
      ctx.fillRect(x + (w - bw) / 2, y + (h - 18) / 2, bw, 18);
      ctx.fillStyle = '#818cf8';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🛡️ REDACTED', x + w / 2, y + h / 2);
    }
    ctx.restore();
  }

  applyBlackout(ctx, x, y, w, h, label = 'PASSWORD') {
    ctx.save();
    // Solid pitch black box
    ctx.fillStyle = '#05070d';
    ctx.fillRect(x, y, w, h);

    // Sleek border
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    // Center Warning text if space permits
    if (w > 40 && h > 16) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🔒 ${label}`, x + w / 2, y + h / 2);
    }
    ctx.restore();
  }

  applyMaskPill(ctx, x, y, w, h, label = 'PII REDACTED') {
    ctx.save();
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    if (w > 50 && h > 14) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🛡️ ${label}`, x + w / 2, y + h / 2);
    }
    ctx.restore();
  }

  // --- 6. DOM Content Redaction (Masks live DOM text) ---
  redactDOM(doc = document) {
    let maskedCount = 0;
    const textNodes = this.getTextNodes(doc.body || doc);

    textNodes.forEach((node) => {
      let text = node.nodeValue;
      if (!text || text.trim().length === 0) return;

      if (this.options.maskEmails) {
        text = text.replace(this.patterns.email, (match) => {
          maskedCount++;
          return this.maskEmail(match);
        });
      }

      if (this.options.maskPhones) {
        text = text.replace(this.patterns.phone, (match) => {
          maskedCount++;
          return this.maskPhone(match);
        });
      }

      if (this.options.maskCreditCards) {
        text = text.replace(this.patterns.creditCard, (match) => {
          if (this.luhnCheck(match)) {
            maskedCount++;
            return this.maskCreditCard(match);
          }
          return match;
        });
      }

      if (text !== node.nodeValue) {
        node.nodeValue = text;
      }
    });

    return maskedCount;
  }

  // --- Helper Methods ---
  getTextNodes(root) {
    const textNodes = [];
    if (!root) return textNodes;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName.toLowerCase();
          if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'textarea') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
    );

    let curr;
    while ((curr = walker.nextNode())) {
      textNodes.push(curr);
    }
    return textNodes;
  }

  getElementSelector(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return 'body';
    if (el.id) return `#${CSS.escape(el.id)}`;
    if (el.name) return `${el.tagName.toLowerCase()}[name="${CSS.escape(el.name)}"]`;
    if (el.className && typeof el.className === 'string') {
      const firstClass = el.className.split(/\s+/).filter(Boolean)[0];
      if (firstClass) return `${el.tagName.toLowerCase()}.${CSS.escape(firstClass)}`;
    }
    return el.tagName.toLowerCase();
  }
}

// Universal module export
if (typeof globalThis !== 'undefined') {
  globalThis.PrivacyFilter = PrivacyFilter;
}
if (typeof window !== 'undefined') {
  window.PrivacyFilter = PrivacyFilter;
}
if (typeof self !== 'undefined') {
  self.PrivacyFilter = PrivacyFilter;
}

export default PrivacyFilter;
export { PrivacyFilter };

