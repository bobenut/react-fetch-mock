'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Mock = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _mockjs = require('mockjs');

Object.defineProperty(exports, 'Mock', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_mockjs).default;
  }
});

var _pathToRegexp = require('path-to-regexp');

var _pathToRegexp2 = _interopRequireDefault(_pathToRegexp);

var _util = require('./util');

var _response = require('./response');

var _response2 = _interopRequireDefault(_response);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var FetchMock = function () {
  function FetchMock(required) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
      fetch: function fetch() {},
      exclude: [],
      proxy: []
    };

    _classCallCheck(this, FetchMock);

    if ('object' !== (typeof required === 'undefined' ? 'undefined' : _typeof(required))) {
      throw new Error('There is no required defined.');
    }

    this.urls = [];
    this.raw = options.fetch;
    this.exclude = options.exclude;
    this.proxy = options.proxy;

    this.loadMocks = this.loadMocks.bind(this);
    this.loadMock = this.loadMock.bind(this);
    this.matchReqUrl = this.matchReqUrl.bind(this);
    this.isExclude = this.isExclude.bind(this);
    this.isProxied = this.isProxied.bind(this);
    this.fetch = this.fetch.bind(this);

    this.loadMocks(required);
  }

  _createClass(FetchMock, [{
    key: 'loadMocks',
    value: function loadMocks(required) {
      var _this = this;

      var __mocks__ = required.default || required; // es6 import or amd
      var mocks = Object.keys(__mocks__);
      mocks.forEach(function (key) {
        _this.loadMock(key, __mocks__[key]);
      });
    }
  }, {
    key: 'loadMock',
    value: function loadMock(key, mock) {
      var _this2 = this;

      if ('object' !== (typeof mock === 'undefined' ? 'undefined' : _typeof(mock))) {
        if ('function' === typeof mock) {
          var items = key.split(' ');
          var method = items.length === 2 ? items[0] : 'GET';
          var url = items.length === 2 ? items[1] : key;
          this.urls.push({
            method: method,
            url: url,
            func: mock
          });
        }
        return;
      }
      var keys = Object.keys(mock);
      keys.map(function (key) {
        _this2.loadMock(key, mock[key]);
      });
    }
  }, {
    key: 'matchReqUrl',
    value: function matchReqUrl(request) {
      var insideParams = void 0;
      var filters = this.urls.filter(function (uri) {
        var obj = (0, _util.matchUrl)(uri.url, request.url);
        if (obj.result && uri.method.toUpperCase() === request.method.toUpperCase()) {
          insideParams = obj.params;
          return true;
        }
        return false;
      });
      if (!filters || filters.length == 0) throw new Error('No url ' + request.url + ' is defined.');
      request.urlparams = insideParams;
      return {
        request: request,
        mock: filters[0]
      };
    }
  }, {
    key: 'isExclude',
    value: function isExclude(url) {
      for (var i = 0; i < this.exclude.length; i++) {
        var excludeUrl = this.exclude[i];
        if (excludeUrl === url || (0, _pathToRegexp2.default)('' + excludeUrl).exec(url) !== null) {
          return true;
        }
      }
      return false;
    }
  }, {
    key: 'isProxied',
    value: function isProxied(url) {
      if (this.proxy.length === 0) return false;
      var proxied = this.proxy.filter(function (item) {
        return (0, _pathToRegexp2.default)('' + item.path).exec(url) !== null;
      });
      if (proxied.length > 1) throw new Error(url + ' proxied has two proxies, you should specific only one');

      return proxied[0];
    }
  }, {
    key: 'proxied',
    value: function proxied(url) {
      // get proxied info
      var matches = void 0,
          proxied = void 0;
      this.proxy.forEach(function (item) {
        var tmp = (0, _pathToRegexp2.default)(item.path).exec(url);
        if (tmp.length > 1) {
          matches = tmp;
          proxied = item;
          return false;
        }
      });

      return proxied.process ? proxied.process(proxied, matches) : proxied.target + '/' + matches[1];
    }
  }, {
    key: 'fetch',
    value: function fetch(url, options) {
      // using proxy
      if (this.isProxied(url)) {
        url = this.proxied(url);
      }

      // using raw fetch while match exclude
      if (this.isExclude(url)) {
        // using raw fetch
        return this.raw(url, options);
      }

      var _matchReqUrl = this.matchReqUrl((0, _util.parseRequest)(url, options)),
          request = _matchReqUrl.request,
          mock = _matchReqUrl.mock;

      if ('function' !== typeof mock.func) {
        throw new Error('There is no url defined in __mocks__');
      }
      var obj = mock.func(request);

      if ((0, _util.isNull)(obj)) {
        throw 'response data should not be undefined or null, it will be an object or an array at least';
      }

      // resolve prue data object
      if ((0, _util.isNull)(obj.status)) {
        obj = {
          status: 200,
          data: obj
        };
      }

      var response = new _response2.default(obj);
      return Promise.resolve(response);
    }
  }]);

  return FetchMock;
}();

exports.default = FetchMock;