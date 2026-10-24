import type { Rule } from 'eslint';

/**
 * Port `design/_adherence.oxlintrc.json` na React Native (IMP-002, TC-TOKENS-003, NFR-208).
 * W ekranach (`src/features/**`) kolory, odstępy, promienie i fonty pochodzą z `@polechamp/tokens`.
 * Zgłasza: literały kolorów (#hex, rgb/rgba/hsl) w dowolnym napisie, liczby w polach stylu
 * (poza 0 i 1 – grubości obramowań, przezroczystość) oraz `fontFamily` spoza Inter.
 */

const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/;
const PX_LITERAL = /\b\d+px\b/;
const ALLOWED_NUMBERS = new Set([0, 1]);
const ALLOWED_FONT = /^Inter\b/;

/** Pola stylu RN, w których liczba musi pochodzić z tokenów. */
const NUMERIC_STYLE_KEYS = new Set([
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
  'marginStart',
  'marginEnd',
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingHorizontal',
  'paddingVertical',
  'paddingStart',
  'paddingEnd',
  'gap',
  'rowGap',
  'columnGap',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderWidth',
  'borderTopWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderRightWidth',
  'fontSize',
  'lineHeight',
  'letterSpacing',
  'shadowRadius',
  'shadowOpacity',
  'elevation',
]);

type Literal = { type: 'Literal'; value: unknown };

function keyName(node: Rule.Node): string | undefined {
  if (node.type !== 'Property') return undefined;
  const key = node.key;
  if (key.type === 'Identifier') return key.name;
  if (key.type === 'Literal' && typeof key.value === 'string') return key.value;
  return undefined;
}

function numericValue(node: Rule.Node): number | undefined {
  if (node.type === 'Literal' && typeof (node as Literal).value === 'number')
    return (node as Literal).value as number;
  if (node.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'Literal') {
    const v = (node.argument as Literal).value;
    return typeof v === 'number' ? -v : undefined;
  }
  return undefined;
}

export const noRawStyleValues: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Zakaz surowych kolorów, liczb w stylach i fontów spoza design systemu Nocturne.' },
    schema: [],
    messages: {
      rawColor: 'Surowy kolor „{{value}}” – użyj tokenu koloru z @polechamp/tokens.',
      rawPx: 'Surowa wartość „{{value}}” – użyj tokenu odstępu z @polechamp/tokens.',
      rawNumber:
        'Surowa liczba {{value}} w „{{key}}” – użyj tokenu z @polechamp/tokens (dozwolone tylko 0 i 1).',
      rawFont: 'Font „{{value}}” nie należy do design systemu – dostępny jest tylko Inter.',
    },
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value !== 'string') return;
        const parent = (node as Rule.Node).parent;
        if (parent?.type === 'ImportDeclaration' || parent?.type === 'ExportNamedDeclaration') return;
        if (parent?.type === 'Property' && keyName(parent) === 'fontFamily' && parent.value === node) {
          if (!ALLOWED_FONT.test(node.value))
            context.report({ node, messageId: 'rawFont', data: { value: node.value } });
          return;
        }
        const color = COLOR_LITERAL.exec(node.value);
        if (color) {
          context.report({ node, messageId: 'rawColor', data: { value: color[0] } });
          return;
        }
        const px = PX_LITERAL.exec(node.value);
        if (px) context.report({ node, messageId: 'rawPx', data: { value: px[0] } });
      },
      Property(node) {
        const key = keyName(node as Rule.Node);
        if (!key || !NUMERIC_STYLE_KEYS.has(key)) return;
        const value = numericValue(node.value as Rule.Node);
        if (value === undefined || ALLOWED_NUMBERS.has(value)) return;
        context.report({ node: node.value, messageId: 'rawNumber', data: { value: String(value), key } });
      },
    };
  },
};
