#!/bin/bash

WEBSITE_DIR="../promise-me-website"
BUILD_DIR="$WEBSITE_DIR/builds/promise-me-website"

MONTAGE=$(basename $(echo $BUILD_DIR/packages/montage*))

FILES="index.html
index.html.bundle-0.js
examples.json.load.js
ui/demo.reel/demo.css
packages/$MONTAGE/ui/select.reel/select.css
packages/$MONTAGE/ui/select.reel/select.png
packages/$MONTAGE/ui/textarea.reel/textarea.css"

# exception for bootstrap, as mop currently strips syntax that it doesn't
# understand, such as gradients
f="assets/style/bootstrap.min.css"
echo $WEBSITE_DIR/$f
dir=`dirname $f`
mkdir -p $dir
cp $WEBSITE_DIR/$f $dir

for f in $FILES; do
    echo $BUILD_DIR/$f
    dir=`dirname $f`
    mkdir -p $dir
    cp $BUILD_DIR/$f $dir
done
