var serializer = require('./serializer'),
	fs = require('fs'),
	mkdirp = require('mkdirp'),
	rimraf = require('rimraf'),
	dirname = require('path').dirname,
	yaml = require('yamljs'),
	_ = require('underscore'),
	proxy = require('./proxy');

function Player(storageDirectory) {
	this.count = 0;
	this.responseCount = 0;
	this.storageDirectory = storageDirectory;
	this.state = [];
	this.persistStateCallback = null;

	// replay
	this.waiting = {};
}

Player.prototype.initMode = function (mode) {

	if (mode === 'replay') {
		this.state = this.loadState();
	} else if (mode === 'record') {
		rimraf.sync(this.storageDirectory);
		mkdirp.sync(this.storageDirectory);
	}
};

Player.prototype.incoming = function (request) {
	request.__id = ++this.count;
	this.newState('request', request);
};

Player.prototype.outgoing = function (request, response) {
	serializer.save(this.filename(request.__id), request, response, function () {
		this.responseCount++;
		this.newState('response', request);

		if (this.responseCount === this.count && this.persistStateCallback) {
			this.persistStateCallback();

		}
	}.bind(this));
};

Player.prototype.newState = function (type, request) {
	this.state.push({type: type, id: request.__id});
};

Player.prototype.persistState = function (cb) {
	var path = this.filename('state');
	var persist = function () {
		fs.writeFileSync(path, yaml.stringify(this.state));
		cb();
	}.bind(this);

	if (this.responseCount === this.count) {
		persist();
	} else {
		this.persistStateCallback = persist;
	}

};

Player.prototype.loadState = function () {
	return yaml.load(this.filename('state'));
};

Player.prototype.filename = function (id) {
	return this.storageDirectory + '/' + id;
};



Player.prototype.replay = function (request, cb) {
	request.__id = ++this.count;
	this.waiting[request.__id] = {request: request, end: false, cb: cb};

	request.once('end', function () {
		this.waiting[request.__id].ended = true;
		if (this.waiting[request.__id].endCallback) {
			this.waiting[request.__id].endCallback();
		}
	}.bind(this));

	this.transit();

};

Player.prototype.transit = function () {
	if (_.isEmpty(this.state)) {
		throw new Error('Invalid request sequence. No more request available for replay');
	}

	var top = this.state[0];
	if (top.type !== 'request') {
		throw new Error('Invalid state');
	}

	this.state.shift();
	this.clearResponse();
};

Player.prototype.clearResponse = function () {
	var top = this.state[0];
	if (top && top.type === 'response') {
		var waiting = this.waiting[top.id];

		var sendResponse = function () {
			var current = serializer.requestToObject(waiting.request);
			var old = serializer.restore(this.filename(waiting.request.__id));
			// TODO: check current & old
			waiting.cb(new proxy.Response(old.request, old.response));

			delete this.waiting[top.id];
		}.bind(this);

		if (waiting.ended) {
			sendResponse();
		} else {
			waiting.endCallback = sendResponse;
		}

		this.state.shift();
		this.clearResponse();
	}
};


module.exports = Player;
