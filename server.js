/* Loading Dependencies */
var http      = require('http'),
    httpProxy = require('http-proxy'),
    proxy     = httpProxy.createProxyServer({}),
    url       = require('url'),
    color     = require('colors/safe');

/* Collecting Hosts */
var hosts = require('/etc/hosts.json');

/* Proxy Logger */
proxy.on('proxyRes', function (pro, req, res) {
    console.log(color.cyan('Request to ') + color.blue.bold(req.headers.host) + color.cyan(' completed by ') + color.magenta.bold(pro.headers.server || 'iojs 2.0.0') + ' at ' + color.bold(pro.headers.date));
});

/* Proxy Resolver */
var resolveWeb = function (host, port, req, res) {
    if ( 'number' === typeof port ) {
        http.get(host + ':' + port, function (ping) {
            console.log(color.green('Serving ') + color.bold(req.headers.host) + color.yellow.bold(req.url) + color.green.bold(' from ') + color.blue.bold(host + ':' + port));

            proxy.web(req, res, { target : host + ':' + port }, function (e) {
                console.log(e);
            });
        }).on('error', function (err) {
            console.log(color.red('Unable to serve ') + color.bold(req.headers.host) + color.yellow.bold(req.url) + color.green.bold(' from ') + color.blue.bold(host + ':' + port));
            console.log(color.red('Sending 500 to client! '));

            res.writeHead(500, { 'Content-Type' : 'text/plain' });
            res.write('An error happened at server. Please contact your administrator.');
            res.end();
        });
    }

    else {
        res.writeHead(500, { 'Content-Type' : 'text/plain' });
        res.write('An error happened at server. Please contact your administrator.');
        res.end();
    }
}

/* Create Main Listener (localhost:80) */
http.createServer(function (req, res) {
    var hostname = req.headers.host.split(":")[ 0 ];
    var pathname = url.parse(req.url).pathname;

    /* Check domain wilchard and redirect it used */
    var wild = hostname.match(/^[w\d]+\./);

    if ( wild ) {
        var rdhost = 'http://' + hostname.replace(/^[w\d]+\./, '') + req.url;
        res.writeHead(302, {
            Location : rdhost
        });
        res.end();
    }
    else {
        if ( hostname in hosts ) {
            var pcl = 'http://';

            if ( hosts[ hostname ].sslc ) pcl = 'https://';

            resolveWeb(pcl + hosts[ hostname ].host, hosts[ hostname ].port, req, res);
        }
        else {
            res.writeHead(404, { 'Content-Type' : 'text/plain' });
            res.write('Not found.');
            res.end();
        }
    }
}).listen(80, function () {
    console.log(color.green.bold('Proxy Router started on port ') + color.blue.bold(80));
}).on('error', function (err) {
    console.log(err);
});
