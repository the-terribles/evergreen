# Evergreen

A declarative, referential configuration framework for Node.js.

![Build Status](https://circleci.com/gh/the-terribles/evergreen.svg?style=shield&circle-token=:circle-token)

The ultimate intent is to create a configuration system that will automatically update and/or notify the application of pending updates.  That way, your application always stays free ("evergreen", get it?).

## Status

I am working hard to get the framework documented.  At the moment, the code base is very well tested.  So if you want to get an idea of all the features the API provides, please look at the test cases.  Also, I've done my best to maintain documentation in the code base.  Reading the source code would be another good way to get familiar with it.

If you would like to support the project, please do so by submitting issues and PR's.

### Roadmap

**Version 0.0.1** - templates, directives, stability

**Version 0.0.2** - documentation

**Version 1.0.0** - GA - rubber-stamped for general use.

**Version 2.0.0** - dynamic configuration updates.

## Example

With a config file like this:

`config.json`

```json
{
  "server": {
    "addr": "172.12.32.123",
    "port": 8080
  },
  "databases": {
    "mongo": "$http://{{env.CONFIG_SVC}}/{{env.NODE_ENV}}/mongo/{{env.SERVICE}}",
    "redis": "{{server.addr}}:6379"
  },
  "plugins": "$file:./config/plugins.json"
}
```

An environment like so:

```
CONFIG_SVC=my-config-system:9999
NODE_ENV=blue
SERVICE=email
```

And dependent resourses like the following:

`http://my-config-system:9999/blue/mongo/email`

```
{
  "url": "mongodb://service:password@10.0.2.22,10.0.3.22,10.0.1.22/service"
}
```

`./config/plugins.json`

```
{
  receipts: {
	prefix: '/receipts',
	path: './lib/modules/receipts.js'
  },
  deliveries: {
	prefix: '/deliveries',
	path: './lib/modules/deliveries.js'
  }
}
```

You should get an object graph like this:

```javascript
{
  server: {
    addr: "172.12.32.123",
    port: 8080
  },
  databases: {
    mongo: {
    	url: "mongodb://service:password@10.0.2.22,10.0.3.22,10.0.1.22/service"
    }
    "redis": "172.12.32.123:6379"
  },
  "plugins": {
    receipts: {
    	prefix: '/receipts',
    	path: './lib/modules/receipts.js'
    },
    deliveries: {
    	prefix: '/deliveries',
    	path: './lib/modules/deliveries.js'
    }
  }
}
```

To obtain that graph, you should simply need to:

```javascript
let evergreen = require('evergreen')
                  .renderFile('config.json')
                  .andRequire('./server.json');

```

And to use it, completely unobtrusively in your application, just import the dependency:

`server.js`

```javascript
'use strict';
 
// At this point, config is just a plain old JavaScript object.
let config = require('evergreen').config;
 
let _ = require('lodash'),
    Hapi = require('hapi'),
    server = new Hapi.Server();
     
server.connection({
  host: config.server.addr,
  port: config.server.port,
  routes: {"cors": true}
});   
     
var plugins = _.map(config.plugins, (p) => {
  return { register: require(p.path), options: p };
});     
     
server.register(plugins, (err) => {
   
  if (err) process.exit(1);
   
  server.start(() => {
    server.log(['info'], `Server running at: ${server.info.uri}`);
  });
});
```

## License

The MIT License (MIT)

Copyright (c) 2016 the-terribles

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

