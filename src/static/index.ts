import $ from 'jquery';
import './styles/index.scss';

// global config defined on the HTML page
declare const config: any;

function highlight(anchor: JQuery<HTMLAnchorElement>, textToHighlight: string)
{
    const originalText = anchor.text();
    const indexOfMatch = originalText
        .toLowerCase()
        .indexOf(textToHighlight.toLowerCase());

    if (indexOfMatch >= 0)
    {
    // Split the text into three parts: before the match, the match, and after the match
        const beforeMatch = originalText.slice(0, indexOfMatch);
        const matchText = originalText.slice(
            indexOfMatch,
            indexOfMatch + textToHighlight.length,
        );
        const afterMatch = originalText.slice(
            indexOfMatch + textToHighlight.length,
        );

        // Create a new HTML string with the match wrapped in a span
        const newHtml = `${beforeMatch}<span>${matchText}</span>${afterMatch}`;

        // Set the new HTML to the anchor element
        anchor.html(newHtml);
    }
}

$(() =>
{
    const $nav = $('.navigation');
    const $list = $nav.find('.list');

    // Show an item related a current documentation automatically
    $nav.addClass('not-searching');
    const filename = $('.page-title')
        .data('filename')
        .replace(/\.[a-z]+$/, '');

    // Directly matching the filename and the top-level item's data-name attribute.
    let $currentItem = $nav.find(`.item[data-name="${filename}"]:eq(0)`);

    // Fallback to default querying for the likes of interfaces which doesn't
    // have its own top-level navigation item.
    if (!$currentItem.length)
    {
        $currentItem = $nav
            .find(`a[href*="${filename}"]:eq(0)`)
            .closest('.item');
    }

    if ($currentItem.length)
    {
        // if a child then show the top level parent and highlight the
        // current item.
        if ($currentItem.parents('.children').length)
        {
            $currentItem.addClass('current');
            // need to make all children not current
            $currentItem.find('li.item').addClass('notCurrent');
            $currentItem = $currentItem.parents('ul.list>li.item');
        }
        $currentItem.addClass('current');
    }

    const $search = $('.search');
    const $items = $nav.find('.item');

    // Store the original ordering of the items with the namespace items sorted alphabetically.
    const originalOrder = $items.toArray().sort((a, b) =>
    {
        const isACurrent = a.classList.contains('current');
        const isBCurrent = b.classList.contains('current');

        // 'current' or active item should come first.
        if (isACurrent && !isBCurrent)
        {
            return -1;
        }
        else if (!isACurrent && isBCurrent)
        {
            return 1;
        }

        // Sort the namespace items alphabetically.
        const isANamespaceItem = a.classList.contains('namespaceItem');
        const isBNamespaceItem = b.classList.contains('namespaceItem');

        if (isANamespaceItem && isBNamespaceItem)
        {
            const nameA = a.getAttribute('data-name')?.split('.').pop() ?? '';
            const nameB = b.getAttribute('data-name')?.split('.').pop() ?? '';

            return nameA.localeCompare(nameB);
        }
        // Prioritize namespace items.
        else if (isANamespaceItem)
        {
            return 1;
        }
        else if (isBNamespaceItem)
        {
            return -1;
        }

        return 0;
    });

    // Apply the sorted original order.
    $('.list').empty().append(originalOrder);

    const searchInput = document.getElementById('search') as HTMLInputElement;

    // Search input
    $('#search').on('keyup', () =>
    {
    // Clear any highlights
        $nav.find('a.highlight').each((_, v) =>
        {
            $(v).find('span').first().contents()
                .unwrap();
            $(v).removeClass('highlight');
        });

        const value = searchInput.value.trim();
        const valueLowerCase = value.toLowerCase();

        if (value)
        {
            const regexp = new RegExp(value, 'i');

            $nav
                .addClass('searching')
                .removeClass('not-searching')
                .find('li, .itemMembers')
                .removeClass('match');

            $nav.find('li').each((_, v) =>
            {
                const $item = $(v);
                const name = $item.data('name');

                if (name)
                {
                    const extracted = name.split('.').pop();

                    if (regexp.test(extracted))
                    {
                        $item.addClass('match');
                        $item.closest('.itemMembers').addClass('match');
                        $item.closest('.item').addClass('match');

                        // Highlight the nested title element for the top-level item
                        const $title = $(
                            $item.find('.title > a').first(),
                        ) as JQuery<HTMLAnchorElement>;

                        $title.addClass('highlight');
                        highlight($title, value);

                        // Highlight the nested member elements for the nested sub-groups
                        $item.children('.match > a').each((_, v) =>
                        {
                            const $v = $(v) as JQuery<HTMLAnchorElement>;

                            $v.addClass('highlight');
                            highlight($v, value);
                        });
                    }
                }
            });

            // Order the list items
            ($items as any).sort((a: JQuery<HTMLElement>, b: JQuery<HTMLElement>) =>
            {
                const aText = $(a).text().toLowerCase();
                const bText = $(b).text().toLowerCase();
                const aIndex = aText.indexOf(valueLowerCase);
                const bIndex = bText.indexOf(valueLowerCase);

                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;

                return aIndex - bIndex;
            });
            $('.list').append($items);
        }
        else
        {
            $nav
                .removeClass('searching')
                .addClass('not-searching')
                .find('.item, .itemMembers')
                .removeClass('match');

            // Restore original items ordering
            $('.list').empty().append(originalOrder);
        }
        $list.scrollTop(0);
    });

    $('#menuToggle').click(() =>
    {
        $list.toggleClass('show');
        $search.toggleClass('show');
    });

    // disqus code
    if (config.disqus)
    {
        $(window).on('load', () =>
        {
            const disqusShortname = config.disqus; // required: replace example with your forum shortname
            const dsq = document.createElement('script');

            dsq.type = 'text/javascript';
            dsq.async = true;
            dsq.src = `http://${disqusShortname}.disqus.com/embed.js`;
            (
                document.getElementsByTagName('head')[0]
        || document.getElementsByTagName('body')[0]
            ).appendChild(dsq);
            const s = document.createElement('script');

            s.async = true;
            s.type = 'text/javascript';
            s.src = `http://${disqusShortname}.disqus.com/count.js`;
            document.getElementsByTagName('BODY')[0].appendChild(s);
        });
    }

    // Manually scroll to hash, in case it was attempted before the content was loaded.
    if (window.location.hash)
    {
        const hash = window.location.hash;
        const el = document.querySelector(hash);

        if (el)
        {
            el.scrollIntoView();
        }
    }
});
