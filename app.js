//local variables
var mongoose   = require('mongoose');

// load dotenv
require('dotenv').load()

// read database config form VCAP_SERVICES env
var db_uri = process.env.MONGODB
    ? JSON.parse(process.env.MONGODB).uri
    : 'mongodb://test:test@localhost:27017/test'

// Connect to DB
mongoose.connect(db_uri);

var db = mongoose.connection
.on('err', function (err){
    console.log(err)
})
.once('open', function (){
    console.log('[DB]', 'Connected to MongoDB')
})

// 定時抓取新聞
var getNews = require('./others/rss_helper');
getNews(1000 * 60 * 60 * 1)
