const CHECK_FREQUENCY = require('./constants.json').CHECK_FREQUENCY;
const FetchNews = require('./fetchNews');

const tryToFetchNews = () => {
    const f = new FetchNews();
    const now = f.now;

    q_newsFindOne({ date: now })
    .then(found => {
        if (found) return;

        console.log('[Start Fetch]', now);

        new News({ date: now })
        .save(err => {
            if (err) throw err;

            f.start();
        });
    }, err => console.error(err));
};

module.exports = () => {
    tryToFetchNews();

    setInterval(() => {
        tryToFetchNews();
    }, CHECK_FREQUENCY);
};
