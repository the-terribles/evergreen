'use strict';

var _ = require('lodash'),
    fs = require('fs'),
    util = require('util'),
    Path = require('path'),
    http = require('http'),
    chai = require('chai'),
    sinon = require('sinon'),
    errors = require('../../lib/errors'),
    expect = chai.expect,
    HttpContentLoader = require('../../lib/directives/http'),
    DirectiveContext = require('../../lib/directive-context');

describe('Directives', function() {

  describe('HttpContentLoader', function () {

    var server = null,
        port = 23456,
        textContentRoute = '/get-text-content',
        textContent = 'Here is text content.',
        jsonContentRoute = '/get-json-content',
        jsonContent = { foo: 'bar' },
        binaryContentRoute = '/get-binary-content',
        binaryContentFile = './data/file-test.png';

    before(function(next){

      server = http.createServer(function(req, res){

        if (req.url.indexOf(textContentRoute) === 0){
          res.writeHead(200, {'Content-Type': 'text/plain'});
          res.end(textContent);
        }

        else if (req.url.indexOf(jsonContentRoute) === 0) {
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify(jsonContent));
        }

        else if (req.url.indexOf(binaryContentRoute) === 0) {

          var fileToSend = Path.resolve(__dirname, binaryContentFile),
              stat = fs.statSync(fileToSend);

          res.writeHead(200,
            {'Content-Type': 'image/png'},
            {'Content-Length': stat.size }
          );

          fs.createReadStream(fileToSend).pipe(res);
        }

        else {
          res.writeHead(404, {'Content-Type': 'text/plain'});
          res.end('Not Found');
        }
      });

      server.listen(port, next);
    });

    after(function(next){
      server.close(next);
    });

    it('should return unparsed content if the content-type is not application/json', function(next){

      var httpLoader = new HttpContentLoader(),
          context = new DirectiveContext('http', util.format('//localhost:%s%s', port, textContentRoute), []);

      httpLoader.handle(context, {}, {}, function(err, _context){
        expect(err).to.be.null;
        expect(_context.value).to.not.be.null;
        expect(_context.value).to.be.eq(textContent);
        next();
      });

    });

    it('should return parsed content if the content-type is application/json', function(next) {

      var httpLoader = new HttpContentLoader(),
          context = new DirectiveContext('http', util.format('//localhost:%s%s', port, jsonContentRoute), []);

      httpLoader.handle(context, {}, {}, function(err, _context){
        expect(err).to.be.null;
        expect(_context.value).to.not.be.null;
        expect(_context.value).to.deep.eq(jsonContent);
        next();
      });

    });

    it('should return a Buffer if the content-type is not textual', function(next) {

      var httpLoader = new HttpContentLoader(),
          context = new DirectiveContext('http', util.format('//localhost:%s%s', port, binaryContentRoute), []);

      httpLoader.handle(context, {}, {}, function(err, _context){
        expect(err).to.be.null;
        expect(_context.value).to.be.an.instanceOf(Buffer);
        next();
      });

    });


    it('should return an error if the response status is not 200', function(next){

      var httpLoader = new HttpContentLoader(),
          context = new DirectiveContext('http', util.format('//localhost:%s/should-not-be-found', port), []);

      httpLoader.handle(context, {}, {}, function(err, _context){
        expect(err).to.be.an.instanceOf(errors.HttpRequestError);
        expect(err.status).to.eq(404);
        next();
      });
    });
  });
});