# node-red-contrib-openpixelcontrol
A node to stream output to an [openpixelcontrol](http://openpixelcontrol.org/) server

# Install

currently from git only

# Usage

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