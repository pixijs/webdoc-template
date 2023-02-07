import fs from 'fs';

import type { Doc } from '@webdoc/model';

export const mkdirpSync = (filepath: string) => fs.mkdirSync(filepath, { recursive: true });

export function traverse<T extends Doc>(doc: T, thing: 'api' | 'members', callback: (doc: Doc) => void)
{
    callback(doc);

    if (!(doc as any)[thing]) return;
    for (let i = 0; i < (doc as any)[thing].length; i++)
    {
        traverse((doc as any)[thing][i], thing, callback);
    }
}

export class WarnMap<T, K>
{
    private _map: Map<T, K>;

    constructor()
    {
        this._map = new Map();
    }

    set(key: T, value: K)
    {
        if (this._map.has(key))
        {
            console.warn(`Duplicate key: ${key}`);
        }
        this._map.set(key, value);
    }

    get(key: T)
    {
        if (!this._map.has(key))
        {
            console.warn(`Key not found: ${key}`);
        }

        return this._map.get(key);
    }

    forEach(callback: (value: K, key: T) => void)
    {
        this._map.forEach(callback);
    }

    has(key: T)
    {
        return this._map.has(key);
    }

    delete(key: T)
    {
        return this._map.delete(key);
    }

    clear()
    {
        return this._map.clear();
    }

    get size()
    {
        return this._map.size;
    }

    keys()
    {
        return this._map.keys();
    }

    find(callback: (value: K, key: T) => boolean)
    {
        for (const [key, value] of this._map)
        {
            if (callback(value, key))
            {
                return value;
            }
        }

        return undefined;
    }

    map<U>(callback: (value: K, key: T) => U)
    {
        const result = [];

        for (const [key, value] of this._map)
        {
            result.push(callback(value, key));
        }

        return result;
    }
}
