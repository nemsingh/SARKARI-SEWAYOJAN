// Google Translate free API fallback
export const googleTranslate = async (text: string, targetLang: string = 'hi'): Promise<string> => {
  if (!text || typeof text !== 'string') return text;

  // Check if text contains HTML tags
  const hasHtml = /<[a-z][\s\S]*>/i.test(text);

  if (!hasHtml) {
    return await translateText(text, targetLang);
  }

  // Parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');
  
  // Extract text nodes
  const textNodes: Text[] = [];
  const walk = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
  let node;
  while ((node = walk.nextNode())) {
    if (node.nodeValue && node.nodeValue.trim().length > 0) {
      // Skip text nodes inside script or style tags
      const parent = node.parentElement;
      if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' || parent.tagName === 'CODE')) {
        continue;
      }
      textNodes.push(node as Text);
    }
  }

  if (textNodes.length === 0) return text;

  // Batch text nodes to avoid hitting API limits
  const BATCH_SIZE = 2000; // characters
  let currentBatch: Text[] = [];
  let currentLength = 0;
  const batches: Text[][] = [];

  for (const textNode of textNodes) {
    const len = textNode.nodeValue!.length;
    if (currentLength + len > BATCH_SIZE && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [];
      currentLength = 0;
    }
    currentBatch.push(textNode);
    currentLength += len;
  }
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  const delimiter = '\n\n__GT_SEP__\n\n';

  for (const batch of batches) {
    const combinedText = batch.map(n => n.nodeValue).join(delimiter);
    const translatedCombined = await translateText(combinedText, targetLang);
    
    // Split the translated text back into parts
    // Google Translate might add spaces around the delimiter
    const translatedParts = translatedCombined.split(/\s*__GT_SEP__\s*/);
    
    // If the split count matches the batch size, update the nodes
    if (translatedParts.length === batch.length) {
      for (let i = 0; i < batch.length; i++) {
        batch[i].nodeValue = translatedParts[i];
      }
    } else {
      // Fallback: if delimiter was messed up, try to translate individually
      console.warn('Batch translation split mismatch, translating individually...');
      for (const textNode of batch) {
        textNode.nodeValue = await translateText(textNode.nodeValue!, targetLang);
      }
    }
  }

  return doc.body.innerHTML;
};

const translateText = async (text: string, targetLang: string): Promise<string> => {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ q: text }).toString(),
    });
    
    if (!response.ok) throw new Error('Google Translate API failed');
    const data = await response.json();
    return data[0]?.map((segment: any[]) => segment[0]).join('') || text;
  } catch (error) {
    console.error('Google Translate error:', error);
    return text;
  }
};
