---
layout: default
title: Making a WiFi-connected Temperature Sensor
published: false
---

# Making a WiFi-connected Temperature Sensor

[NodeMCU][1] is a firmware for the ESP8266 SoC that makes it easy to program the device in Lua. NodeMCU is also the name of a development board based on the ESP8266. What’s interesting about the ESP8266 is that it is not only very cheap — you can buy the SoC itself for under 2 USD on AliExpress, shipping included — but also WiFi-enabled. A NodeMCU development board goes for about 5 USD including shipping.

![NodeMCU development board](/images/nodemcu-board.jpg)

After attending a [workshop][2] on the NodeMCU at 32C3 I was intrigued and ordered a few devices from AliExpress to play around with ([this][3] is the one that I bought). I used one of the devices to build a WiFi-connected temperature sensor.

My goal was to have a small device that I can connect two temperature sensors to and that will push the readings from both sensors to [Librato][4] every 10 seconds. I used the DS18B20 temperature sensor, a one-wire device. There is a one-wire library available for the NodeMCU, and lots of sample code that deals with reading from the DS18B20, so that part was easy.

![Finished Temperature Sensor](/images/nodemcu-finished.jpg)

NodeMCU also comes with a HTTP library and SSL support, so pushing the readings to Librato should be simple as well. The only problem was that the controller crashed every time I tried to open a SSL connection, so I had to come up with a workaround. Since I don’t consider the measured temperatures particularly sensitive data, I was okay with using plain old non-SSL HTTP as a transport. The solution was a simple proxy written in Go that I run on a small Digital Ocean droplet. NodeMCU has a [crypto][5] module that supports HMAC-SHA256, so doing secure authentication via plain-text HTTP was relatively straight-forward.

The code can be found on [GitHub][6]. Once the software and hardware worked on a breadboard, I built a simple enclosure and connected the temperature sensors via headphone jacks so that I could place them whereever I wanted. The result in Librato looks like this:

![Librato](/images/nodemcu-metrics.png)

[1]: http://nodemcu.com
[2]: https://events.ccc.de/congress/2015/wiki/Session:Building_Internet_of_Things_devices_on_the_cheap
[3]: http://www.aliexpress.com/snapshot/7213978333.html
[4]: http://librato.com
[5]: http://nodemcu.readthedocs.org/en/dev/en/modules/crypto/
[6]: https://github.com/jonasoberschweiber/nodemcu-temperature
