"use strict";

const R = require('ramda');
const builder = require('botbuilder');

let formatUnitCards = function(session, units) {
    units = R.reject(u => !u)(units);
    return units.map(u => new builder.HeroCard(session)
        .title('Available September 1st')
        .subtitle(`${u['beds']} br / ${u['baths']} ba / ${u['min_sqft']} sqft`)
        .text(`From $${u['min_rent']} monthly (${u['rental_key']})`)
        .images([
            builder.CardImage.create(session, u['floorplan_image']['url'])
        ]));
};

module.exports = {
    formatUnitCards,
};