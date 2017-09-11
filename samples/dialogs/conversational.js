let util = require('util');
let LuisActions = require('../../core');

let Hello = {
    intentName: 'Hello',
    friendlyName: 'Hello',
    confirmOnContextSwitch: false,
    schema: {
        username: {
            type: 'string',
            optional: true
        }
    },
    fulfill: function (parameters, callback) {
        if (parameters.username) {

        }
        callback(`What's up ${parameters.username || 'Doc'}?`);
    }
};

module.exports = [ Hello ];