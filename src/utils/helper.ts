// @flow
// This API comes from [jsdoc/lib/]jsdoc/util/templateHelper.js

import { overrideLinkerPlugin } from "./overrides";

const { LinkerPlugin } = require("@webdoc/template-library");
const {
  traverse,
  isMethod,
  isFunction,
  isTypedef,
  isProperty,
} = require("@webdoc/model");

overrideLinkerPlugin();
const linker = new LinkerPlugin();

linker.fileLayout = "linear";
export { linker };

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
export function getMembers(documentTree: any) {
  const members: Record<string, any> = {
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

  traverse(documentTree, (doc: any) => {
    if (
      doc.parent === documentTree &&
      (isMethod(doc) || isFunction(doc) || isProperty(doc) || isTypedef(doc))
    ) {
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

  members.namespaces.sort((m1: any, m2: any) => m1.path.localeCompare(m2.path));
  members.classes.sort((m1: any, m2: any) => m1.path.localeCompare(m2.path));

  // strip quotes from externals, since we allow quoted names that would normally indicate a
  // namespace hierarchy (as in `@external "jquery.fn"`)
  // TODO: we should probably be doing this for other types of symbols, here or elsewhere; see
  // jsdoc3/jsdoc#396
  members.externals = members.externals.map((doclet: any) => {
    doclet.name = doclet.name.replace(/(^"|"$)/g, "");

    return doclet;
  });

  // functions that are also modules (as in `module.exports = function() {};`) are not globals
  // members.globals = members.globals.filter((doclet) => !isModuleExports(doclet));

  return members;
}

type Attribute =
  | "abstract"
  | "async"
  | "generator"
  | "abstract"
  | "virtual"
  | "private"
  | "protected"
  | "static"
  | "inner"
  | "readonly"
  | "constant"
  | "nullable"
  | "non-null";

export function toAttributes(doc: any /*: Doc */) {
  const attribs: Attribute[] = [];

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
}

export function linkTo(...args: any) {
  return linker.linkTo(...args);
}
