const COUNTRIES = require('./constants.json').COUNTRIES;

module.exports = (country, now, news) => {
    if (!~COUNTRIES.indexOf(country)) {
        console.log('[DB: country is invalid]', country);
        return;
    }

    return q_newsFindOneAndUpdate({ date: now }, { [country]: news });
};
