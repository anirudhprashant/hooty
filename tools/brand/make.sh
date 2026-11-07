#!/usr/bin/env bash
# Render Hooty's brand images into public/. Needs chromium and ffmpeg.
set -euo pipefail
cd "$(dirname "$0")"; P=../../public; T=$(mktemp -d)
shot(){ chromium --headless=new --disable-gpu --hide-scrollbars --default-background-color=00000000 --window-size=$2,$3 --virtual-time-budget=2000 --screenshot=$T/$1.png "file://$PWD/brand.html?a=$1" 2>/dev/null; }
shot stage 800 800; shot mark 192 192; shot favicon 64 64; shot icon 512 512; shot maskable 512 512; shot apple 180 180; shot og 1200 630
mkdir -p $P/characters/blob
for m in idle happy wrong; do shot guide-$m 800 800; shot avatar-$m 256 256
  ffmpeg -v error -y -i $T/guide-$m.png -c:v libwebp -q:v 90 $P/characters/blob/hooty-$m.webp
  ffmpeg -v error -y -i $T/avatar-$m.png -c:v libwebp -q:v 92 $P/characters/blob/hooty-avatar-$m.webp; done
ffmpeg -v error -y -i $T/stage.png -c:v libwebp -lossless 0 -q:v 90 $P/characters/blob/hooty-stage.webp
ffmpeg -v error -y -i $T/mark.png -c:v libwebp -q:v 92 $P/characters/blob/hooty-mark.webp
cp $T/favicon.png $P/assets/icons/favicon-64.png
cp $T/icon.png $P/assets/icons/icon-512.png; ffmpeg -v error -y -i $T/icon.png -vf scale=192:192:flags=lanczos $P/assets/icons/icon-192.png
cp $T/maskable.png $P/assets/icons/icon-maskable-512.png; ffmpeg -v error -y -i $T/maskable.png -vf scale=192:192:flags=lanczos $P/assets/icons/icon-maskable-192.png
cp $T/apple.png $P/assets/icons/apple-touch-icon.png
ffmpeg -v error -y -i $T/favicon.png -vf scale=32:32:flags=lanczos $T/f32.png; ffmpeg -v error -y -i $T/favicon.png -vf scale=16:16:flags=lanczos $T/f16.png
ffmpeg -v error -y -i $T/f32.png -i $T/f16.png -map 0 -map 1 $P/favicon.ico
ffmpeg -v error -y -i $T/og.png -q:v 3 $P/og.jpg
cp $T/og.png "$T/../hooty-og-preview.png" 2>/dev/null || true
rm -rf $T; echo "brand images written"
