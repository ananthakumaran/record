var HTTP = require("http"),
	url = require('url'),
	httpRequest = HTTP.request,
	ClientRequest = HTTP.ClientRequest,
	Player = require('./player'),
	proxy = require('./proxy'),
	_ = require('underscore');


function Record(storageDirectory) {
	this.player = new Player(storageDirectory);
}

Record.prototype.start = function (mode) {
	this.mode = mode || 'record';
	this.player.initMode(mode);

	HTTP.request = _.bind(this.request, this);
};

Record.prototype.stop = function () {
	HTTP.require = httpRequest;
	this.player.persistState();
};

Record.prototype.request = function (options, cb) {
	if (typeof options === 'string') {
		options = url.parse(options);
	}

	return this[this.mode](options, cb);
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
