var http    = require('http');
var route   = require('boulevard');
var superA  = require('superagent');
var request = require('superagent-promise')(superA, Promise);

var cache = {};

function earthViewApi(id) {
	var path = isNaN(parseInt(id)) ? id : `/_api/${getNextId(id.toString())}.json`;

	if(cache[id]) return Promise.resolve(cache[id]);

	return request.get(`http://earthview.withgoogle.com${path}`).then(res => {
		console.log('cache', );
		return cache[res.body.id] = res.body;
	});
}

var skipped = 0;

function getNextId(url) {
	return url.match(/\d{4,}$/)[0];
}

function tick(promise) {
	return new Promise(resolve => process.nextTick(resolve, promise));
}

function loop(id) {
	return earthViewApi(id).then(data => {
		var nextId = getNextId(data.nextUrl);
		if(cache[nextId]) {
			if(skipped++ > 5) {
				return Promise.resolve();
			}

			console.log('skip', nextId);
			return tick(loop(data.nextApi));
		}

		skipped = 0;
		return tick(loop(data.nextApi));
	});
}

loop(1653).then(console.log.bind(console, 'Duncachin'), console.error);

http.createServer(route({
	'/image/:id'(req, res, params) {
		earthViewApi(params.id).then(data => {
			res.setHeader('content-type', 'image/jpeg');
			superA(data.photoUrl).pipe(res);
		});
	},

	'/ids.json'(req, res) {
		res.setHeader('content-type', 'application/json');
		res.end(JSON.stringify(ids));
	}
})).listen(process.env.PORT || 3000);
