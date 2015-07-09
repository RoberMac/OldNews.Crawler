//local variables
var fs         = require('fs'),
    mongoose   = require('mongoose'),
    Log        = require('log'),
    touch      = require('touch');

// Log
var log_file     = __dirname + '/logs/' + new Date().toUTCString() + '.log';
touch(log_file)
process.on('uncaughtException', function (err) {
    console.log(err)
    log.alert(err.toString('utf8'));
});

// global variables
global.News = require('./models/db').News
global.log  = new Log('info', fs.createWriteStream(log_file))

// read database config form VCAP_SERVICES env
var db_uri = process.env.VCAP_SERVICES 
    ? JSON.parse(process.env.VCAP_SERVICES).mongodb[0].credentials.uri
    : 'mongodb://test:test@localhost:27017/test'

// Connect to DB
mongoose.connect(db_uri);

var db = mongoose.connection
.on('err', function (err){
    console.log(err)
})
.once('open', function (){
    log.info('[DB]', 'Connected to MongoDB')
})

// 定時抓取新聞
var getNews = require('./others/rss_helper');
getNews(1000 * 60 * 60 * 1)
