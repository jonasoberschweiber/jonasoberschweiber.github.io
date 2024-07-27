---
layout: default
title: Network-enabling a Brother printer/scanner
---

A while ago, I needed a printer and scanner for the first time in quite a few
years. I remembered reading an article on [The Verge][1] a while back that
recommended Brother laser printers as the way to go for the most hassle-free
experience. After looking around for a bit, I ended up getting a Brother
MFC-L2750DW for very cheap on eBay Kleinanzeigen (basically Germany’s version
of Craigslist). While I’m generally very happy with the device — it’s got WiFi,
AirPrint, duplex printing, and mostly just works — it does not support scanning
to a network share or scanning to email. I thought it did when I researched it,
but the manual is actually for a few different models and the note that says
that mine does not have those features is easy to miss.

So, no scan-to-share or scan-to-email. What it does have, however, is something
called “Scan to PC”. This is a proprietary mechanism thought up by Brother,
which allows you to scan from the Brother device to a companion app running on
your computer. It uses a proprietary protocol to advertise the PC to the
printer and to then send the image data back to the PC. Thankfully, someone has
already done the work of reversing the protocol and building an open source
implementation called [brother-scand][2].

Brother-scand is designed in a way that allows you to configure an arbitrary
number of targets to advertise to the printer, and to set up a separate program
to run on the data received from the printer for each of those targets. Each
target — called a preset in the config file — shows up as a menu item on the
printer. The application ships with some example configuration files and
scripts and getting it to work was reasonably straightforward, though it did
take a bit of tinkering.

<img src="/images/brother-printer.jpeg" alt="Menu item from brother-scand showing up on the Brother printer" />

In particular, you need a few different programs installed on your machine to
successfully process the data sent by the printer — convert it to PDF, run OCR
on that, send emails, and so on. I’ve packaged up all of those dependencies
into a small [Docker container][3] that should be able to perform
most scan-to-share and scan-to-email functionalities. The app itself works well
in a Docker container, though it does need a [small patch][4] to deal with
not seeing the printer-visible external IP address of the host.

I run brother-scand on a small home server and it’s been pretty solid so far.
Sometimes — rarely — it needs a restart. But I use it a few times a week to
either scan something to email, scan it into a Samba share, or to send it
directly to [paperless-ngx][5].

See the README in the [repo][3] for a more in-depth guide on how to configure
brother-scand.

[1]: https://www.theverge.com/23642073/best-printer-2023-brother-laser-wi-fi-its-fine
[2]: https://github.com/rumpeltux/brother-scand
[3]: https://github.com/jonasoberschweiber/brother-scand-config
[4]: https://github.com/rumpeltux/brother-scand/pull/9
[5]: https://docs.paperless-ngx.com
