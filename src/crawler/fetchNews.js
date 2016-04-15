/* eslint no-cond-assign: 0 */
'use strict';
const FeedParser = require('feedparser');
const iconvLite = require('iconv-lite');
const request = require('request');

// Helpers
const nowHourMs = require('./utils').nowHourMs;
const decompress = require('./decompress');
const storeNews = require('./storeNews');
const feeds = require('../feeds');
const CRAWL_FREQUENCY = require('./constants.json').CRAWL_FREQUENCY;
const COUNTRIES = require('./constants.json').COUNTRIES;

// Export
module.exports = class FetchNews {
    constructor() {
        this.now = nowHourMs();

        this.country = COUNTRIES[0];
        this.countryId = 0;
        this.countryNewsCache = [];

        this.sources = feeds[this.country];
        this.sourcesId = 0;
        this.sourcesNewsCache = [];
    }
    _nextCountry() {
        // Next Country
        this.countryId++;
        this.country = COUNTRIES[this.countryId];
        this.countryNewsCache = [];
        // Reset Sources
        this.sources = feeds[this.country];
        this.sourcesId = 0;
        this.sourcesNewsCache = [];
        // Start Fetch
        this._fetchNews();
    }
    _nextSources() {
        // Next Sources
        this.sourcesId++;
        this.sourcesNewsCache = [];
        // Start Fetch
        this._fetchNews();
    }
    _storeCountryNews() {
        storeNews(this.country, this.now, this.countryNewsCache)
        .then(() => {
            console.log('[Store]', this.country);

            if (this.countryId < COUNTRIES.length - 1) {
                this._nextCountry();
            } else {
                console.log('[Done]', this.now);
            }
        });
    }
    _fetchNews() {
        const feedparser = new FeedParser();
        const minNewsDate = this.now - CRAWL_FREQUENCY;
        const source = this.sources[this.sourcesId];
        const isLastSource = this.sourcesId < this.sources.length - 1;

        // fetch news
        const req = request({
            url    : source.url,
            gzip   : true,
            timeout: 10000,
            headers: {
                accept      : 'text/html,application/xhtml+xml',
                'user-agent': [
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) ',
                    'AppleWebKit/537.36 (KHTML, like Gecko) ',
                    'Chrome/42.0.2311.90 Safari/537.36',
                ].join(''),
            },
            pool: false,
        });

        req.on('error', err => {
            console.error('[Request Error]', source.source_name, err);

            // fetch next source's news if not the last source
            if (isLastSource) {
                this._nextSources();
            }
        })
        .on('response', res => {
            if (res.statusCode !== 200) {
                return req.emit('error', new Error('Bad status code', res.statusCode));
            }

            decompress(res, res.headers['content-encoding'] || '')
            .pipe(iconvLite.decodeStream(source.encoding || 'UTF8'))
            .pipe(feedparser);
        });

        // parse news
        feedparser
        .on('error', err => {
            console.error('[Parse Error]', source.source_name, err);
        })
        .on('readable', () => {
            let item;
            while (item = feedparser.read()) {
                if (item.date > minNewsDate && item.date < this.now) {
                    this.sourcesNewsCache.push({
                        title: item.title,
                        url  : item.link,
                        date : item.date,
                    });
                }
            }
        })
        .on('end', () => {
            if (this.sourcesNewsCache.length > 0) {
                this.countryNewsCache.push({
                    source_name: source.source_name,
                    news       : this.sourcesNewsCache,
                });
            }
            // fetch next source's news if not the last source
            if (isLastSource) {
                this._nextSources();
            } else {
                this._storeCountryNews();
            }
        });
    }
    start() {
        this._fetchNews();
    }
};
