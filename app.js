"use strict";

require('dotenv-extended').load({ path: './.env' });

let builder = require('botbuilder');
let restify = require('restify');
let request = require('request');
let R = require('ramda');
let moment = require('moment');
let dateEntityRecognizer = require('./services/date-entity-recognizer');

// Setup Restify Server
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});
// Create connector and listen for messages
let connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
server.post('/api/messages', connector.listen());

let bot = new builder.UniversalBot(connector, function (session) {
    session.send('Sorry, I did not understand \'%s\'. Type \'help\' if you need assistance.', session.message.text);
});

let recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);
bot.recognizer(recognizer);

bot.dialog('Hello', [
    function (session, args, next) {
        let name = builder.EntityRecognizer.findEntity(args.intent.entities, 'username');

        session.send(`Hi ${name ? name.entity : ''}! I'm chatbot... Pleased to make your acquaintance`);


        let phrase = 'Are you a current resident, or are you looking for an awesome new apartment?';
        let choices = ['Current Resident', 'Looking for a new apartment'];
        builder.Prompts.choice(session, phrase, choices, {listStyle: 3});
        session.endDialog();
    }
]).triggerAction({
    matches: 'Hello'
});

bot.dialog('LookingForApartment', [
    function (session, args) {
        if (args && args.reprompt) {
            builder.Prompts.text(session, "Oo... That doesn't look valid. Could you please enter your email address or phone number?")
        } else {
            builder.Prompts.text(session, "Great! I'll be happy to assist you. Could you provide your email address or phone number?");
        }
    },
    function (session, results, next) {
        let email = extractValidEmail(results.response);
        let phone = extractValidPhone(results.response);

        session.userData.email = email || null;
        session.userData.phone = phone || null;

        if (!email && !phone) {
            session.replaceDialog('LookingForApartment', { reprompt: true });
        } else {
            session.send('Awesome! Thanks');
            next()
        }
    },
    function(session, results) {
        console.log(session.userData);
        builder.Prompts.choice(session, 'What would you like to learn about today', ['Amenities', 'Pet Policy', 'Fees', 'Availability', 'Pricing'], {listStyle: 3});
    }
]).triggerAction({
    matches: 'LookingForApartment'
});

bot.dialog('Availability', [
    function(session, args, next) {
        let unit_type  = builder.EntityRecognizer.findEntity(args.intent.entities, 'unit_type');
        let bedCount   = builder.EntityRecognizer.findEntity(args.intent.entities, 'builtin.number');
        let targetDate = dateEntityRecognizer.parseTime(args.intent.entities);

        if (!session.dialogData.bed_count && unit_type) {
            session.dialogData.bed_count = 0;
        }

        if (!session.dialogData.bed_count && bedCount) {
            session.dialogData.bed_count = bedCount.resolution ? bedCount.resolution.value : null;
        }

        if (!session.dialogData.date) {
            session.dialogData.date = targetDate;
        }

        next();
    },
    function(session, results, next) {
        if (!session.dialogData.bed_count) {
            builder.Prompts.number(session, 'How many bedrooms are you looking for?', {
                integerOnly: true,
                minValue: 0,
                maxValue: 3,
                maxRetries: 2,
            })
        } else {
            next();
        }
    },
    function(session, results, next) {
        if (!session.dialogData.bed_count) {
            session.dialogData.bed_count = results ? results.response : null;
        }

        if (!session.dialogData.date) {
            builder.Prompts.time(session, 'when would you like to move in by?');
        } else {
            next();
        }
    },
    function(session, results) {
        if (!session.dialogData.date && results) {
            session.dialogData.date = results && results.response && results.response.resolution
                ? results.response.resolution.start || results.response.resolution.values[0].value : null;
        }

        if (session.dialogData.date) {
            session.dialogData.date = moment.utc(session.dialogData.date).format('YYYY-MM-DD');
        }

        session.endDialog('You are looking for a ' +session.dialogData.bed_count+ ' bedroom unit available by ' + moment(session.dialogData.date).format('L'));
    }
]).triggerAction({
    matches: 'Availability'
});

/** EMAIL PHONE RESPONSE */
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