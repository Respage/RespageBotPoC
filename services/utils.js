"use strict";

const R = require('R');

let extractValidEmail = function(message) {
    if (!message) return null;

    let parts = message.replace(/,/g,'').split(/\s/).map(x => x.replace(/^,|^\.|,$|\.$/g, ''));

    for (let i = 0; parts && i < parts.length; i++) {
        if (isValidEmail(parts[i])) return parts[i];
    }

    return null;
};

let extractValidPhone = function(message) {
    if (!message) return null;

    let email = extractValidEmail(message) || '';

    let parts = message.replace(email, '').replace(/\W/g, '').match(/\d+/g);

    for (let i = 0; parts && i < parts.length; i++) {
        if (isValidPhone(parts[i])) return parts[i];
    }

    return null;
};

let isValidEmail = function(email) {
    const MAX_EMAIL_LENGTH = 254;
    const MAX_EMAIL_NAME_LENGTH = 64;
    const MAX_EMAIL_DOMAIN_LENGTH = 63;
    const EMAIL_TEST = /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-?\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

    if (!email) return false;
    if (email.length > MAX_EMAIL_LENGTH) return false;
    if (!EMAIL_TEST.test(email)) return false;

    let parts = email.split('@');
    if (parts[0].length > MAX_EMAIL_NAME_LENGTH) return false;

    let domainParts = parts[1].split('.');
    return !R.any(x => x.length > MAX_EMAIL_DOMAIN_LENGTH)(domainParts);
};

let isValidPhone = function(phone) {
    let stripped = phone.replace(/\D/g,'');

    if (stripped.length === 7)  return true; //555-0123
    if (stripped.length === 10) return true; //800-555-0123
    if (stripped.length === 11 && stripped.startsWith('1')) return true; //1-800-555-0123

    return false;
};

module.exports = {
    extractValidEmail,
    extractValidPhone
};