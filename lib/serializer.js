var fs = require('fs'),
	mkdirp = require('mkdirp'),
	dirname = require('path').dirname,
	_ = require('underscore'),
	yaml = require('yamljs');

var Serializer = module.exports = {};

Serializer.save = function (path, request, response, cb) {
	mkdirp.sync(dirname(path));
	this.responseToObject(response, function (responseObject) {
		fs.writeFileSync(path, yaml.stringify({
			request: this.requestToObject(request),
			response: responseObject
		}));
		cb();
	}.bind(this));
};

Serializer.restore = function (path) {
	var record = yaml.load(path);
	return {
		request: this.objectToRequest(record.request),
		response: this.objectToResponse(record.response)
	};
};

Serializer.requestToObject = function (req) {
	var requestHeaders = function () {
		if (!req._headers) {
			return {};
		}

		var headers = {};
		var keys = Object.keys(req._headers);
		for (var i = 0, l = keys.length; i < l; i++) {
			var key = keys[i];
			headers[req._headerNames[key]] = req._headers[key];
		}
		return headers;
	};

	return {
		method: req.method,
		path: req.path,
		headers: requestHeaders(),
		body: req.body
	};
};

Serializer.objectToRequest = function (object) {
	return object;
};

Serializer.responseToObject = function (res, cb) {
	var body = [];

	res.on('data', function (chunk) {
		if (_.isString(chunk)) {
			body.push([chunk, 'utf8']);
		} else {
			body.push([chunk.toString('utf8'), 'utf8']);
		}
	});

	res.on('end', function () {
		cb({
			statusCode: res.status || 200,
			httpVersion: res.httpVersion,
			headers: res.headers,
			trailers: res.trailers,
			body: body
		});
	});
};

Serializer.objectToResponse = function (object) {
	return object;
};
