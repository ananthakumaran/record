var HTTP = require("http"),
	HTTPS = require("https"),
	url = require('url'),
	httpRequest = HTTP.request,
	httpsRequest = HTTPS.request,
	ClientRequest = HTTP.ClientRequest,
	Player = require('./player'),
	proxy = require('./proxy'),
	_ = require('underscore');


function Record(storageDirectory) {
	this.player = new Player(storageDirectory);
	this.ignoreHosts = ['127.0.0.1', 'localhost'];
}

Record.prototype.start = function (mode) {
	HTTP.request = HTTPS.request = _.bind(this.request, this);

	this.mode = mode || 'record';
	this.player.initMode(mode);
};

Record.prototype.stop = function (cb) {
	HTTP.request = httpRequest;
	HTTPS.request = httpsRequest;

	if (this.mode !== 'record') {
		return cb();
	}
	this.player.persistState(cb);
};

Record.prototype.request = function (options, cb) {
	if (typeof options === 'string') {
		options = url.parse(options);
	}

	if (_.include(this.ignoreHosts, options.host)) {
		return new ClientRequest(options, cb);
	}

	return this[this.mode](options, cb || function () {});
};

Record.prototype.record = function (options, cb) {
	var request = new ClientRequest(options, function (response) {
		this.player.outgoing(request, response);
		cb(response);
	}.bind(this));

	this.player.incoming(request);
	return request;
};

Record.prototype.replay = function (options, cb) {
	var request = new proxy.Request(options);
	this.player.replay(request, cb);
	return request;
};

module.exports = Record;
