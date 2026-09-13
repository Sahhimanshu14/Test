export interface MathValidationResult {
  isValid: boolean;
  errors: string[];
  formulaCount: number;
}

export class MathValidator {
  /**
   * Validates markdown content containing inline ($...$) and block ($$...$$) KaTeX expressions.
   */
  static validate(content: string): MathValidationResult {
    const errors: string[] = [];
    let formulaCount = 0;

    if (!content || typeof content !== 'string') {
      return { isValid: false, errors: ['Content must be a non-empty string'], formulaCount: 0 };
    }

    // 1. Check for block math ($$...$$)
    const blockMatches = content.match(/\$\$[\s\S]*?\$\$/g) || [];
    formulaCount += blockMatches.length;

    // Temporarily replace block matches to avoid interference with inline math checking
    let strippedContent = content.replace(/\$\$[\s\S]*?\$\$/g, '___BLOCK_MATH___');

    // 2. Check for unmatched block delimiters ($$)
    if (strippedContent.includes('$$')) {
      errors.push('Found unclosed or mismatched block math delimiter ($$)');
    }

    // 3. Check for inline math ($...$)
    // Match unescaped $ signs
    const singleDollarCount = (strippedContent.match(/(?<!\\)\$/g) || []).length;
    if (singleDollarCount % 2 !== 0) {
      errors.push('Found unclosed inline math delimiter ($)');
    } else {
      formulaCount += singleDollarCount / 2;
    }

    // 4. Check for common LaTeX syntax errors inside formulas
    const inlineMatches = strippedContent.match(/(?<!\\)\$([^\$]+?)(?<!\\)\$/g) || [];
    for (const match of inlineMatches) {
      const formula = match.slice(1, -1);
      if (!this.areBracketsBalanced(formula)) {
        errors.push(`Unbalanced brackets or braces in formula: "${formula}"`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      formulaCount,
    };
  }

  private static areBracketsBalanced(expr: string): boolean {
    const stack: string[] = [];
    const pairs: Record<string, string> = {
      ')': '(',
      '}': '{',
      ']': '[',
    };

    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];
      if (char === '\\') {
        i++; // skip escaped char
        continue;
      }
      if (char === '(' || char === '{' || char === '[') {
        stack.push(char);
      } else if (char === ')' || char === '}' || char === ']') {
        const last = stack.pop();
        if (last !== pairs[char]) {
          return false;
        }
      }
    }

    return stack.length === 0;
  }
}

export interface NumericalVerificationResult {
  isVerified: boolean;
  errors: string[];
  calculatedValue?: number | string | null;
}

export class NumericalAnswerValidator {
  /**
   * Deterministically verifies whether a calculated numerical answer matches
   * the designated correct option text.
   */
  static verify(
    questionText: string,
    options: Array<{ identifier: string; text: string }>,
    correctIdentifier: string,
    claimedCalculatedValue?: string | null
  ): NumericalVerificationResult {
    const errors: string[] = [];
    const correctOption = options.find((o) => o.identifier === correctIdentifier);

    if (!correctOption) {
      return {
        isVerified: false,
        errors: [`Correct option ${correctIdentifier} is missing from options set.`],
      };
    }

    // If a claimed calculation value was provided, verify it exists within the correct option
    if (claimedCalculatedValue !== undefined && claimedCalculatedValue !== null) {
      const cleanClaimed = claimedCalculatedValue.trim().toLowerCase().replace(/,/g, '');
      const cleanOption = correctOption.text.trim().toLowerCase().replace(/,/g, '');

      // Check if number or string is contained in option text
      const numberInOption = cleanOption.includes(cleanClaimed);
      if (!numberInOption) {
        // Try parsing numerical floats if both are pure numbers
        const numClaimed = parseFloat(cleanClaimed);
        const numOptionMatch = cleanOption.match(/-?\d+(\.\d+)?/);
        const numOption = numOptionMatch ? parseFloat(numOptionMatch[0]) : NaN;

        if (!isNaN(numClaimed) && !isNaN(numOption)) {
          if (Math.abs(numClaimed - numOption) > 0.01) {
            errors.push(
              `Calculated answer (${cleanClaimed}) differs from correct option value (${numOption}).`
            );
          }
        } else {
          errors.push(
            `Claimed calculated answer "${claimedCalculatedValue}" is not present in correct option text "${correctOption.text}".`
          );
        }
      }
    }

    // Try basic arithmetic problem verification if matching patterns:
    // e.g. "What is X% of Y?" or "Train running at S km/h takes T seconds..."
    const percentMatch = questionText.match(/(\d+)%\s+of\s+(\d+)/i);
    if (percentMatch && percentMatch[1] && percentMatch[2]) {
      const p = parseFloat(percentMatch[1]);
      const base = parseFloat(percentMatch[2]);
      const expected = (p / 100) * base;

      const optValMatch = correctOption.text.match(/-?\d+(\.\d+)?/);
      if (optValMatch) {
        const optVal = parseFloat(optValMatch[0]);
        if (Math.abs(expected - optVal) > 0.01) {
          errors.push(
            `Mathematical inconsistency: ${p}% of ${base} = ${expected}, but correct option is ${optVal}.`
          );
        }
      }
    }

    return {
      isVerified: errors.length === 0,
      errors,
      calculatedValue: claimedCalculatedValue,
    };
  }
}

export class DuplicateQuestionDetector {
  /**
   * Computes word-level Jaccard similarity between two question texts.
   */
  static computeSimilarity(textA: string, textB: string): number {
    const tokenize = (str: string) =>
      new Set(
        str
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter((w) => w.length > 2)
      );

    const setA = tokenize(textA);
    const setB = tokenize(textB);

    if (setA.size === 0 || setB.size === 0) return 0;

    let intersectionSize = 0;
    for (const item of setA) {
      if (setB.has(item)) {
        intersectionSize++;
      }
    }

    const unionSize = setA.size + setB.size - intersectionSize;
    return unionSize === 0 ? 0 : intersectionSize / unionSize;
  }

  /**
   * Checks if candidate question text is a duplicate against a list of existing questions.
   * Threshold default: 0.75 Jaccard overlap.
   */
  static checkDuplicate(
    candidateText: string,
    existingTexts: string[],
    threshold = 0.75
  ): { isDuplicate: boolean; highestSimilarity: number; duplicateOf?: string } {
    let highestSimilarity = 0;
    let duplicateOf: string | undefined;

    for (const existing of existingTexts) {
      const sim = this.computeSimilarity(candidateText, existing);
      if (sim > highestSimilarity) {
        highestSimilarity = sim;
        duplicateOf = existing;
      }
    }

    return {
      isDuplicate: highestSimilarity >= threshold,
      highestSimilarity: parseFloat(highestSimilarity.toFixed(3)),
      duplicateOf: highestSimilarity >= threshold ? duplicateOf : undefined,
    };
  }
}

/**
 * Sanitizes output strings from AI models to prevent XSS or script injection
 */
export function sanitizeAIContent(content: string): string {
  if (!content) return '';
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onerror\s*=/gi, '')
    .replace(/onload\s*=/gi, '')
    .trim();
}
