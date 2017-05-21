# node-red-contrib-openpixelcontrol

*THIS NODE IS CURRENTLY WORK IN PROGRESS AND FOR PUBLIC USAGE*

A node to stream output to an [openpixelcontrol](http://openpixelcontrol.org/) server.
The OPC-Protocol is a lightweight and simple TCP network protocol to change several RGB-color values of lights or LEDs.
As the protocol is frame streamlined is typically used for LED light strips arrangements but basically it depends on the server implementation.
Therefore the OPC supports a `channel` and `command` field to address other systems or run system specific commands. 

See [OPC Server](#opc_server) for information how to setup a openpixelcontrol server on a Raspberry with an attached WS2812 LED strip.

This node-set consists of the following nodes:
- *colorspot*: highlights pixel with a given width and color, can be used to create an empty buffer as well
- *colormix*: transform one or multiple inputs (array) to a mixed color array. (TODO: You can mirror or mask data as well)
- *opc-client*: the node will collect input data and send new data at the defined updaterate (eg. 50Hz).

# Install

currently from git only

# Usage

Inputs
Color Mixing

# Performance
The node respects the nodejs underlying buffers performance recommendations (buffers from pool <4k, Uint8arrays, array reusage, unsafe alloc).


TBD

# Examples

## Animation

## Mixing colors

## Websocket Bridge to use WebAudio 

FFT on client per Webaudio 
Altenrative https://www.npmjs.com/package/fft.js

## Using chroma.js mix colors easy

chroma.js
https://github.com/colorjs


## Timing, Synchronisation and Playback

FSM node

## FFT with the RaspberryPi


# Testing

Testing can be done by simulation of an OPC Server witn an OpenGL output, so you do not need the LEDs physically.
OPC Simulator (OpenGL): https://github.com/zestyping/openpixelcontrol

# OPC Server

There are different openpixelcontrol servers available, like [fadecandy](https://github.com/scanlime/fadecandy).
Nodejs OPC Client and Server: [openpixelcontrol-stream](https://github.com/beyondscreen/node-openpixelcontrol) 
Nodejs OPC Server für RPI ws2812 native: https://github.com/bbx10/node-opc-server 

## RaspberryPi

For the reaspberry Pi 

Testsetup with  WS2812: http://popoklopsi.github.io/RaspberryPi-LedStrip/?_escaped_fragment_=/ws2812#!/ws2812

native ws2812 rasppbery: https://github.com/jgarff/rpi_ws281x
Nodejs Wrapper: https://github.com/beyondscreen/node-rpi-ws281x-native


# Related Work

https://flows.nodered.org/node/node-red-contrib-ola
https://flows.nodered.org/node/node-red-contrib-rpi-ws2801
https://flows.nodered.org/node/node-red-node-pi-neopixel
https://www.openlighting.org/
http://openpixelcontrol.org/
https://github.com/scanlime/fadecandy
https://github.com/zestyping/openpixelcontrol

# Working with colors
https://github.com/brehaut/color-js
https://github.com/bgrins/TinyColor
http://gka.github.io/chroma.js/

# Useful other nodes
http://flows.nodered.org/node/node-red-contrib-looptimer
http://flows.nodered.org/node/node-red-contrib-stoptimer
http://flows.nodered.org/node/node-red-contrib-curve