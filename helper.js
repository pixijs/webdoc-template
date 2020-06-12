// @flow
// This API comes from [jsdoc/lib/]jsdoc/util/templateHelper.js

const {SymbolLinks} = require("@webdoc/template-library");
const {traverse, isMethod, isFunction, isTypedef, isProperty} = require("@webdoc/model");

Object.defineProperty(exports, "pathToUrl", {
  get() {
    return Object.fromEntries(SymbolLinks.pathToUrl);
  },
});

// TODO {@link } {@code }
exports.resolveLinks = (i) => i;

/**
 * Retrieve all of the following types of members from a set of doclets:
 *
 * + Classes
 * + Externals
 * + Globals
 * + Mixins
 * + Modules
 * + Namespaces
 * + Events
 * @param {TAFFY} data The TaffyDB database to search.
 * @return {object} An object with `classes`, `externals`, `globals`, `mixins`, `modules`,
 * `events`, and `namespaces` properties. Each property contains an array of objects.
 */
exports.getMembers = (documentTree /*: RootDoc */) => {
  const members = {
    classes: [],
    externals: [],
    events: [],
    globals: [],
    mixins: [],
    modules: [],
    namespaces: [],
    interfaces: [],
    tutorials: [],
  };

  traverse(documentTree, (doc) => {
    if (doc.parent === documentTree &&
        (isMethod(doc) || isFunction(doc) || isProperty(doc) || isTypedef(doc))) {
      // members.globals.push(doc);
      return;
    }
    if (doc.undocumented || doc.access === "private") {
      return;
    }

    switch (doc.type) {
    case "ClassDoc":
      members.classes.push(doc);
      break;
    case "ExternalDoc":
      members.externals.push(doc);
      break;
    case "EventDoc":
      members.events.push(doc);
      break;
    case "ModuleDoc":
      members.modules.push(doc);
      break;
    case "NSDoc":
      members.namespaces.push(doc);
      break;
    case "InterfaceDoc":
      members.interfaces.push(doc);
      break;
    case "TutorialDoc":
      members.tutorials.push(doc);
      break;
    }
  });

  members.namespaces.sort((m1, m2) => m1.path.localeCompare(m2.path));
  members.classes.sort((m1, m2) => m1.path.localeCompare(m2.path));

  // strip quotes from externals, since we allow quoted names that would normally indicate a
  // namespace hierarchy (as in `@external "jquery.fn"`)
  // TODO: we should probably be doing this for other types of symbols, here or elsewhere; see
  // jsdoc3/jsdoc#396
  members.externals = members.externals.map((doclet) => {
    doclet.name = doclet.name.replace(/(^"|"$)/g, "");

    return doclet;
  });

  // functions that are also modules (as in `module.exports = function() {};`) are not globals
  // members.globals = members.globals.filter((doclet) => !isModuleExports(doclet));

  return members;
};

const toHtmlSafeString = exports.toHtmlSafeString = (str /*: string */) /*: string */ => {
  if (typeof str !== "string") {
    str = String(str);
  }

  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;");
};

/*::
type Attribute = "abstract" | "async" | "generator" | "abstract" | "virtual" | "private" | "protected" |
  "static" | "inner" | "readonly" | "constant" | "nullable" | "non-null"
*/

// This is not a constructor
exports.Attributes = (doc /*: Doc */) => /*: Attribute[] */ {
  const attribs /*: Attribute[] */ = [];

  if (!doc) {
    return attribs;
  }

  if (doc.abstract) {
    attribs.push("abstract");
  }

  if (doc.async) {
    attribs.push("async");
  }

  if (doc.generator) {
    attribs.push("generator");
  }

  if (doc.virtual) {
    attribs.push("abstract");
  }

  if (doc.access && doc.access !== "public") {
    attribs.push(doc.access);
  }

  if (doc.scope && doc.scope !== "instance" && doc.scope !== "global") {
    if (doc.type === "MethodDoc" || doc.type === "PropertyDoc") {
      attribs.push(doc.scope);
    }
  }

  if (doc.readonly) {
    if (doc.type === "PropertyDoc") {
      attribs.push("readonly");
    }
  }

  if (doc.nullable === true) {
    attribs.push("nullable");
  } else if (doc.nullable === false) {
    attribs.push("non-null");
  }

  return attribs;
};

exports.toAttributeString = (attribs /*: Attribute */) /*: string */ => {
  const attribsString = "";

  if (attribs && attribs.length) {
    toHtmlSafeString(`(${attribs.join(", ")}) `);
  }

  return attribsString;
};

exports.buildLink = SymbolLinks.buildLink;
exports.linkto = SymbolLinks.linkTo;
exports.getAncestorLinks = (data, doc, cssClass) =>
  SymbolLinks.getAncestorLinks(doc, cssClass);// JSDoc Compat
exports.registerLink = SymbolLinks.registerLink;
exports.createLink = SymbolLinks.createLink;
exports.getUniqueFilename = SymbolLinks.generateFileName;
