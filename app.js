const Q = require('q');

// global variables
global.News = require('./src/models').News;
global.q_newsFindOne = Q.nbind(News.findOne, News);
global.q_newsFindOneAndUpdate = Q.nbind(News.findOneAndUpdate, News);

// load dotenv
require('dotenv').load();

// Connect to DB
const mongoose = require('mongoose');
const DB_URI = (
    process.env.MONGODB
        ? JSON.parse(process.env.MONGODB).uri
    : 'mongodb://test:test@localhost:27017/test'
);
mongoose.connect(DB_URI);
mongoose.connection
.on('err', (err) => console.error(err))
.once('open', () => console.log('Connected to MongoDB'));

// News Crawl
require('./src/crawler')();
