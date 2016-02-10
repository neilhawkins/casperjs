// Run with casperjs --ignore-ssl-errors=true --ssl-protocol=any --verbose wayback-scraper.js www.cogapp.com

var casper = require("casper").create({
    verbose: true,
    loglevel: "debug"
});

var response = [],
    url, site, viewportWidth = 1280,
    viewportHeight = 1024;
var captureSize = {
    top: 0,
    left: 0,
    width: viewportWidth,
    height: viewportHeight
};

if (casper.cli.args.length < 1) {
    casper.echo("Usage: casperjs wayback-scraper.js <url to scrape>").exit();

} else {
    site = casper.cli.args[0];
    // API endpoint
    url = "http://web.archive.org/cdx/search/cdx?url=" + site + "&filter=statuscode:200&collapse=timestamp:4&output=json&gzip=false";
}

casper.renderJSON = function(what) {
    return this.echo(JSON.stringify(what, null, ' '));
};

casper.start(function() {
    this.viewport(viewportWidth, viewportHeight);
});

casper.userAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X)');

casper.open(url, {
    method: "get",
    headers: {
        "Accept": "application/json"
    }
});

casper.then(function() {
    response = rowsToObjects(this.getPageContent());
    this.renderJSON(response);
});

casper.then(function() {
    casper.each(response, function(casper, entry) {

        var matches = entry.original.match(/^https?\:\/\/[w{3}\.?]*([^\/:?#]+)(?:[\/:?#]|$)/i);
        var domain = matches && matches[1];

        this.thenOpen(entry.url, function(input) {
            console.log('Opened', input.url);
        }).then(function() {
            this.echo((this.getCurrentUrl()));
        });

        this.then(function() {
            this.evaluate(function() {
                document.getElementById('wm-ipp').style.display = "none";
                this.echo('Removed Wayback Machine toolbar');
            });
        });

        this.then(function() {
            this.echo('Capturing screenshot for ' + (this.getCurrentUrl()));
            this.capture('screenshots/' + domain + '/' + domain + '-' + entry.date + '.png', undefined);
            this.echo('Screenshot saved to screenshots/' + domain + '/' + domain + '-' + entry.date + '.png');
        });
    });
});

casper.run(function() {
    this.exit();
});

function rowsToObjects(json) {

    arr = JSON.parse(json);

    var keys = arr[0];
    var numRows = arr.length;
    var numCols = keys.length;
    var result = [];

    // start at i = 1 to avoid adding row [0] as an object
    for (var i = 1; i < numRows; i++) {

        var obj = {};

        for (var j = 0; j < numCols; j++) {

            obj[keys[j]] = arr[i][j];

        };

        result.push(obj);
    };

    return createUrlList(result);
}

function createUrlList(result) {

    var urls = [];
    var baseUrl = "https://web.archive.org/web/";

    for (var i = 0; i < result.length; i++) {

        var snapshot = {},
            timestamp, original, url;
        timestamp = result[i].timestamp;
        original = result[i].original;
        url = baseUrl + timestamp + "/" + original;
        snapshot.date = timestamp.substring(0, 8);
        snapshot.url = url;
        snapshot.original = original;

        urls.push(snapshot);
    }

    return urls;
}