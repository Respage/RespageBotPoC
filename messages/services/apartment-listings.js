"use strict";

const RespageApi = require('./respage-api');
const R = require('ramda');
const moment = require('moment');
const API_PATH = 'apartment-listings';

let getUnits = function(campaignId, beds, date) {
    return getApartmentListings(campaignId)
    .then(function(listings) {
            if (!listings.length) return [];

            let units = listings.reduce((units, listing) => units.concat(listing['units'] || []), []);
            if (!units || !units.length) return [];

            let filteredUnits = R.filter(x => bedroomsMatch(x, beds) && availableDateMatches(x, date), units);
            return filteredUnits.length ? filteredUnits : R.filter(x => bedroomsMatch(x, beds), units);
    }).catch(function(e) {
        console.log(e);
        return [];
    })
};


module.exports = {
    getUnits
};


let getApartmentListings = function(campaignId) {
    return RespageApi.apiRequest(`${API_PATH}/${campaignId}`, {method: 'GET'})
        .then((listings) => listings || [])
        .catch((e) => {
                console.log(e);
                return [];
        });

};

let bedroomsMatch = function(unit, target) {
    if (!unit) return false;
    if (target === null) return true;
    if (!target && target !== 0) return true;

    if (parseInt(target, 10) >= 3) {
        return unit['beds'] >= parseInt(target, 10);
    }

    return (unit['beds'] === parseInt(target));
};

let availableDateMatches = function(unit, target) {
    if (!unit) return false;
    if (unit.available === false) return false;
    if (!unit.available_on) return true;
    if (!target) return !!unit.available;

    return unit.available || moment(unit.available_on).diff(moment(target)) <= 0;
};