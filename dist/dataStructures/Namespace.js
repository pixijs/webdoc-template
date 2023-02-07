"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Namespace = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const publish_1 = require("../../publish");
const Base_1 = require("./Base");
class Namespace extends Base_1.Base {
    getProperties() {
        const props = [...this.doc.members].filter((member) => member.type === 'PropertyDoc' && member.access !== 'private');
        return this.formatProperties(props);
    }
    getFunctions() {
        const funcs = [...this.doc.members].filter((member) => member.type === 'FunctionDoc' && member.access !== 'private');
        return this.formatMethods(funcs, '## Functions');
    }
    getList(type, map, name) {
        const typeMap = {
            ClassDoc: 'classes',
            InterfaceDoc: 'interfaces',
            EnumDoc: 'enums',
        };
        const cls = this.getMembersOfType(type);
        let string = [];
        if (cls.length > 0) {
            string = cls.map((cls) => {
                // check if class is part of a namespace
                // if it is then you need to add the namespace to the path
                const name = cls.parent?.type === 'NSDoc' ? `${cls.parent.name}.${cls.name}` : cls.name;
                const mappedClass = map.find((c) => c.name === name);
                return `* [${name}](../${typeMap[type]}/${mappedClass.mdName})`;
            });
            string.unshift(`## ${name}`);
        }
        return string.join('\n');
    }
    save(outdir) {
        const cl = this.getList('ClassDoc', publish_1.classes, 'Classes');
        const int = this.getList('InterfaceDoc', publish_1.interfaces, 'Interfaces');
        const en = this.getList('EnumDoc', publish_1.enums, 'Enums');
        const funcs = this.getFunctions();
        const props = this.getProperties();
        const markdown = `---
id: "${this.mdName}"
title: "Namespace: ${this.name}"
sidebar_label: "${this.name}"
custom_edit_url: null
---

${this.getSummary()}

${cl}

${int}

${en}

${props}

${funcs}


    `;
        // ensure the modules directory exists
        fs_1.default.mkdirSync(path_1.default.join(outdir, 'namespaces'), { recursive: true });
        fs_1.default.writeFileSync(path_1.default.join(outdir, 'namespaces', `${this.mdName}.mdx`), markdown);
    }
}
exports.Namespace = Namespace;
