"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCssName = void 0;
const cssPages = new Set([
    // Reference
    'AnimationEvent',
    'CaretPosition',
    'CSS',
    'CSSConditionRule',
    'CSSCounterStyleRule',
    'CSSFontFaceRule',
    'CSSGroupingRule',
    'CSSImportRule',
    'CSSKeyframeRule',
    'CSSKeyframesRule',
    'CSSMediaRule',
    'CSSNamespaceRule',
    'CSSPageRule',
    'CSSRule',
    'CSSRuleList',
    'CSSStyleDeclaration',
    'CSSStyleSheet',
    'CSSStyleRule',
    'CSSSupportsRule',
    'FontFace',
    'FontFaceSet',
    'FontFaceSetLoadEvent',
    'MediaList',
    'MediaQueryList',
    'MediaQueryListEvent',
    'Screen',
    'StyleSheet',
    'StyleSheetList',
    'TransitionEvent',
    // CSS Typed Object Model
    'CSSImageValue',
    'CSSKeywordValue',
    'CSSMathInvert',
    'CSSMathMax',
    'CSSMathMin',
    'CSSMathNegate',
    'CSSMathProduct',
    'CSSMathSum',
    'CSSMathValue',
    'CSSMatrixComponent',
    'CSSNumericArray',
    'CSSNumericValue',
    'CSSPerspective',
    'CSSPositionValue',
    'CSSRotate',
    'CSSScale',
    'CSSSkew',
    'CSSSkewX',
    'CSSSkewY',
    'CSSStyleValue',
    'CSSTransformComponent',
    'CSSTransformValue',
    'CSSTranslate',
    'CSSUnitValue',
    'CSSUnparsedValue',
    'CSSVariableReferenceValue',
    'StylePropertyMap',
    'StylePropertyMapReadOnly ',
]);
function resolveCssName(name) {
    if (cssPages.has(name)) {
        return `https://developer.mozilla.org/en-US/docs/Web/API/${name}`;
    }
    return undefined;
}
exports.resolveCssName = resolveCssName;
