#!/bin/bash

FONT_DIR=/usr/share/fonts
KAI_FONT_NAME="AR PL UKai CN"
KAI_FONT_NAME_NO_SPACE="ARPLUKaiCN"

# TODO: Check prerequisites

cd langdata

if [ ! -r training_text.txt ]; then
	echo "[ERROR] training_text.txt doesn't exist"
	exit 1
fi

# Get chi_sim.$KAI_FONT_NAME_NO_SPACE.exp0.box
# Get chi_sim.$KAI_FONT_NAME_NO_SPACE.exp0.tif
text2image --text=training_text.txt --outputbase=chi_sim.$KAI_FONT_NAME_NO_SPACE.exp0 --font="$KAI_FONT_NAME" --fonts_dir=$FONT_DIR

# export TESSDATA_PREFIX=$(readlink -f ../)

# Get chi_sim.$KAI_FONT_NAME_NO_SPACE.exp0.tr
tesseract chi_sim.$KAI_FONT_NAME_NO_SPACE.exp0.tif chi_sim.$KAI_FONT_NAME_NO_SPACE.exp0 box.train

# Get unicharset
unicharset_extractor chi_sim.$KAI_FONT_NAME_NO_SPACE.exp0.box

# Get chi_sim.unicharset
# Get chi_sim.inttemp
# Get chi_sim.pffmtable
# Get chi_sim.shapetable
mftraining -F font_properties -U unicharset -O chi_sim.unicharset chi_sim.$KAI_FONT_NAME_NO_SPACE.exp0.tr
mv inttemp chi_sim.inttemp
mv pffmtable chi_sim.pffmtable
mv shapetable chi_sim.shapetable

# Get chi_sim.normproto
cntraining chi_sim.$KAI_FONT_NAME_NO_SPACE.exp0.tr
mv normproto chi_sim.normproto

# Get chi_sim.traineddata
combine_tessdata chi_sim.

mv chi_sim.traineddata ../tessdata/

exit 0
