module.exports = {
    "presets": [
        "@babel/preset-flow",
        [
            "latest-node",
            {
                "target": "current"
            }
        ]
    ],
    "plugins": [
        "@babel/plugin-proposal-object-rest-spread",
        "@babel/plugin-proposal-class-properties"
    ],
    "sourceMaps": "inline",
    "retainLines": true
}
