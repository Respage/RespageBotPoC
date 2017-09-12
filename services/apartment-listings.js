"use strict";

const RespageApi = require('./respage-api');
const API_PATH = 'apartment-listings';

let getApartmentListings = async function(campaignId) {
    try {
        let listings = await RespageApi.apiRequest(`${API_PATH}/${campaignId}`, {method: 'GET'});
        return listings || [];
    } catch(e) {
        console.log(e);
        return [];
    }
};

module.exports = {
    getApartmentListings
};