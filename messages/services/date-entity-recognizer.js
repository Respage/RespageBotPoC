'use strict';

const chrono = require("chrono-node");
const dateExp = /^\d{4}-\d{2}-\d{2}/i;

let parseTime = function (entities) {
    if (typeof entities == 'string') {
        entities = [recognizeTime(entities)];
    }
    return resolveTime(entities);
};

module.exports = {
    parseTime
};

let resolveTime = function (entities) {
    var _this = this;
    var now = new Date();
    var resolvedDate;
    var date;
    var time;

    console.log(entities);

    entities.forEach(function (entity) {
        if (entity.resolution) {
            switch (entity.resolution.resolution_type || entity.type) {
                case 'builtin.datetimeV2':
                case 'builtin.datetimeV2.date':
                case 'builtin.datetimeV2.time':
                    var parts = (entity.resolution.values[0].value || entity.resolution.values[0].value).split('T');
                    if (!date && dateExp.test(parts[0])) {
                        date = parts[0];
                    }
                    if (!time && parts[1]) {
                        time = 'T' + parts[1];
                        if (time == 'TMO') {
                            time = 'T08:00:00';
                        }
                        else if (time == 'TNI') {
                            time = 'T20:00:00';
                        }
                        else if (time.length == 3) {
                            time = time + ':00:00';
                        }
                        else if (time.length == 6) {
                            time = time + ':00';
                        }
                    }
                    break;

                case 'chrono.duration':
                    var duration = entity;
                    resolvedDate = duration.resolution.start;
            }
        }

    });
    if (!resolvedDate && (date || time)) {
        if (!date) {
            date = utils.toDate8601(now);
        }
        if (time) {
            date += time;
        }

        console.log(date);
        resolvedDate = new Date(date);
        console.log(resolvedDate);
    }
    return resolvedDate;
};

let recognizeTime = function (utterance, refDate) {
    var response;
    try {
        var results = chrono.parse(utterance, refDate);
        if (results && results.length > 0) {
            var duration = results[0];
            response = {
                type: 'chrono.duration',
                entity: duration.text,
                startIndex: duration.index,
                endIndex: duration.index + duration.text.length,
                resolution: {
                    resolution_type: 'chrono.duration',
                    start: duration.start.date()
                }
            };
            if (duration.end) {
                response.resolution.end = duration.end.date();
            }
            if (duration.ref) {
                response.resolution.ref = duration.ref;
            }
            response.score = duration.text.length / utterance.length;
        }
    }
    catch (err) {
        console.error('Error recognizing time: ' + err.toString());
        response = null;
    }
    return response;
};