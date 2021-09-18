const path = require('path')

const host = '0.0.0.0'
const port = 8085

module.exports = {
    lintOnSave: false,

    devServer: {
        port,
        host,
        hotOnly: true,
        disableHostCheck: true,
        clientLogLevel: 'warning',
        inline: true,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
        },
    }
}
