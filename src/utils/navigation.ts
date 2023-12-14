import { each } from "lodash";

class Navigable {
  type: "class" | "global" | "namespace";
  name: string;
  path: string;
  deprecated: boolean;
  classes: any[]; // ClassDoc[]
  members: any[];
  methods: any[]; // MethodDoc[]
  events: any[]; // EventDoc[]
  interfaces: any[]; // InterfaceDoc[]
  enums: any[]; // EnumDoc[]
  typedefs: any[]; // TypedefDoc[]
  tutorials: any[]; // TutorialDoc[]

  constructor(
    doc: any /*{ name: string, path: string, deprecated: boolean, members: any[] }*/,
    type: any /*"class" | "namespace"*/
  ) {
    this.type = type;
    this.name = doc.name;
    this.path = doc.path;
    this.deprecated = doc.deprecated;

    this.classes = [];
    this.members = [];
    this.methods = [];
    this.events = [];
    this.interfaces = [];
    this.enums = [];
    this.typedefs = [];
    this.tutorials = [];

    // Loop through all the members and push them into the appropriate category.
    doc.members.forEach((child: any) => {
      if (child.access === "private" || child.undocumented) {
        return;
      }

      switch (child.type) {
        case "ClassDoc":
          this.classes.push(child);
          break;
        case "NSDoc":
          break;
        case "PropertyDoc":
          this.members.push(child);
          break;
        case "MethodDoc":
        case "FunctionDoc":
          if (child.name !== "constructor") {
            this.methods.push(child);
          }
          break;
        case "EventDoc":
          this.events.push(child);
          break;
        case "InterfaceDoc":
          this.interfaces.push(child);
          break;
        case "EnumDoc":
          this.enums.push(child);
          break;
        case "TypedefDoc":
          this.typedefs.push(child);
          break;
        case "TutorialDoc":
          this.tutorials.push(child);
          break;
        default:
          console.log("Unknown doc-type " + child.type);
      }
    });
  }
}

/**
 * Creates a list of "navigable" entries that are fed into navigation.tmpl
 * to generate the main navigation bar.
 */
export function buildNavigation(members: any) {
  const nav = [];

  /*
  if (members.modules.length) {
      each(members.modules, function (v) {
          nav.push({
              type: 'module',
              longname: v.longname,
              deprecated: v.deprecated,
              name: v.name,
              members: find({
                  kind: 'member',
                  memberof: v.longname
              }),
              methods: find({
                  kind: 'function',
                  memberof: v.longname
              }),
              typedefs: find({
                  kind: 'typedef',
                  memberof: v.longname
              }),
              interfaces: find({
                  kind: 'interface',
                  memberof: v.longname
              }),
              events: find({
                  kind: 'event',
                  memberof: v.longname
              }),
              classes: find({
                  kind: 'class',
                  memberof: v.longname
              })
          });
      });
  }
  */

  if (members.namespaces.length) {
    each(members.namespaces, function (nsDoc: any) {
      nav.push(new Navigable(nsDoc, "namespace"));
    });
  }

  if (members.globals.length) {
    nav.push(
      new Navigable(
        {
          type: "NSDoc",
          name: "globals",
          path: "globals",
          members: members.globals,
        },
        "namespace"
      )
    );
  }

  if (members.classes.length) {
    each(members.classes, (classDoc: any) => {
      nav.push(new Navigable(classDoc, "class"));
    });
  }

  // if (members.tutorials.length) {
  //   each(members.tutorials, function(v: any) {
  //     nav.push(new Navigable(tutorialDoc, "tutorial"));
  //   });
  // }

  return nav;
}

// const hasOwnProp = Object.prototype.hasOwnProperty;
// function buildMemberNav(
//   items: any,
//   itemHeading: any,
//   itemsSeen: any,
//   linktoFn: any
// ) {
//   let nav = "";

//   if (items.length) {
//     let itemsNav = "";

//     items.forEach((item: any) => {
//       let displayName;

//       if (!hasOwnProp.call(item, "path")) {
//         itemsNav += `<li>${linktoFn("", item.name)}</li>`;
//       } else if (!hasOwnProp.call(itemsSeen, item.path)) {
//         if (env.conf.templates.default.useLongnameInNav) {
//           displayName = item.path;
//         } else {
//           displayName = item.name;
//         }
//         publishLog.warn(tag.ContentBar, "Linking " + item.path);
//         itemsNav += `<li>${linktoFn(
//           item.path,
//           displayName.replace(/\b(module|event):/g, "")
//         )}</li>`; // eslint-disable-line max-len

//         itemsSeen[item.path] = true;
//       }
//     });

//     if (itemsNav !== "") {
//       nav += `<h3>${itemHeading}</h3><ul>${itemsNav}</ul>`;
//     }
//   }

//   return nav;
// }
