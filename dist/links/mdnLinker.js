"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mdnLinker = void 0;
const canvas_1 = require("./mdn/canvas");
const css_1 = require("./mdn/css");
const dom_1 = require("./mdn/dom");
const globalObjects_1 = require("./mdn/globalObjects");
const webaudio_1 = require("./mdn/webaudio");
function mdnLinker(name) {
    return (0, globalObjects_1.resolveGlobalName)(name)
        ?? (0, dom_1.resolveDomName)(name)
        ?? (0, css_1.resolveCssName)(name)
        ?? (0, canvas_1.resolveCanvasName)(name)
        ?? (0, webaudio_1.resolveWebAudioName)(name);
}
exports.mdnLinker = mdnLinker;
