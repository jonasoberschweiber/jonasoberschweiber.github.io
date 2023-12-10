---
layout: default
title: NickelMenu on the Kobo Libra 2
---

# NickelMenu on the Kobo Libra 2

I recently bought a Kobo Libra 2 ereader to replace an aging Kindle Paperwhite
from 2014. The Paperwhite was still holding up okay, but it was becoming quite
slow and I was keen to try the Kobo’s Pocket integration.[^1] I’ve been using
Pocket for years to save articles to read later. I banished my phone and tablet
from the bedroom about a year ago to prevent looking at the news and/or social
media until I actively get my phone from the other room — highly recommended.
But I did miss the ability to read an article or two in bed after waking up or
before going to sleep. The Kobo could solve that issue without having to bring a
doomscrolling machine back into bed.

<img src="/images/kobo-libra-2.jpeg" alt="Kobo Libra 2" />

Having now read a few books and articles on the Kobo, I’m really happy with the
device. It’s quick, has a great screen and a good light for reading in the
dark. Its build quality is good enough. And the Pocket integration does what
it’s supposed to. Sometimes — rarely — articles don’t show up on the Kobo. I
think that happens when they can’t be converted into a compatible format. I
don’t blame them, converting every random, JavaScript-laden website seems like
a hard problem. It works most of the time, and when it does, articles are
formatted nicely and are very readable.

Compared to the Kindle, the Kobo is a very open and hackable device. It’s easy
to gain root access and there’s a number of homebrew apps for it. I found one
of them particularly handy to customise the device a little:
[NickelMenu](https://pgaskin.net/NickelMenu/).

The Kobo has physical page turn buttons, which I like a lot. Never missed them
on the Kindle, but now that I have them… When reading in bed, I sometimes like
to lie on my side, placing the reader on the mattress in front of my face, with
the page turn button side in my hand. This works great in principle, but the
Kobo also has an auto-rotate feature. And that will often switch to a landscape
mode when I hold the device the way I like to hold it. You can lock the
rotation to portrait, but not to “inverted portrait”, which is what I’d need.

That’s where NickelMenu comes in. NickelMenu can add new menu entries to a
variety of screens on the Kobo, and make those entries do a variety of things
— navigate the UI, change system settings, even start other programs and run
scripts.

One such setting happens to be the screen orientation. With a [very easy
installation](https://pgaskin.net/NickelMenu/#install) and a small configuration
file, I can add new entries that switch to portrait mode and inverted portrait
mode.

```
menu_item   :reader     :Portrait R   :nickel_orientation   :portrait
menu_item   :reader     :Portrait L   :nickel_orientation   :inverted_portrait
```

Works flawlessly. It even remaps the buttons depending on the orientation, so
the top page turn button always goes to the next page. I'm also using
NickelMenu to quickly toggle dark mode on and off. And it came in handy to
quickly enable screenshot mode to get the image below. Adding new menu entries
is as easy as connecting the Kobo to a computer and editing the config file.

<img
    src="/images/nickelmenu-portrait.jpeg"
    alt="Menu entries to choose portrait mode"
    style="border: 1px solid #333; padding: 3px;"
/>

[^1]: I'll repurpose the Kindle in some way — maybe try to reuse the display
    using [EPDiy](https://github.com/vroland/epdiy).

