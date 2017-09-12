"use strict";

const request  = require('request');
const apiUrl   = process.env.RESPAGE_API_URL;
const apiToken = process.env.RESPAGE_API_TOKEN;

const defaults = {
    headers: {
        'Content-Type': 'application/json',
        'x-access-token': apiToken
    },
    json: true
};


let apiRequest = function(endpoint, options) {
    options.url = `${apiUrl}/${endpoint}`;

    console.log(Object.assign({}, defaults, options));

    return new Promise((resolve, reject) => {
        request(Object.assign({}, defaults, options),
            (err, res, data) => {
                console.log(data);
                return err ? reject(err) : resolve(data.data);
        });
    });
};

module.exports = {
    apiRequest
};
