"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHomePage = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const publish_1 = require("../../publish");
function generateHomePage(outdir) {
    const packageList = Array.from(publish_1.packages.keys())
        .map((id) => {
        const pkg = publish_1.packages.get(id);
        return `* [${pkg?.name}](./api/modules/${pkg?.mdName})`;
    })
        .join(`\n`);
    const markdown = `---
id: "index"
title: "PixiJS API Reference"
sidebar_label: "Exports"
sidebar_position: 0.5
custom_edit_url: null
---
# PixiJS API Reference
## Packages
${packageList}
    `;
    fs_1.default.writeFileSync(path_1.default.join(outdir, 'index.mdx'), markdown);
    fs_1.default.writeFileSync(path_1.default.join(outdir, '_category_.yml'), 'label: API');
}
exports.generateHomePage = generateHomePage;
