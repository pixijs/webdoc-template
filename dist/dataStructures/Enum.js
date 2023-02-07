"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Enum = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const publish_1 = require("../../publish");
const templateTagResolver_1 = require("../templates/templateTagResolver");
const Base_1 = require("./Base");
class Enum extends Base_1.Base {
    getProperties() {
        const properties = this.getMembersOfType('PropertyDoc');
        let propertyString = '';
        // TODO: add links to properties in current page
        // TODO: add links to types
        if (properties.length > 0) {
            const headers = ['Name', 'Default', 'Description'];
            const rows = properties.map((prop) => {
                const des = [];
                if (prop.brief) {
                    des.push(this.replaceUnsafeStrings(publish_1.htmlToMd.translate((0, templateTagResolver_1.runTagResolver)(prop.brief))));
                }
                if (prop.description) {
                    des.push(this.replaceUnsafeStrings(publish_1.htmlToMd.translate((0, templateTagResolver_1.runTagResolver)(prop.description)).replaceAll('\n', '<br />')));
                }
                return [`<code>${prop.name}</code>`, prop.defaultValue, des.join('<br /><br />')];
            });
            propertyString = (0, publish_1.mdTable)([headers, ...rows]);
        }
        return `## Summary\n${propertyString}`;
    }
    save(outdir) {
        const properties = this.getProperties();
        const markdown = `---
id: "${this.mdName}"
title: "Enum: ${this.name}"
sidebar_label: "${this.name}"
custom_edit_url: null
---

${this.getSummary()}

${properties}

    `;
        // ensure the modules directory exists
        fs_1.default.mkdirSync(path_1.default.join(outdir, 'enums'), { recursive: true });
        fs_1.default.writeFileSync(path_1.default.join(outdir, 'enums', `${this.mdName}.mdx`), markdown);
    }
}
exports.Enum = Enum;
