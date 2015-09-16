var zlib       = require('zlib'),
    Feedparser = require('feedparser'),
    iconv_lite = require('iconv-lite'),
    request    = require('request'),
    feed_list  = require('./feed_list'),
    News       = require(process.env.PWD + '/models/db').News;

function updateCountryNews(country, now, news, callback){

    var list = {
        'BR': {'BR': news},
        'CN': {'CN': news},
        'DE': {'DE': news},
        'FR': {'FR': news},
        'HK': {'HK': news},
        'IN': {'IN': news},
        'JP': {'JP': news},
        'KR': {'KR': news},
        'RU': {'RU': news},
        'TW': {'TW': news},
        'US': {'US': news}
    }
    if(!(country in list)){
        console.log('[News: Not Found]', country)
        return;
    }
    News.findOneAndUpdate({date: now}, list[country], function (err){
        if (err) {
            console.log('[DB: Not Found]', err)
            return;
        }
        console.log('[News: Saved]', country)
        callback()
    })
}
// via https://github.com/danmactough/node-feedparser/blob/master/examples/compressed.js
function decompressRes (res, encoding) {

    var decompress;

    encoding.match(/\bdeflate\b/)
    ? decompress = zlib.createInflate()
    : encoding.match(/\bgzip\b/)
        ? decompress = zlib.createGunzip()
        : null

    return decompress ? res.pipe(decompress) : res
}
function getNews(frequency){

    var now = new Date(),
        now = Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            now.getUTCHours()
        ),
        restrict = now - frequency;
    News.findOne({date: now}, function (err, found){
        if (found){
            return;
        }
        console.log('[News: Start Fetch]', now)
        var news = new News({
            date: now
        })
        news.save(function (err){
            if (err){
                console.log('[DB: Save Error]', err)
                return;
            }
            console.log('[DB: Start Fetch]', now)
            var country_list    = Object.keys(feed_list),
                country_len     = country_list.length,
                country_pointer = 0;

            (function getCountryNews(country){

                var feed_item    = feed_list[country],
                    feed_len     = feed_item.length,
                    feed_pointer = 0,
                    all_news     = [];
                (function getNextNews(){

                    var feedparser = new Feedparser(),
                        encoding = feed_item[feed_pointer]['encoding'] || 'UTF8'
                        cache        = [];

                    // 抓取當前新聞源
                    request({
                        url: feed_item[feed_pointer]['url'],
                        gzip: true,
                        timeout: 10000,
                        headers: {
                            'accept': 'text/html,application/xhtml+xml',
                            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.90 Safari/537.36'
                        },
                        pool: false
                    })
                    .on('error', function (err){
                        console.log('[News: Request Error]', feed_item[feed_pointer]['source_name'], err)
                        // 若不是「新聞列表」最後的新聞源，獲取下一個新聞源新聞
                        if (feed_pointer < feed_len - 1){
                            feed_pointer ++
                            getNextNews()
                        } else {
                            console.log('[News: Fetch & Parse Finished]', country)
                            updateCountryNews(country, now, all_news, function (){
                                if (country_pointer < country_len - 1){
                                    country_pointer ++
                                    getCountryNews(country_list[country_pointer])
                                } else {
                                    console.log('[News: Done]', now)
                                }
                            })
                        }
                    })
                    .on('response', function (res){
                        if (res.statusCode != 200){
                            return this.emit('error', new Error('Bad status code', res.statusCode))
                        }
                        decompressRes(res, res.headers['content-encoding'] || '')
                        .pipe(iconv_lite.decodeStream(encoding))
                        .pipe(feedparser)
                    })

                    // 解析當前新聞源
                    feedparser
                    .on('error', function(err){
                        console.log('[News: Parse Error]', feed_item[feed_pointer]['source_name'], err)
                    })
                    .on('readable', function(){
                        var stream = this,
                            meta = this.meta,
                            item;
                        while (item = stream.read()){
                            item.date < now && item.date > restrict
                            ? cache.push({
                                'title': item.title,
                                'url'  : item.link,
                                'date' : item.date
                            })
                            : null
                        }
                    })
                    .on('end', function (){
                        // 若不是「新聞列表」最後的新聞源，獲取下一個新聞源新聞
                        if (feed_pointer < feed_len - 1){
                            cache.length > 0
                            ? all_news.push({
                                'source_name': feed_item[feed_pointer]['source_name'],
                                'news': cache
                            })
                            : null
                            feed_pointer ++
                            getNextNews()
                        } else {
                            if (cache.length > 0){
                                all_news.push({
                                    'source_name': feed_item[feed_pointer]['source_name'],
                                    'news': cache
                                })
                            }
                            console.log('[News: Fetch & Parse Finished]', country)
                            updateCountryNews(country, now, all_news, function (){
                                if (country_pointer < country_len - 1){
                                    country_pointer ++
                                    getCountryNews(country_list[country_pointer])
                                } else {
                                    console.log('[News: Done]', now)
                                }
                            })
                        }
                    })
                })()
            })(country_list[country_pointer])
        })
    })
}

module.exports = function (frequency){
    getNews(frequency)
    setInterval(function (){
        getNews(frequency)
    }, 1000 * 60 * 1)
}