module.exports = async function (context) {
    const density2px = {
        ldpi: 36,
        mdpi: 48,
        hdpi: 72,
        xhdpi: 96,
        xxhdpi: 144,
        xxxhdpi: 192
    };

    const iconSourceTypes = ['src', 'foreground', 'background'];
    const iconSources = {};
    const iconSourceWarned = {};

    const sharp = require('sharp');
    const deferred = require('q').defer();
    const fs = require('fs');
    const path = require('path');
    const pjXML = require('pjxml');

    function readFileSafe(...args) {
        try {
            return fs.readFileSync(...args);
        } catch {
            return null;
        }
    }

    async function readSvg(path) {
        try {
            return await sharp(path);
        } catch {
            return null;
        }
    }

    const iconSvg = await readSvg(context.opts.projectRoot + '/res/icon.svg');
    const backgroundSvg = await readSvg(context.opts.projectRoot + '/res/icon-background.svg');

    async function getIconSource(source) {
        if (source in iconSources) {
            return iconSources[source];
        }

        const sourcePath = context.opts.projectRoot + '/res/icon-' + source + '.svg';

        try {
            iconSources[source] = await readSvg(sourcePath);
        } catch {
            if (!iconSourceWarned[source]) {
                console.error('iconbuild: icon source SVG corrupt or missing', sourcePath);
                iconSourceWarned[source] = true;
            }
        }

        return iconSources[source];
    }

    function toInt(v) {
        const n = parseInt(v);

        return isNaN(n) ? null : n;
    }

    function getIconDimensions(elIcon) {
        // the priority is:
        //   explicit height/width attributes
        //   density attribute
        //   default to 1024
        const dims = {
            width: toInt(elIcon.attributes.width),
            height: toInt(elIcon.attributes.height)
        };

        const {density} = elIcon.attributes;
        if (density) {
            dims.width = dims.width || density2px[density];
            dims.height = dims.height || density2px[density];
        }

        if (!dims.width || !dims.height) {
            console.warn('iconbuild: missing width or height on', elIcon.xml(), 'defaulting to 1024');
            dims.width = dims.width || 1024;
            dims.height = dims.height || 1024;
        }

        return dims;
    }

    async function processIconType(elIcon, iconType) {
        const targetPath = elIcon.attributes[iconType];

        if (targetPath && fs.existsSync(targetPath)) {
            return;
        }

        const dims = getIconDimensions(elIcon);

        const folder = context.opts.projectRoot + '/' + path.dirname(targetPath);
        fs.mkdirSync(folder, {recursive: true});

        const iconSvg = await getIconSource(iconType);

        iconSvg.resize({width: dims.width})
            .toFile(context.opts.projectRoot + '/' + targetPath);

        console.info('iconbuild: created ' + dims.width + 'x' + dims.height + ' icon', targetPath);
    }

    async function processIcons(elIcon) {
        iconSourceTypes.forEach((iconType) => {
            if (iconType in elIcon.attributes){
                processIconType(elIcon, iconType);
            }
        });
    }

    const configXML = fs.readFileSync(context.opts.projectRoot + '/config.xml', 'utf8');
    const doc = pjXML.parse(configXML);
    const icons = doc.selectAll('//icon');

    if (iconSvg) {
        icons.forEach(processIcons);
    }

    deferred.resolve();
    return deferred;
}
