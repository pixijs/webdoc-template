"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Interface = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const publish_1 = require("../../publish");
const templateTagResolver_1 = require("../templates/templateTagResolver");
const Base_1 = require("./Base");
class Interface extends Base_1.Base {
    getInterfaceSummary() {
        const properties = this.getMembersOfType('PropertyDoc');
        const methods = this.getMembersOfType('MethodDoc');
        let propertyString = '';
        if ((!properties || properties.length === 0) && (!methods || methods.length === 0)) {
            return '';
        }
        // TODO: add links to properties in current page
        if (properties.length > 0) {
            const headers = ['Name', 'Type', 'Description'];
            const rows = properties.map((prop) => {
                // replace all with replacements
                const dataTypes = `<code>${this.replaceUnsafeStrings(prop.dataType[0])}</code>`;
                const des = [];
                if (prop.brief) {
                    des.push(this.replaceUnsafeStrings(publish_1.htmlToMd.translate((0, templateTagResolver_1.runTagResolver)(prop.brief))));
                }
                if (prop.description) {
                    des.push(this.replaceUnsafeStrings(publish_1.htmlToMd.translate((0, templateTagResolver_1.runTagResolver)(prop.description)).replaceAll('\n', '<br />')));
                }
                return [prop.name, dataTypes, des.join('<br /><br />')];
            });
            const table = (0, publish_1.mdTable)([headers, ...rows]);
            propertyString = this.buildTable('Properties', table);
        }
        let methodString = '';
        if (methods.length > 0) {
            const headers = ['Name', 'Params', 'Description'];
            const rows = methods.map((method) => {
                // replace all with replacements
                const des = [];
                if (method.brief) {
                    des.push(this.replaceUnsafeStrings(publish_1.htmlToMd.translate((0, templateTagResolver_1.runTagResolver)(method.brief))));
                }
                if (method.description) {
                    des.push(this.replaceUnsafeStrings(publish_1.htmlToMd.translate((0, templateTagResolver_1.runTagResolver)(method.description)).replaceAll('\n', '<br />')));
                }
                const params = `<code>${this.replaceUnsafeStrings(this.createSignature(method, false))}</code>`;
                return [method.name, params, des.join('<br /><br />')];
            });
            const table = (0, publish_1.mdTable)([headers, ...rows]);
            methodString = this.buildTable('Methods', table);
        }
        return `## Summary\n${propertyString}\n${methodString}`;
    }
    buildTable(name, table) {
        return `
<details><summary>${name}</summary>
<p>

${table}

</p>
</details>
    `;
    }
    save(outdir) {
        const summary = this.getInterfaceSummary();
        const exts = this.getExtends();
        const properties = this.formatProperties(this.getMembersOfType('PropertyDoc'));
        const methods = this.formatMethods(this.getMembersOfType('MethodDoc'));
        const markdown = `---
id: "${this.mdName}"
title: "Interface: ${this.name}"
sidebar_label: "${this.name}"
custom_edit_url: null
---

${this.getSummary()}

${summary}

${exts}

${properties}

${methods}
  `;
        // ensure the modules directory exists
        fs_1.default.mkdirSync(path_1.default.join(outdir, 'interfaces'), { recursive: true });
        fs_1.default.writeFileSync(path_1.default.join(outdir, 'interfaces', `${this.mdName}.mdx`), markdown);
    }
}
exports.Interface = Interface;
