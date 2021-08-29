# cordova-plugin-iconbuild
Automatically build Cordova app icons from SVG source files.

## usage
The plugin processes all `<icon>` elements in `config.xml`. It
looks for `src`, `foreground`, and `background` attributes. If
the referenced icon doesn't exist, it will create it using
the corresponding svg file:
* `res/icon-src.svg`
* `res/icon-foreground.svg`
* `res/icon-background.svg`
