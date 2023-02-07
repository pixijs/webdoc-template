"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Base = void 0;
const publish_1 = require("../../publish");
const linker_1 = require("../links/linker");
const templateTagResolver_1 = require("../templates/templateTagResolver");
const utils_1 = require("../utils");
class Base {
    name;
    mdName;
    doc;
    separator = '\n---------------------------------------\n';
    unsafeString = [
        ['|', '&#124;'],
        ['<', '&#60;'],
        ['>', '&#62;'],
        ['@', '&#64;'],
        [':', '&#58;'],
        ['{', '&#123;'],
        ['}', '&#125;'],
    ];
    constructor(name, mdName, doc) {
        this.name = name;
        this.mdName = mdName;
        this.doc = doc;
    }
    getPackage() {
        const pkg = this.doc.loc?.file.package;
        const res = publish_1.packages.find((p) => p.name === pkg.name);
        if (!res) {
            throw new Error(`Could not find package ${pkg.name}`);
        }
        return res;
    }
    getMembersOfType(type) {
        // loop through all the members of the interface
        const members = [];
        (0, utils_1.traverse)(this.doc, 'members', (member) => {
            if (member.access === 'private' || member.type !== type || member.name === 'constructor') {
                return;
            }
            members.push(member);
        });
        return members;
    }
    replaceUnsafeStrings(str) {
        let res = str;
        const codeBlocks = new Map();
        const regex = [
            /`([^`]*)`/g,
            /^```(?:|javascript|js)\n([\s\S]*?)```$/gm,
        ];
        regex.forEach((reg) => {
            // replace all matches with placeholders
            res = res.replace(reg, (match) => {
                const placeholder = `__CODE_BLOCK_${codeBlocks.size}__`;
                codeBlocks.set(placeholder, match);
                return placeholder;
            });
        });
        this.unsafeString.forEach((rep) => {
            res = res.replaceAll(rep[0], rep[1]);
        });
        // replace all placeholders with code blocks
        codeBlocks.forEach((block, placeholder) => {
            res = res.replace(placeholder, block);
        });
        return res;
    }
    getExamples(doc = this.doc) {
        const examples = doc.examples;
        if (!examples || examples.length === 0) {
            return '';
        }
        const all = examples.map((ex) => `
\`\`\`js
${ex.code}
\`\`\`
      `);
        return all.join('\n');
    }
    getPropertyEntry(prop, useSignature = false) {
        // TODO: adding span onto the heading leads to extremely long lines in the sidebar
        const isDeprecated = prop.tags?.find((tag) => tag.name === 'deprecated');
        const name = prop.name;
        const brief = prop.brief;
        const description = prop.description;
        const examples = this.getExamples(prop);
        const defaultValue = prop.defaultValue;
        const dataType = prop.dataType?.[0] ?? 'unknown';
        let res = '### ';
        res += `${name}`;
        // TODO: link to type
        if (useSignature) {
            res += `: <span><code>${this.replaceUnsafeStrings(this.createSignature(prop))}</code></span>\n`;
        }
        else {
            if (dataType === 'unknown') {
                // console.warn(`Unknown data type for property ${name} in ${this.name}`);
            }
            res += `: <span><code>${this.replaceUnsafeStrings(dataType)}</code></span>\n`;
        }
        if (isDeprecated) {
            // remove last new line
            res = res.slice(0, -1);
            res += `<span class="deprecated-tag"> Deprecated: ${isDeprecated.deprecated}</span>\n`;
        }
        if (defaultValue) {
            // TODO: link to default value
            res += `- **Default Value**: <code>${this.replaceUnsafeStrings(defaultValue)}</code>\n\n`;
        }
        if (brief)
            res += `${this.replaceUnsafeStrings(publish_1.htmlToMd.translate((0, templateTagResolver_1.runTagResolver)(brief)))}\n`;
        if (description)
            res += `${this.replaceUnsafeStrings(publish_1.htmlToMd.translate((0, templateTagResolver_1.runTagResolver)(description)))}\n`;
        if (examples)
            res += `${examples}\n`;
        return res;
    }
    formatProperties(props, name = '## Members') {
        if (!props || props.length === 0) {
            return '';
        }
        const all = [name];
        props.forEach((prop) => {
            all.push(`<article>\n\n${this.getPropertyEntry(prop)}\n</article>\n`);
            all.push(this.separator);
        });
        return all.join('\n');
    }
    createSignature(method, includeReturnType = true) {
        let signature = ``;
        const params = method.params;
        const returns = method.returns;
        const returnMarker = includeReturnType ? '->' : '';
        signature += params
            ? `(${params
                .filter((param) => !param.identifier.includes('.'))
                .map((param) => `${param.identifier}: ${param.dataType?.[0] ?? ''}`)
                .join(', ')}) ${returnMarker}`
            : `() ${returnMarker}`;
        if (!includeReturnType)
            return signature;
        signature += returns
            ? ` ${returns.map((ret) => ret.dataType?.[0] ?? '').join(' | ')}`
            : ' void';
        return signature;
    }
    getMethodEntry(method) {
        let res = this.getPropertyEntry(method, true);
        const params = method.params;
        const returns = method.returns;
        if ((!params || params.length === 0) && (!returns || returns.length === 0))
            return res;
        const getType = (type) => {
            if (!type.dataType)
                return '';
            return `<code>${this.replaceUnsafeStrings(type.dataType[0])}</code>`;
        };
        const getDescription = (type) => {
            if (!type.description)
                return '';
            return this.replaceUnsafeStrings(publish_1.htmlToMd.translate((0, templateTagResolver_1.runTagResolver)(type.description)).replaceAll('\n', '<br />'));
        };
        if (params && params.length > 0) {
            const headers = ['Name', 'Type', 'Description'];
            const rows = params.map((param) => [param.identifier, getType(param), getDescription(param)]);
            res += `\n#### Parameters:\n${(0, publish_1.mdTable)([headers, ...rows])}`;
        }
        if (returns && returns.length > 0) {
            const includesVoid = returns.every((ret) => ret.dataType?.[0] === 'void' && !ret.description);
            if (includesVoid)
                return res;
            const headers = ['Type', 'Description'];
            const rows = returns.map((ret) => [getType(ret), getDescription(ret)]);
            res += `\n#### Returns:\n${(0, publish_1.mdTable)([headers, ...rows])}`;
        }
        return res;
    }
    formatMethods(methods, name = '## Methods') {
        if (!methods || methods.length === 0) {
            return '';
        }
        const all = [name];
        methods.forEach((method) => {
            all.push(`<article>\n\n${this.getMethodEntry(method)}\n</article>\n`);
            all.push(this.separator);
        });
        return all.join('\n');
    }
    getExtends() {
        const strings = [];
        this.doc.extends?.forEach((ext) => {
            // TODO: this might need to be changed to include namespace path
            const doc = ext;
            let symbolPath = '';
            if (!doc.name) {
                symbolPath = ext;
            }
            else if (doc.parent?.type === 'NSDoc') {
                symbolPath = `${doc.parent.name}.${doc.name}`;
            }
            else {
                symbolPath = doc.name;
            }
            strings.push(`- ${this.replaceUnsafeStrings((0, linker_1.linkTo)(symbolPath, symbolPath))}`);
        });
        if (strings.length === 0)
            return '';
        return `## Extends\n${strings.join('\n')}`;
    }
    getSummary() {
        const pkg = this.getPackage();
        // If name includes a dot then it should link to a namespace
        // not a package
        const path = this.name.includes('.')
            ? `${this.name.split('.')[1]}`
            : this.name;
        return `[${pkg.name}](../modules/${pkg.mdName}).${path}

${this.replaceUnsafeStrings(publish_1.htmlToMd.translate((0, templateTagResolver_1.runTagResolver)(this.doc.brief)))}
${this.replaceUnsafeStrings(publish_1.htmlToMd.translate((0, templateTagResolver_1.runTagResolver)(this.doc.description)))}

${this.getExamples()}

// TODO: @see

        `;
    }
}
exports.Base = Base;
