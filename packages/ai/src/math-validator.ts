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
      // Check parenthesis balance
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
      // Ignore escaped braces like \{ and \}
      if (char === '\\') {
        i++; // skip next char
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
