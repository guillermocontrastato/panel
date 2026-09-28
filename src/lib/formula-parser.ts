export interface FormulaField {
  label: string;
  variable: string;
}

export interface ParsedFormula {
  fields: FormulaField[];
  compute: (values: Record<string, number>) => number | null;
  expression: string;
}

/**
 * Parses a custom formula expression using {field_name} placeholders.
 * Example: "{ventas} / {objetivo} * 100" → fields: ventas, objetivo; compute: ventas/objetivo*100
 * Also supports +, -, *, /, parentheses, and numeric constants.
 */
export function parseFormula(expression: string): ParsedFormula {
  const cleaned = expression.trim();

  // Extract all {field_name} placeholders
  const fieldRegex = /\{([^}]+)\}/g;
  const fieldNames: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = fieldRegex.exec(cleaned)) !== null) {
    const name = match[1].trim();
    if (!fieldNames.includes(name)) fieldNames.push(name);
  }

  const fields: FormulaField[] = fieldNames.map((name) => ({
    label: name,
    variable: name,
  }));

  // Build a JS expression by replacing {field_name} with values[field_name]
  // Sanitize: only allow field refs, numbers, operators, parentheses, spaces
  const jsExpr = cleaned.replace(/\{([^}]+)\}/g, (_, name) => {
    const n = name.trim();
    return `__v["${n}"]`;
  });

  // Validate the expression only contains safe characters
  const sanitized = jsExpr.replace(/__v\["[^"]+"\]/g, '0');
  if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) {
    // If it contains unsafe characters, fall back to a simple sum
    return {
      fields,
      compute: (v) => {
        let sum = 0;
        for (const f of fields) {
          if (v[f.variable] == null) return null;
          sum += v[f.variable];
        }
        return sum;
      },
      expression: cleaned,
    };
  }

  const compute = (values: Record<string, number>): number | null => {
    try {
      for (const f of fields) {
        if (values[f.variable] == null || isNaN(values[f.variable])) return null;
      }
      // eslint-disable-next-line no-new-func
      const fn = new Function('__v', `"use strict"; return (${jsExpr});`);
      const result = fn(values);
      return typeof result === 'number' && !isNaN(result) && isFinite(result) ? result : null;
    } catch {
      return null;
    }
  };

  return { fields, compute, expression: cleaned };
}

/**
 * Legacy parser for KPI formula strings (÷, ×, − notation).
 * Used by the original KPI system, not by custom formulas.
 */
export function parseLegacyFormula(formula: string): ParsedFormula {
  const cleaned = formula.trim();

  const divideMatch = cleaned.match(/^(.+?)\s*÷\s*(.+?)(?:\s*×\s*100)?$/);
  if (divideMatch) {
    const [, left, right] = divideMatch;
    const leftParts = splitSubtraction(left);
    const rightParts = splitSubtraction(right);

    if (leftParts.length === 1 && rightParts.length === 1) {
      return {
        fields: [
          { label: cleanLabel(leftParts[0]), variable: 'a' },
          { label: cleanLabel(rightParts[0]), variable: 'b' },
        ],
        compute: (v) => {
          if (v.b === 0 || v.b == null || v.a == null) return null;
          return (v.a / v.b) * 100;
        },
        expression: `${cleanLabel(leftParts[0])} ÷ ${cleanLabel(rightParts[0])} × 100`,
      };
    }
  }

  const subParts = splitSubtraction(cleaned);
  if (subParts.length >= 2) {
    const fields = subParts.map((p, i) => ({
      label: cleanLabel(p),
      variable: String.fromCharCode(97 + i),
    }));
    return {
      fields,
      compute: (v) => {
        let result = v.a;
        if (result == null) return null;
        for (let i = 1; i < fields.length; i++) {
          const val = v[fields[i].variable];
          if (val == null) return null;
          result -= val;
        }
        return result;
      },
      expression: fields.map((f) => f.label).join(' − '),
    };
  }

  return {
    fields: [{ label: 'Valor', variable: 'a' }],
    compute: (v) => v.a ?? null,
    expression: 'Valor',
  };
}

function splitSubtraction(str: string): string[] {
  return str.split(/\s*−\s*/).map((s) => s.trim()).filter((s) => s.length > 0);
}

function cleanLabel(text: string): string {
  let label = text.replace(/[.;].*$/, '').trim();
  label = label.replace(/^(El |La |Los |Las |Un |Una )/i, '');
  if (label.length > 0) {
    label = label[0].toUpperCase() + label.slice(1);
  }
  if (label.length > 60) {
    label = label.slice(0, 57) + '...';
  }
  return label;
}
