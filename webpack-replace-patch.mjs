'use strict';

import webpack from 'webpack';

/*
Simple regex-based find-and-replace in webpack bundles.

Plugin structure credit: https://stackoverflow.com/a/72267981
*/

export class BundleReplacePlugin {
    rules;

    constructor(rules) {
        this.rules = rules;
    }

    apply(compiler) {
        compiler.hooks.thisCompilation.tap('Replace', (compilation) => {
            compilation.hooks.processAssets.tap(
                {name: 'BundleReplacePlugin', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL},
                (_assets) => {
                    for (const rule of this.rules) {
                        let fileContent = compilation.getAsset(rule.fileName);
                        fileContent = fileContent.source.source().replace(rule.from, rule.to);
                        compilation.updateAsset(rule.fileName, new webpack.sources.RawSource(fileContent));
                    }
                }
            );
        });
    }
}
