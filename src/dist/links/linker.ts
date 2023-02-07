import { classes, enums, interfaces, namespaces } from '../../publish';
import { mdnLinker } from './mdnLinker';

/**
 * FederatedEvents
 * FederatedEvents.method
 * FederatedEvents#event
 * FederatedEvents#method
 *
 * PIXI.FederatedEvents
 * PIXI.FederatedEvents.method
 * PIXI.FederatedEvents#event
 * PIXI.FederatedEvents#method
 *
 * @pixi/events.FederatedEvents
 * @pixi/events.FederatedEvents.method
 * @pixi/events.FederatedEvents#event
 * @pixi/events.FederatedEvents#method
 *
 * someFunction / type / interface / class / member
 * PIXI.someFunction
 * @pixi/core.someFunction
 *
 * settings.SCALE_MODES
 * PIXI.settings.SCALE_MODES
 * @pixi/settings.SCALE_MODES
 */

export function linkTo(link: string, linkText: string)
{
    // classes now include there namespace
    // so if there is 1 dot then use the full thing
    // if there are 2 dots then use the first as the class and the second as the member
    // if there is nothing then try to link it

    const dots = link.split('.');
    let res: string | undefined;

    if (dots.length >= 2)
    {
        let cls = `${dots[0]}.${dots[1]}`;
        const member = dots[2] ?? cls.split('#')[1];

        cls = cls.split('#')[0];

        res = linkToBasic(cls, member, linkText);
    }

    if (res)
    {
        console.log(`Linking to class: ${link} -> ${res}`);

        return res;
    }

    res = mdnLinker(link);

    if (res)
    {
        console.log(`Linking to MDN: ${link} -> ${res}`);

        return `[${linkText ?? link}](${res})`;
    }

    console.log(`Linking to unknown: ${link}`);

    return `${linkText ?? link}`;
}

function linkToBasic(cls: string, member: string, linkName: string)
{
    let type;
    const find = (cls_: { name: string }, ty: string) =>
    {
        if (cls_.name === cls) type = ty;

        return cls_.name === cls;
    };
    const classLink = classes.find((cls) => find(cls, 'classes'))
    ?? interfaces.find((cls) => find(cls, 'interfaces'))
    ?? enums.find((cls) => find(cls, 'enums'))
    ?? namespaces.find((cls) => find(cls, 'namespaces'));
    // TODO: can also be a link to a typedef which would exist on a namespace
    // Could also be a member or method of a namespace
    // could also be a member or method of a package

    if (!classLink) return undefined;

    // if there is a third dot then it is a method
    if (member && type !== 'enums')
    {
        return `[${linkName ?? cls}](../${type}/${classLink.mdName}#${member})`;
    }

    return `[${linkName ?? cls}](../${type}/${classLink.mdName})`;
}
