"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Package = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const publish_1 = require("../../publish");
const Base_1 = require("./Base");
class Package extends Base_1.Base {
    get(map, title, loc) {
        const all = [];
        map.forEach((ns) => {
            // check if class is part of a namespace
            // if it is then you need to add the namespace to the path
            if (ns.mdName.includes(this.mdName)) {
                all.push(`* [${ns.name}](../${loc}/${ns.mdName})`);
            }
        });
        if (all.length === 0) {
            return '';
        }
        all.unshift(`## ${title}`);
        return `${all.join('\n')}\n`;
    }
    getProperties() {
        const props = [...this.doc.members].filter((member) => member.type === 'PropertyDoc' && member.access !== 'private');
        return this.formatProperties(props);
    }
    getFunctions() {
        const funcs = [...this.doc.members].filter((member) => member.type === 'FunctionDoc' && member.access !== 'private');
        return this.formatMethods(funcs, '## Functions');
    }
    save(outdir) {
        const nsData = this.get(publish_1.namespaces, 'Namespaces', 'namespaces');
        const enumData = this.get(publish_1.enums, 'Enums', 'enums');
        const classData = this.get(publish_1.classes, 'Classes', 'classes');
        const interfaceData = this.get(publish_1.interfaces, 'Interfaces', 'interfaces');
        const props = this.getProperties();
        const funcs = this.getFunctions();
        // TODO: get typedefs
        // TODO: get functions
        // TODO: get variables
        // TODO: get events
        const allData = nsData + enumData + classData + interfaceData + props + funcs;
        const markdown = `---
id: "${this.mdName}"
title: "Module: ${this.name}"
sidebar_label: "${this.name}"
sidebar_position: 0
custom_edit_url: null
---
${allData}
    `;
        // ensure the modules directory exists
        fs_1.default.mkdirSync(path_1.default.join(outdir, 'modules'), { recursive: true });
        fs_1.default.writeFileSync(path_1.default.join(outdir, 'modules', `${this.mdName}.mdx`), markdown);
    }
}
exports.Package = Package;
