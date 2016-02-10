// Run using phantomjs --ignore-ssl-errors=true --ssl-protocol=any wayback.js www.bbc.co.uk
var webPage = require('webpage');
var page = webPage.create();
var system = require('system');
var Scraper = {};
var args = system.args;
var site, root, response, url;
var version = phantom.version.major.toString() + phantom.version.minor.toString() + phantom.version.patch.toString();

if (args.length !== 2) {
	console.log("Usage: phantomjs wayback.js <url to scrape>");
	phantom.exit(1);

} else {
	site = args[1];
	root = "http://web.archive.org/cdx/search/cdx?url=" + site + "&filter=statuscode:200&collapse=timestamp:4&output=json&gzip=false";
}

page.open(root, function() {
	var jsonSource = page.plainText;
	response = Scraper.rowsToObjects(jsonSource);
	Scraper.renderJSON(response);
	Scraper.nextPage();
});

Scraper.renderWaybackMachineEntry = function(entry) {
	console.log('Opening: ' + entry.url);
	page = webPage.create();
	page.viewportSize = {
		width: 1280,
		height: 1024
	};

	page.open(entry.url, function(status) {
		if (status === "success") {
			var matches = entry.original.match(/^https?\:\/\/(?:w{3}\.)?([^\/:?#]+)(?:[\/:?#]|$)/i);
			var domain = matches && matches[1];
			console.log('Rendering:' + entry.url);
			
			page.evaluate(function() {
			  document.getElementById('wm-ipp').style.display = "none"; 
			});

			page.render(
			  'screenshot-tests/phantomjs-' + version + '/' 
			  + domain + '/' 
			  + domain + '-' + entry.date + '.png'
			);
			Scraper.nextPage();

		} else {
		  console.log(status + ' ' + entry.url);
		  Scraper.nextPage();

		}
	});
}

Scraper.nextPage = function() {
	page.close();
	console.log('closing...')
	entry = response.shift();

	if (!entry) {
		phantom.exit();
	}

	Scraper.renderWaybackMachineEntry(entry);
}

// Helper functions

Scraper.renderJSON = function(json) {

	console.log(JSON.stringify(json, null, ' '));

}

Scraper.rowsToObjects = function(json) {
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
	return Scraper.createUrlList(result);
}

Scraper.createUrlList = function(result) {
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
