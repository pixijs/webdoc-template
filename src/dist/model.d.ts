declare module '@webdoc/model'
{
    export type DataType = (string | DocLink)[] & { template: string };

    export type SourceFile = {
        content?: string;
        path: string;
        package: PackageDoc;
    };

    export type ParserOpts = {
        memberof?: string[];
        object?: string;
        undocumented?: boolean;
        undocumentedAnchored?: boolean;
    };

    export type Param = {
        identifier: string;
        dataType?: Partial<DataType>;
        description: string;
        optional?: boolean;
        default?: string;
        variadic?: boolean;
    };

    export type Example = {
        caption: string;
        code: string;
    };

    export type SymbolLocation = {
        start: { line: number; column: number };
        end: { line: number; column: number };
        file: SourceFile;
        fileName: string;
    };

    export type Typedef = {
        of: string[];
        alias: string;
    };

    export type TypedDesc = {
        dataType?: DataType;
        description: string;
    };

    export type DocLink = Doc | string;

    export type Return = TypedDesc;

    export type BaseDoc = {
        id: string;
        name: string;
        path: string;
        stack: string[];
        parent?: Doc;
        children?: Doc[];
        members: Doc[];
        tags?: Tag[];
        brief?: string;
        description?: string;
        abstract?: boolean;
        access?: 'public' | 'protected' | 'private';
        authors?: string[];
        copyright?: string;
        defaultValue?: string;
        deprecated?: string | boolean;
        extends?: DocLink[];
        examples?: Example[];
        fires?: [];
        license?: string;
        loc?: SymbolLocation;
        readonly?: boolean;
        scope?: 'static' | 'instance' | 'inner' | 'default';
        see?: DocLink[];
        since?: string;
        todo?: string[];
        throws?: DocLink[];
        version?: 'alpha' | 'beta' | 'internal' | 'public' | 'deprecated';
        parserOpts?: ParserOpts;
    };

    export type DocType =
    | 'RootDoc'
    | 'ClassDoc'
    | 'EnumDoc'
    | 'EventDoc'
    | 'InterfaceDoc'
    | 'ObjectDoc'
    | 'FunctionDoc'
    | 'NSDoc'
    | 'MethodDoc'
    | 'MixinDoc'
    | 'PackageDoc'
    | 'PropertyDoc'
    | 'TutorialDoc'
    | 'TypedefDoc';

    export type Doc =
    | RootDoc
    | ClassDoc
    | EnumDoc
    | EventDoc
    | FunctionDoc
    | InterfaceDoc
    | ObjectDoc
    | NSDoc
    | MethodDoc
    | MixinDoc
    | PackageDoc
    | PropertyDoc
    | TutorialDoc
    | TypedefDoc;

    export type DocShape =
    | RootDoc
    | ClassDoc
    | EnumDoc
    | EventDoc
    | FunctionDoc
    | InterfaceDoc
    | ObjectDoc
    | NSDoc
    | MethodDoc
    | MixinDoc
    | PackageDoc
    | PropertyDoc
    | TutorialDoc
    | TypedefDoc;

    export type RootDoc = BaseDoc & {
        packages: PackageDoc[];
        tutorials: TutorialDoc[];
        type: 'RootDoc';
    };

    export type ClassDoc = BaseDoc & {
        params?: Param[];
        implements?: DocLink[];
        mixes?: [];
        returns?: Return[];
        type: 'ClassDoc';
    };

    export type EnumDoc = BaseDoc & {
        dataType?: Partial<DataType>;
        type: 'EnumDoc';
    };

    export type EventDoc = BaseDoc & {
        eventType: string;
        params?: Param[];
        type: 'EventDoc';
    };

    export type FunctionDoc = BaseDoc & {
        params: Param[];
        returns: Return[];
        type: 'FunctionDoc';
    };

    export type InterfaceDoc = BaseDoc & {
        type: 'InterfaceDoc';
    };

    export type MethodDoc = BaseDoc & {
        params: Param[];
        returns: Return[];
        inherited: boolean;
        inherits: MethodDoc;
        overrides: boolean;
        type: 'MethodDoc';
    };

    export type MixinDoc = BaseDoc & {
        mixes?: [];
        type: 'MixinDoc';
    };

    export type NSDoc = BaseDoc & {
        type: 'NSDoc';
    };

    export type ObjectDoc = BaseDoc & {
        implements?: DocLink[];
        mixes?: [];
        type: 'ObjectDoc';
    };

    export type PackageDoc = BaseDoc & {
        api: Doc[];
        location: string;
        metadata: Object;
        type: 'PackageDoc';
    };

    export type PropertyDoc = BaseDoc & {
        constant?: boolean;
        dataType?: DataType;
        dataValue?: string; // Enumerations/constants
        defaultValue?: string;
        inherited?: boolean;
        inherits?: PropertyDoc;
        optional?: boolean;
        readonly?: boolean;
        type: 'PropertyDoc';
    };

    export type Tutorial = BaseDoc & {
        title: string;
        content: string;
        route: string;
        type: 'TutorialDoc';
    };

    export type TutorialDoc = Tutorial;

    export type TypedefDoc = BaseDoc & {
        of: [string];
        alias: string;
        dataType?: Partial<DataType>;
        type: 'TypedefDoc';
        implements?: DocLink[];
    };

    export type BaseTag = {
        name: string;
        value: string;
    };

    export type TagType =
    | 'AbstractTag'
    | 'AccessTag'
    | 'AuthorTag'
    | 'CopyrightTag'
    | 'DefaultTag'
    | 'DeprecatedTag'
    | 'ExampleTag'
    | 'EnumTag'
    | 'ExtendsTag'
    | 'GroupTag'
    | 'InnerTag'
    | 'InterfaceTag'
    | 'MemberTag'
    | 'MemberofTag'
    | 'MethodTag'
    | 'MixesTag'
    | 'MixinTag'
    | 'NameTag'
    | 'NSTag'
    | 'LicenseTag'
    | 'ParamTag'
    | 'ReadonlyTag'
    | 'ReturnTag'
    | 'SeeTag'
    | 'SinceTag'
    | 'TodoTag'
    | 'ImplementsTag'
    | 'ThrowsTag'
    | 'PrivateTag'
    | 'PropertyTag'
    | 'ProtectedTag'
    | 'PublicTag';

    export type Tag =
    | AbstractTag
    | AccessTag
    | AuthorTag
    | ClassDescTag
    | CopyrightTag
    | DefaultTag
    | DeprecatedTag
    | ExampleTag
    | EnumTag
    | ExtendsTag
    | GroupTag
    | InnerTag
    | InterfaceTag
    | MemberTag
    | MemberofTag
    | MethodTag
    | MixesTag
    | MixinTag
    | NameTag
    | NSTag
    | LicenseTag
    | ParamTag
    | ReadonlyTag
    | ReturnTag
    | SeeTag
    | SinceTag
    | TodoTag
    | ImplementsTag
    | ThrowsTag
    | PrivateTag
    | PropertyTag
    | ProtectedTag
    | PublicTag;

    export type TagShape =
    | AbstractTag
    | AccessTag
    | AuthorTag
    | ClassDescTag
    | CopyrightTag
    | DefaultTag
    | DeprecatedTag
    | ExampleTag
    | EnumTag
    | ExtendsTag
    | GroupTag
    | InnerTag
    | InterfaceTag
    | MemberTag
    | MemberofTag
    | MethodTag
    | MixesTag
    | MixinTag
    | NameTag
    | NSTag
    | LicenseTag
    | ParamTag
    | ReadonlyTag
    | ReturnTag
    | SeeTag
    | SinceTag
    | TodoTag
    | ImplementsTag
    | ThrowsTag
    | PrivateTag
    | PropertyTag
    | ProtectedTag
    | PublicTag;

    export type AbstractTag = BaseTag & {
        type: 'AbstractTag';
    };

    export type AccessTag = BaseTag & {
        access: 'public' | 'protected' | 'private';
        type: 'AccessTag';
    };

    export type AuthorTag = BaseTag & {
        type: 'AuthorTag';
    };

    export type ClassDescTag = BaseTag & {
        type: 'ClassDescTag';
    };

    export type CopyrightTag = BaseTag & {
        type: 'CopyrightTag';
    };

    export type DefaultTag = BaseTag & {
        type: 'DefaultTag';
    };

    export type DeprecatedTag = BaseTag & {
        deprecated: string | boolean;
        type: 'DeprecatedTag';
    };

    export type EnumTag = BaseTag & {
        type: 'EnumTag';
    };

    export type EventTag = BaseTag & {
        event: string;
        type: 'EventTag';
    };

    export type ExampleTag = BaseTag & {
        code: string;
        type: 'ExampleTag';
    };

    export type ExtendsTag = BaseTag & {
        type: 'ExtendsTag';
    };

    export type FiresTag = BaseTag & {
        event: string;
        type: 'FiresTag';
    };

    export type GroupTag = BaseTag & {
        type: 'GroupTag';
    };

    export type ImplementsTag = BaseTag & {
        type: 'ImplementsTag';
    };

    export type InnerTag = BaseTag & {
        type: 'InnerTag';
    };

    export type InterfaceTag = BaseTag & {
        type: 'InterfaceTag';
    };

    export type InstanceTag = BaseTag & {
        type: 'InstanceTag';
    };

    export type LicenseTag = BaseTag & {
        type: 'LicenseTag';
    };

    export type MemberTag = BaseTag & {
        dataType: DataType;
        type: 'MemberTag';
    };

    export type MemberofTag = BaseTag & {
        scope: string;
        type: 'MemberofTag';
    };

    export type MethodTag = BaseTag & {
        type: 'MethodTag';
    };

    export type MixesTag = BaseTag & {
        type: 'MixesTag';
    };

    export type MixinTag = BaseTag & {
        type: 'MixinTag';
    };

    export type NameTag = BaseTag & {
        alias: string;
        type: 'NameTag';
    };

    export type NSTag = BaseTag & {
        type: 'NSTag';
    };

    export type ParamTag = TypedTag & {
        identifier: string;
        description: string;
        optional?: boolean;
        default?: string;
        variadic?: boolean;
        type: 'ParamTag';
    };

    export type ReadonlyTag = BaseTag & {
        type: 'ReadonlyTag';
    };

    export type ReturnTag = TypedTag & {
        type: 'ReturnTag';
    };

    export type SeeTag = BaseTag & {
        type: 'SeeTag';
    };

    export type SinceTag = BaseTag & {
        type: 'SinceTag';
    };

    export type StaticTag = BaseTag & {
        type: 'StaticTag';
    };

    export type ScopeTag = BaseTag & {
        scope: 'static' | 'instance' | 'inner';
        type: 'ScopeTag';
    };

    export type TodoTag = BaseTag & {
        type: 'TodoTag';
    };

    export type ThrowsTag = TypedTag & {
        type: 'ThrowsTag';
    };

    export type TypeTag = BaseTag & {
        dataType: Partial<DataType>;
        type: 'TypeTag';
    };

    export type TypedTag = BaseTag & {
        dataType?: string;
        description: string;
    };

    export type TypedefTag = BaseTag & {
        dataType?: Partial<DataType>;
        alias: string;
        type: 'TypedefTag';
    };

    export type PrivateTag = BaseTag & {
        type: 'PrivateTag';
    };

    export type PropertyTag = TypedTag & {
        type: 'PropertyTag';
    };

    export type ProtectedTag = BaseTag & {
        type: 'ProtectedTag';
    };

    export type PublicTag = BaseTag & {
        type: 'PublicTag';
    };

    export function addChildDoc<T = BaseDoc>(doc: T, scope: BaseDoc): T;
    export function addDoc<T = BaseDoc>(doc: BaseDoc, root: BaseDoc): T;
    export function createDoc(name?: string, type?: DocType, options?: any): BaseDoc;
    export function childDoc(lname: string, scope: BaseDoc): BaseDoc;
    export function createRootDoc(): RootDoc;
    export function doc(path: string | string[], root: BaseDoc): BaseDoc;
    export function mangled(doc: Doc): string;
    export function traverse(doc: Doc, callback: (doc: Doc) => void): void;

    export function isDataType(obj: Partial<DataType>): boolean;
    export function createDataType(): DataType;

    export function isConstructor(doc: Doc): boolean;
    export function isClass(doc: Doc): boolean;
    export function isEvent(doc: Doc): boolean;
    export function isExternal(doc: Doc): boolean;
    export function isFunction(doc: Doc): boolean;
    export function isInterface(doc: Doc): boolean;
    export function isMethod(doc: Doc): boolean;
    export function isModule(doc: Doc): boolean;
    export function isMixin(doc: Doc): boolean;
    export function isNamespace(doc: Doc): boolean;
    export function isObject(doc: Doc): boolean;
    export function isProperty(doc: Doc): boolean;
    export function isTypedef(doc: Doc): boolean;
}
