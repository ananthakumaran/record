var Record = require('../lib'),
	Q = require('q'),
	_ = require('underscore'),
	expect = require('expect.js'),
	request = require('request');

var fixture = __dirname + '/../fixture/record';

describe('record', function () {
	this.timeout(10000);

	var requesting = function () {
		return Q.all(_.map(_.range(10), function (i) {
			return Q.nfcall(request, 'http://echo.jsontest.com/id/' + i);
		}));
	};

	var checkResponses = function (responses) {
		var bodies = _.map(responses, function (response) { return JSON.parse(response[1]); });
		expect(bodies).to.eql(_.map(_.range(10), function (i) {
			return {id: i.toString()};
		}));
	};

	it('should record', function (done) {
		var record = new Record(fixture);
		record.start('record');
		requesting().then(function (responses) {
			return Q.ninvoke(record, 'stop')
				.then(function () {
					checkResponses(responses);
				});
		}).nodeify(done);
	});

	it('should replay', function (done) {
		var record = new Record(fixture);
		record.start('replay');
		requesting().then(function (responses) {
			return Q.ninvoke(record, 'stop')
				.then(function () {
					checkResponses(responses);
				});
		}).nodeify(done);
	});
});
