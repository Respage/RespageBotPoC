"use strict";

if (!process.env.NODE_ENV) require('dotenv-extended').load({ path: './config/.env' });

let builder = require('botbuilder');
let botbuilder_azure = require("botbuilder-azure");
let R = require('ramda');
let moment = require('moment');
let dateEntityRecognizer = require('./services/date-entity-recognizer');
let aptListingService = require('./services/apartment-listings');
let formatter = require('./services/response-formatter');
let utils = require('./services/utils');

let useEmulator = (process.env.NODE_ENV == 'development');


let connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MICROSOFT_APP_ID'],
    appPassword: process.env['MICROSOFT_APP_PASSWORD']
});

let bot = new builder.UniversalBot(connector, function (session) {
    session.send('Sorry, I did not understand \'%s\'. Type \'help\' if you need assistance.', session.message.text);
});
let recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);
bot.recognizer(recognizer);

bot.dialog('Hello', [
    function (session, args, next) {
        session.send(`Hi! I'm chatbot... Thanks for stopping by!`);

        session.sendTyping();
        setTimeout(function() {
            let phrase = 'Are you a current resident, or are you looking for an awesome new apartment?';
            let choices = ['Current Resident', 'Looking for a new apartment'];
            session.endDialog(builder.Prompts.choice(session, phrase, choices, {listStyle: 3}));
        }, 1000);
    }
]).triggerAction({
    matches: 'Hello',
    intentThreshold: 0.5
});

bot.dialog('LookingForApartment', [
    function (session, args, next) {
        if (args && args.reprompt) {
            builder.Prompts.text(session, "Oo... That doesn't look valid. Could you please enter your email address or phone number?")
        } else if (!session.userData.email && !session.userData.phone) {
            builder.Prompts.text(session, "Great! I'll be happy to assist you. Could you provide your email address or phone number?");
        } else {
            next();
        }
    },
    function (session, results, next) {
        if (!results || !results.response) {
            next();
        }

        let email = utils.extractValidEmail(results.response);
        let phone = utils.extractValidPhone(results.response);

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
        builder.Prompts.choice(session, 'What would you like to learn about today',
            ['Amenities', 'Pet Policy', 'Fees', 'Availability', 'Pricing'], {listStyle: 3});
    },
    function(session, results) {
        if (results.response && results.response.entity) {
            return session.beginDialog(results.response.entity);
        } else {
            session.endDialog();
        }
    }
]).triggerAction({
    matches: 'LookingForApartment'
});

bot.dialog('Availability', [
    function(session, args, next) {
        let unit_type, bedCount, targetDate;

        if (args && args.intent) {
            unit_type = builder.EntityRecognizer.findEntity(args.intent.entities, 'unit_type');
            bedCount = builder.EntityRecognizer.findEntity(args.intent.entities, 'builtin.number');
            targetDate = dateEntityRecognizer.parseTime(args.intent.entities);
        }

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

        return aptListingService.getUnits(498, session.dialogData.bed_count, session.dialogData.date)
            .then((units) => {
                let cards = formatter.formatUnitCards(session, units);
                let carousel = new builder.Message(session)
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);

                session.send('I found these units that match your criteria');
                session.send(carousel);

                session.beginDialog('Helped');
            })
            .catch((e) => {
                console.log(e);
                session.send(`Call the office for information on availability and pricing`)
            });
    }
]).triggerAction({
    matches: 'Availability'
});

bot.dialog('Helped', [
    function(session, args) {
        session.sendTyping();
        setTimeout(function () {
            builder.Prompts.confirm(session, 'Did you find the information you were looking for?')
        }, 2000);
    },
    function(session, result) {
        if (result.response) {
            builder.Prompts.choice(session, 'Great! Is there anything else I can help you with', [
                'I have more questions', 'Tell me a joke', 'Goodbye'
            ], {listStyle: 3});
        } else {
            builder.Prompts.choice(session, 'Crap... Sorry... Do you want to try something else?', [
                'Availability', 'I have other questions', 'Tell me a joke','Goodbye'
            ], {listStyle: 3});
        }
    },
    function(session, results) {
        if (results.response && results.response.entity) {
            return session.beginDialog(results.response.entity);
        } else {
            session.endDialog();
        }
    }
]);

bot.dialog('Goodbye', [
    function(session, args) {
        session.send("Thanks for chatting today. If you're finished, you can close out this chat window");
        session.endConversation();
    }
]).triggerAction({
    matches: 'Goodbye'
});

bot.on("event", function (event) {
    // var msg = new builder.Message().address(event.address);
    // msg.textLocale("en-us");
    if (event.name === "buttonClicked") {
        bot.beginDialog(event.address, 'Hello')
    }
});

console.log('useEmulator', useEmulator);

if (useEmulator) {
    let restify = require('restify');
    let server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpoint at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());
} else {
    console.log('not using emulator');
    module.exports = { default: connector.listen() }
}