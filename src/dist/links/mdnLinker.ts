import { resolveCanvasName } from './mdn/canvas';
import { resolveCssName } from './mdn/css';
import { resolveDomName } from './mdn/dom';
import { resolveGlobalName } from './mdn/globalObjects';
import { resolveWebAudioName } from './mdn/webaudio';

export function mdnLinker(name: string)
{
    return resolveGlobalName(name)
            ?? resolveDomName(name)
            ?? resolveCssName(name)
            ?? resolveCanvasName(name)
            ?? resolveWebAudioName(name);
}
