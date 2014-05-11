var util = require('util'),
	EventEmitter  = require("events").EventEmitter,
	Stream = require('stream'),
	_ = require('underscore'),
	http = require('http');

function Request (options) {
	this.method = (options.method || 'GET').toUpperCase();
	this.path = options.path || '/';

	var defaultPort = options.defaultPort || 80;
	var port = options.port || defaultPort;
	var host = options.hostname || options.host || 'localhost';

	if (!Array.isArray(options.headers)) {
		if (options.headers) {
			var keys = Object.keys(options.headers);
			for (var i = 0, l = keys.length; i < l; i++) {
				var key = keys[i];
				this.setHeader(key, options.headers[key]);
			}
		}
		if (host && !this.getHeader('host') && (options.setHost === undefined)) {
			var hostHeader = host;
			if (port && +port !== defaultPort) {
				hostHeader += ':' + port;
			}
			this.setHeader('Host', hostHeader);
		}
	}

	if (options.auth && !this.getHeader('Authorization')) {
		//basic auth
		this.setHeader('Authorization', 'Basic ' + new Buffer(options.auth).toString('base64'));
	}

	// private
	this._body = [];
}

util.inherits(Request, http.ClientRequest);

// public api
Request.prototype.write = function (chunk, encoding) {
	this._body.push([chunk, encoding]);
};

Request.prototype.end = function (chunk, encoding) {
	if (chunk) {
		this.write(chunk, encoding);
	}

	this.emit('end');
};

function Response (req, res) {
	this.httpVersion = res.httpVersion;
	this.headers = res.headers;
	this.trailers = res.trailers;
	this.method = req.method;
	this.url = req.path;
	this.statusCode = res.statusCode;

	this.connection = new EventEmitter();

	// private
	this._body = res.body;
}

util.inherits(Response, Stream);

Response.prototype.pause = function () {
	this._paused = true;
};

Response.prototype.resume = function () {
	this.paused = false;
	setImmediate(function () {
		if (this._paused) {
			return;
		}

		if (!this._body || _.isEmpty(this._body)) {
			this.readable = false;
			this._done = true;
			this.emit('end');
			return;
		}

		var chunk = this._body.shift()[0];
		if (this._encoding) {
			chunk = new Buffer(chunk).toString(this._encoding);
		}

		this.emit('data', chunk);
		this.resume();
	}.bind(this));
};


module.exports = {
	Request: Request,
	Response: Response
};
