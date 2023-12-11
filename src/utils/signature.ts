import { linkToDataType } from "./helper";

/*::
type Signature = {
  params: [Param],
  returns: [Return]
}
*/

export function needsSignature(doc: any /*: Doc */) {
  // Functions, methods, and properties always have signatures.
  if (doc.type === "FunctionDoc" || doc.type === "MethodDoc") {
    return true;
  }
  // Class constructors documented as classes have signatures.
  if (doc.type === "ClassDoc" && doc.params) {
    return true;
  }

  // TODO: Need to resolve this one!
  /*
    // Typedefs containing functions have signatures.
    if (doc.type === "TypedefDoc" && doc.of && type.names &&
          type.names.length) {
      for (let i = 0, l = type.names.length; i < l; i++) {
        if (type.names[i].toLowerCase() === "function") {
          return true;
        }
      }
    }*/

  return false;
}

export const SignatureBuilder = {
  appendParameters(doc: any /*: Doc */) {
    const params = doc.params;

    if (!params) {
      return;
    }

    const paramTypes = params
      .filter(
        (param: any) => param.identifier && !param.identifier.includes(".")
      )
      .map((item: any) => {
        let itemName = item.identifier || "";

        if (item.variadic) {
          itemName = `&hellip;${itemName}`;
        }

        return itemName;
      });

    let paramTypesString = "";

    if (paramTypes.length) {
      paramTypesString = paramTypes.join(", ");
    }

    doc.signature = `${doc.signature || ""}(${paramTypesString})`;
  },
  appendReturns(doc: any /*: Doc */) {
    const returns = doc.returns || doc.yields;

    if (!returns) {
      return;
    }

    let returnTypes = [];
    let returnTypesString = "";

    returnTypes = returns.map((ret: any) => linkToDataType(ret.dataType));

    if (returnTypes.length) {
      returnTypesString = ` ${returnTypes.join("|")}`;
    }

    doc.signature =
      `<span class="signature">${doc.signature || ""}</span>` +
      `<span class="type-signature">${returnTypesString}</span>`;
  },
  appendType(doc: any /*: Doc */) {
    const types = doc.dataType ? linkToDataType(doc.dataType) : "";

    doc.signature = `${
      doc.signature || ""
    }<span class="type-signature">${types}</span>`;
  },
};
