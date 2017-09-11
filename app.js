require('dotenv-extended').load({ path: '../.env' });

var builder = require('botbuilder');
var restify = require('restify');
var request = require('request');
var R = require('ramda');
var moment = require('moment');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});
// Create connector and listen for messages
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector, function (session) {
    session.send('Sorry, I did not understand \'%s\'. Type \'help\' if you need assistance.', session.message.text);
});

console.log(process.env.LUIS_MODEL_URL);

var recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);
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
        let targetDate = builder.EntityRecognizer.parseTime(args.intent.entities);

        console.log(args);
        console.log(targetDate);

        session.dialogData.bed_count = bedCount || null;
        session.dialogData.date = targetDate || null;

        if (!session.dialogData.bed_count && unit_type) {
            session.dialogData.bed_count = 0;
        }

        if (!session.dialogData.bed_count && bedCount) {
            session.dialogData.bed_count = bedCount.resolution ? bedCount.resolution.value : null;
        }

        if (!session.dialogData.date && targetDate && targetDate.resolution && targetDate.resolution.values) {
            session.dialogData.date = targetDate.resolution.values[0].start;
        }

        console.log('date', targetDate);

        next();
    },
    function(session, results, next) {
        if (!session.dialogData.bed_count) {
            builder.Prompts.number(session, 'How many bedrooms are you looking for?', {
                integerOnly: true,
                minValue: 0,
                maxValue: 3,
                maxRetries: 2,
                inputHint: '0-3'
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
                ?results.response.resolution.start : null;
        }

        if (session.dialogData.date) {
            session.dialogData.date = moment(session.dialogData.date).format('YYYY-MM-DD');
        }

        console.log(session.dialogData.date);

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