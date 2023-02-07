"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Class = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const publish_1 = require("../../publish");
const templateTagResolver_1 = require("../templates/templateTagResolver");
const Base_1 = require("./Base");
class Class extends Base_1.Base {
    getConstructor() {
        const ctr = this.doc.members.find((member) => member.name === 'constructor');
        if (!ctr) {
            return `<article>\n\n### new ${this.doc.parent.path}()\n</article>`;
        }
        const all = [];
        const isDeprecated = ctr.tags?.find((tag) => tag.name === 'deprecated');
        const brief = ctr.brief;
        const description = ctr.description;
        const examples = this.getExamples(ctr);
        const params = ctr.params;
        let res = '<article>\n\n### ';
        const signature = `<span><code>${this.replaceUnsafeStrings(this.createSignature(ctr, false))}</code></span>`;
        res += `new ${ctr.parent.path}: ${signature}\n`;
        if (isDeprecated) {
            // remove last new line
            res = res.slice(0, -1);
            res += `<span class="deprecated-tag"> Deprecated: ${isDeprecated.deprecated}</span>\n`;
        }
        if (brief) {
            res += `${this.replaceUnsafeStrings(publish_1.htmlToMd.translate((0, templateTagResolver_1.runTagResolver)(brief)))}\n`;
        }
        if (description) {
            res += `${this.replaceUnsafeStrings(publish_1.htmlToMd.translate((0, templateTagResolver_1.runTagResolver)(description)))}\n`;
        }
        if (examples) {
            res += `${examples}\n`;
        }
        if (params) {
            const headers = ['Name', 'Type', 'Default', 'Description'];
            const rows = params.map((param) => {
                // replace all with replacements
                const dataType = param.dataType?.[0] ?? '';
                const dataTypes = `<code>${this.replaceUnsafeStrings(dataType)}</code>`;
                const des = [];
                if (param.description) {
                    des.push(this.replaceUnsafeStrings(publish_1.htmlToMd.translate((0, templateTagResolver_1.runTagResolver)(param.description)).replaceAll('\n', '<br />')));
                }
                return [param.identifier, dataTypes, `<code>${param.default ?? ''}</code>`, des.join('\n')];
            });
            res += `\n#### Parameters:\n${(0, publish_1.mdTable)([
                headers,
                ...rows
            ])}`;
        }
        all.push(res);
        all.push('\n</article>');
        all.push(this.separator);
        return all.join('\n');
    }
    save(outdir) {
        const props = this.formatProperties(this.getMembersOfType('PropertyDoc'));
        const methods = this.formatMethods(this.getMembersOfType('MethodDoc'));
        const markdown = `---
id: "${this.mdName}"
title: "Class: ${this.name}"
sidebar_label: "${this.name}"
custom_edit_url: null
---

${this.getSummary()}

${this.getConstructor()}

${this.getExtends()}

${props}

${methods}

    `;
        // ensure the modules directory exists
        fs_1.default.mkdirSync(path_1.default.join(outdir, 'classes'), { recursive: true });
        fs_1.default.writeFileSync(path_1.default.join(outdir, 'classes', `${this.mdName}.mdx`), markdown);
    }
}
exports.Class = Class;
