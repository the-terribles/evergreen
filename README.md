# Evergreen

A declarative, referential configuration framework for Node.js.

![Build Status](https://circleci.com/gh/the-terribles/evergreen.svg?style=shield&circle-token=:circle-token)

## Example

With a config file like this:

```json
{
	"$extends": ["$ref:fw://default.json", "$ref:fw://{{process.env.NODE_ENV}}.json"],
	"api": {
		"host": "10.1.1.2",
		"port": 7775
	},
	"resources": {
		"base_url": "http://{{api.host}}:{{api.port}}/api/",
		"users": "{{resources.base_url}}/users"
	},
	"cache": "$ref:consul://consul.youeye.com/{{process.env}}/cache",
	"serviceA": "$factory:(../lib/blah)($this, $r('api.port'))"
}


{
	"consul_keyspace": "{{consul_host}}/{{env.NODE_ENV}}",
	"cache": "$ref:consul://{{consul_keyspace}}/cache",
	"db": "$ref:consul://{{consul_keyspace}}/db"
}
```

You should be able to load configuration like this:

```javascript

let configurator = require('evergreen')
                     .addModules('consul')
                     .addModule('data-object')
                     .load('config.json');

configurator.on('load', (err, config) => {
	// Wire up application.
	// Config at this point should be a 
	// Plain-Old JavaScript Object.
});

// Alternatively, you should be able to watch for
// changes in config if a referenced data source (e.g. Consul)
// supports changes:
configurator.on('change', (err, config) => {
	// This will fire onload and whenever any value has changed.
});

// Or only watch for a subset of the configuration tree to change and react to that change.
configurator.on('change', ['cache', 'resources.blah', /resources[.].*/gi], (config) => {

});


configurator.launchOnChange((err, config, whenDone) => {
	
	var httpServer = null;
	
	whenDone();
	
});

configurator.loadEntry('index.js');

```

Index.js

```javascript


```


```bash
NODE_ENV=production evergreen config.json --show-tree
```

## But Why?

1. I don't want to do a bunch of extraneous things in my application (like load stores or use a service locator to get config). 
2. Don't flatten my configuration hierarchy.
3. Allow me to reuse values declared in my config.
4. Allow me to specify external sources of configuration.
5. Give me the option to change my running application when configuration changes.
