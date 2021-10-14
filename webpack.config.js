
const path = require('path');

module.exports = env => {
    const _env = env['production'] ? 'production' : 'development';

    const config = (target) => {
        return {
            entry: {
                index: './src/index.ts'
            },
            target: target,
            output: {
                path: path.resolve(__dirname, "dist/askless-js-client/"+target+(_env === 'development' ? '-debug' : '')),
                filename: 'index.js',
                library: 'AsklessClient',
                libraryTarget: "umd",
                umdNamedDefine: true,
                globalObject: 'this',
            },
            plugins: [
                new (require('webpack')).DefinePlugin({
                    'process.env.ENV': JSON.stringify(_env),
                    'process.env.TARGET': JSON.stringify(target),
                }),
            ],
            mode: _env,
            resolve: {
                extensions: ['.ts', '.js', '.json']
            },
            module: {
                rules: [
                    {
                        test: /\.ts$/,
                        exclude: [
                            /node_modules/,
                            /scripts/
                        ],
                        use: [
                            {
                                loader: "babel-loader",
                                options: {
                                    presets: [
                                        [
                                            "@babel/preset-env",
                                            {
                                                "targets": {
                                                    "browsers":["last 2 versions"],
                                                    "node":"current"
                                                }
                                            }
                                        ]
                                    ],
                                },
                            },
                            {
                                loader: "ts-loader",
                            },
                        ],
                    },
                ],
            },
        };
    };

    return [config('node'), config('web')]
};



