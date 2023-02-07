"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarnMap = exports.traverse = exports.mkdirpSync = void 0;
const fs_1 = __importDefault(require("fs"));
const mkdirpSync = (filepath) => fs_1.default.mkdirSync(filepath, { recursive: true });
exports.mkdirpSync = mkdirpSync;
function traverse(doc, thing, callback) {
    callback(doc);
    if (!doc[thing])
        return;
    for (let i = 0; i < doc[thing].length; i++) {
        traverse(doc[thing][i], thing, callback);
    }
}
exports.traverse = traverse;
class WarnMap {
    _map;
    constructor() {
        this._map = new Map();
    }
    set(key, value) {
        if (this._map.has(key)) {
            console.warn(`Duplicate key: ${key}`);
        }
        this._map.set(key, value);
    }
    get(key) {
        if (!this._map.has(key)) {
            console.warn(`Key not found: ${key}`);
        }
        return this._map.get(key);
    }
    forEach(callback) {
        this._map.forEach(callback);
    }
    has(key) {
        return this._map.has(key);
    }
    delete(key) {
        return this._map.delete(key);
    }
    clear() {
        return this._map.clear();
    }
    get size() {
        return this._map.size;
    }
    keys() {
        return this._map.keys();
    }
    find(callback) {
        for (const [key, value] of this._map) {
            if (callback(value, key)) {
                return value;
            }
        }
        return undefined;
    }
    map(callback) {
        const result = [];
        for (const [key, value] of this._map) {
            result.push(callback(value, key));
        }
        return result;
    }
}
exports.WarnMap = WarnMap;
