var _ = require('underscore');

var diff = module.exports = {};


var bodyAsString = function (body) {
	if (!body) {
		return "";
	}

	return _.reduce(function (result, item) {
		var chunk = item[0],
			encoding = item[1];

		if (encoding) {
			return result + new Buffer(chunk).toString(encoding);
		}
		return result + chunk;
	}, "");
};

diff.isSame = function (current, old) {
	return current.method === old.method &&
		current.path === old.path &&
		bodyAsString(current.body) === bodyAsString(old.body) &&
		_.isEqual(current.headers, old.headers);
};

diff.show = function (current, old) {
	// TODO: visual diff
	console.log('different request', current, old);
};
