#! /usr/bin/env node

'use strict';

// /* Loading Inquirer */
var inquire = require('inquirer'),
    files   = require('fs'),
    paths   = require('path'),
    execs   = require('child_process').exec,
    color   = require('colors/safe'),
    hosts   = require('./hosts.json'),
    ports   = require('./ports.json');

/* Getting Prefered Port */
var origin = __dirname;
var hostpt = paths.resolve(origin, 'hosts.json');
var portpt = paths.resolve(origin, 'ports.json');

var nport = (ports.port + 1);

/* Getting System Hosts */
var sysHost = files.readFileSync('/etc/hosts', 'utf8');

/* Generate Host List String */
var textHost = function () {
    /* Generating Host List */
    var hostlist = '\r\n# $PROXY-ROUTER HOSTS START\r\n';

    for ( var key in hosts ) {
        hostlist = hostlist + '127.0.0.1\t' + key + '\r\n';
    }

    hostlist = hostlist + '# $PROXY-ROUTER HOSTS ENDS\r\n';

    return hostlist;
}

var curnHost = textHost();

/* Getting generate target dir and target name */
var targetDir,
    targetName,
    cliArg   = process.argv,
    verbose,
    packages = require('./package.json');

if ( cliArg.indexOf('-v') > -1 || cliArg.indexOf('--verbose') > -1 ) {
    verbose = true;
}

/* Start Proxy Server */
var startProxy = function (after) {
    saveHost(function () {
        execs('cd ' + origin + ' && forever start server.js', function (err) {
            if ( err ) {
                console.log('😭' + color.red.bold('  Unable to start Proxy Router!'));
            }
            else {
                console.log('🍻' + color.red.green.bold('  Proxy Router started!'));
            }

            if ( 'function' === typeof after ) {
                after.call();
            }
        });
    });
}

/* Stop Proxy Server */
var closeProxy = function (after) {
    execs('cd ' + origin + ' && forever stop server.js', function (err) {
        if ( err ) {
            console.log('😴' + color.green.bold('  There is nothing to be stopped.'))

            if ( 'function' === typeof after ) {
                after.call();
            }
        }
        else {
            files.writeFile('/etc/hosts', sysHost.replace(curnHost, ''), function (err, str) {
                if ( err ) {
                    console.log('😭' + color.red.bold('  Unable to stop Proxy Router. Please always run proxy-router with sudo!'));
                }
                else {
                    console.log('😭' + color.green.bold('  Proxy Router stopped! Why you stop me?'));
                }

                if ( 'function' === typeof after ) {
                    after.call();
                }
            });
        }
    });
}

/* Save Hosts to /etc/hosts */
var saveHost = function (after) {
    var hostlist = textHost();

    if ( sysHost.match(/\#\s?\$PROXY/) ) {
        files.writeFile('/etc/hosts', sysHost.replace(curnHost, hostlist), function (err) {
            if ( err ) {
                console.log(color.red.bold('Unable to add host. Please always run proxy-router with sudo!'));
                process.exit(0);
            }
            else {
                if ( 'function' === typeof after ) {
                    after.call();
                }
            }
        });
    }
    else {
        files.writeFile('/etc/hosts', sysHost + hostlist, function (err) {
            if ( err ) {
                console.log(color.red.bold('Unable to add host. Please always run proxy-router with sudo!'));
                process.exit(0);
            }
            else {
                if ( 'function' === typeof after ) {
                    after.call();
                }
            }
        });
    }
}

/* Start Routed Server */
var startRoutedServer = function (host, after) {
    var hinfo = hosts[ host ], starter;

    if ( !hinfo.node ) {
        console.log(color.bold(host) + color.green.bold(' is not an NodeJS App. We can\'t start it.'));

        return;
    }

    if ( hinfo.main && files.existsSync(paths.resolve(hinfo.path, hinfo.main)) ) {
        starter = paths.resolve(hinfo.path, hinfo.main);
    }
    else {
        if ( files.existsSync(paths.resolve(hinfo.path, 'package.json')) ) {
            var pkg = require(paths.resolve(hinfo.path, 'package.json'));

            if ( pkg.main && files.existsSync(paths.resolve(hinfo.path, pkg.main)) ) {
                starter = paths.resolve(hinfo.path, pkg.main);
            }
        }
    }

    if ( starter ) {
        var startcmd = 'forever -w start ' + hinfo.main;

        if ( hinfo.args && hinfo.args != '' ) {
            startcmd += ' ' + hinfo.args;
        }

        startcmd += ' --port=' + hinfo.port;

        execs('cd ' + hinfo.path + ' && ' + startcmd, function (err) {
            if ( err ) {
                console.log('😭' + color.red.bold('  Unable to start NodeJS App.'));
            }
            else {
                console.log('🍻  ' + color.bold(host) + ' (' + hinfo.path + ') ' + color.green.bold('Started!'));

                if ( 'function' === typeof after ) {
                    after.call();
                }
            }
        });
    }
    else {
        console.log(color.bold(host) + ' (' + hinfo.path + ') ' + color.green.bold('is not an NodeJS App or no Starter Script defined.'));

        return;
    }

    return;
}

/* Stop Routed Server */
var stopRoutedServer = function (host, after) {
    var hinfo = hosts[ host ];

    if ( hinfo.node && hinfo.path && hinfo.main ) {
        execs('cd ' + hinfo.path + ' && forever stop ' + hinfo.main, function (err) {
            if ( err ) {
                console.log('😭  ' + color.bold(host) + ' (' + hinfo.path + ') ' + color.green.bold('is not started yet.'));
            }
            else {
                console.log('🍻  ' + color.bold(host) + ' (' + hinfo.path + ') ' + color.green.bold('Stopped!'));

                if ( 'function' === typeof after ) {
                    after.call();
                }
            }
        });
    }
    else {
        console.log(color.bold(host) + ' (' + hinfo.path + ') ' + color.green.bold('is not an NodeJS App. We can\'t stop it.'));
    }
}

/* Add Roter Handler */
var addRouter = function () {
    inquire.prompt([
        {
            name    : 'type',
            type    : 'list',
            message : 'Server Type',
            choices : [ '⦿ NodeJS', '⦿ Apache, Nginx, Etc' ]
        },
    ], function (answers) {
        if ( answers.type.search('NodeJS') > -1 ) {
            inquire.prompt([
                {
                    name    : 'protocol',
                    type    : 'list',
                    message : 'Protocol',
                    choices : [ '⦿ http', '⦿ https' ]
                },
                {
                    name    : 'host',
                    type    : 'input',
                    message : 'Host Name'
                },
                {
                    name    : 'path',
                    type    : 'input',
                    message : 'Target Host',
                    default : '127.0.0.1'
                },
                {
                    name    : 'port',
                    type    : 'input',
                    message : 'Port',
                    default : nport
                },
                {
                    name    : 'location',
                    type    : 'input',
                    message : 'Location',
                    default : process.cwd()
                },
                {
                    name    : 'starter',
                    type    : 'input',
                    message : 'Server Starter',
                    default : 'index.js'
                },
                {
                    name    : 'args',
                    type    : 'input',
                    message : 'Additional Arguments. Separated by space.'
                },
            ], function (answers) {
                if ( answers.host !== '' && answers.port !== '' ) {
                    if ( ports.used.indexOf(Number(answers.port)) > -1 ) {
                        console.log(color.red.bold('Port ') + color.bold(answers.port) + color.red.bold(' already used by other host! Adding host canceled!'));
                        process.exit(0);
                    }
                    else {
                        ports.used.push(Number(answers.port));
                        ports.port = Number(answers.port);

                        files.writeFile(portpt, JSON.stringify(ports), function (err) {
                            if ( err ) {
                                console.log(err);
                            }
                        });
                    }

                    hosts[ answers.host ] = {
                        host : answers.path,
                        port : Number(answers.port),
                        path : 'NOJS'
                    }

                    if ( answers.protocol.search('https') > -1 ) {
                        hosts[ answers.host ].sslc = true
                    }

                    if ( answers.location ) {
                        hosts[ answers.host ].node = true;
                        hosts[ answers.host ].path = answers.location;
                    }

                    if ( answers.starter ) {
                        hosts[ answers.host ].main = answers.starter;
                    }

                    if ( answers.args && answers.args != '' ) {
                        hosts[ answers.host ].args = answers.args;
                    }

                    /* Saving Hosts */
                    var hoststr = JSON.stringify(hosts);
                    files.writeFile(hostpt, hoststr, function (err) {
                        if ( err ) {
                            console.log(err);
                        }
                        else {
                            /* Save new Hosts to /etc/hosts */
                            saveHost(function () {
                                /* Start Routed Server */
                                startRoutedServer(answers.host, function () {
                                    /* Restarting Server */
                                    closeProxy(function () {
                                        startProxy();
                                    });
                                });

                                console.log('🍻' + color.green.bold('  New router added!'));
                            });
                        }
                    });
                }
            });
        }
        else {
            inquire.prompt([
                {
                    name    : 'protocol',
                    type    : 'list',
                    message : 'Protocol',
                    choices : [ '⦿ http', '⦿ https' ]
                },
                {
                    name    : 'host',
                    type    : 'input',
                    message : 'Host Name'
                },
                {
                    name    : 'path',
                    type    : 'input',
                    message : 'Target Host',
                    default : '127.0.0.1'
                },
                {
                    name    : 'port',
                    type    : 'input',
                    message : 'Port',
                    default : nport
                }
            ], function (answers) {
                if ( answers.host !== '' && answers.port !== '' ) {
                    if ( ports.used.indexOf(Number(answers.port)) > -1 ) {
                        console.log(color.red.bold('Port ') + color.bold(answers.port) + color.red.bold(' already used by other host! Adding host canceled!'));
                        process.exit(0);
                    }
                    else {
                        ports.used.push(Number(answers.port));
                        ports.port = Number(answers.port);

                        files.writeFile(portpt, JSON.stringify(ports), function (err) {
                            if ( err ) {
                                console.log(err);
                            }
                        });
                    }

                    hosts[ answers.host ] = {
                        host : answers.path,
                        port : Number(answers.port)
                    }

                    if ( answers.protocol.search('https') > -1 ) {
                        hosts[ answers.host ].sslc = true
                    }

                    /* Saving Hosts */
                    var hoststr = JSON.stringify(hosts);
                    files.writeFile(hostpt, hoststr, function (err) {
                        if (err) {
                            console.log(err);
                        } else {
                            /* Save new Hosts to /etc/hosts */
                            saveHost(function () {
                                console.log('🍻' + color.green.bold('  New router added!'));
                            });
                        }
                    });
                }
            });
        }
    });
}

/* Remove Router */
var remRouter = function (after) {
    if ( cliArg.length >= 4 ) {
        var host = cliArg[ 3 ];

        if ( host in hosts ) {
            stopRoutedServer(host);

            delete hosts[ host ];

            /* Saving Hosts */
            var hoststr = JSON.stringify(hosts);
            console.log(hoststr, hosts);
            files.writeFile(hostpt, hoststr, function (err) {
                if ( err ) {
                    console.log(err);
                }
                else {
                    /* Save new Hosts */
                    saveHost(function () {
                        console.log('🍻' + color.red.green.bold('  Router deleted!'));

                        /* Restarting Server */
                        closeProxy(function () {
                            startProxy();
                        });
                    });
                }
            });
        }
        else {
            console.log('🍻' + color.red.green.bold('  There is nothing to be deleted!'));
        }
    }
}

/* Initialize App */
var initialize = function () {
    if ( cliArg.length >= 3 ) {
        var commands = cliArg[ 2 ];

        switch ( commands ) {
            case '-v':
                console.log(color.green.bold(packages.name) + ' - ' + color.bold(packages.version));

                break;
            case 'start':
                startProxy(function () {
                    for ( var key in hosts ) {
                        startRoutedServer(key);
                    }
                });

                break;
            case 'stop':
                closeProxy(function () {
                    for ( var key in hosts ) {
                        stopRoutedServer(key);
                    }
                });

                break;
            case 'restart':
                closeProxy(function () {
                    startProxy();
                });

                break;
            case 'list':
                for ( var key in hosts ) {
                    console.log(
                        color.green.bold('\r\nHosts\t\t: ') +
                        color.bold(key) +
                        color.green.bold('\r\nTarget Port\t: ') +
                        color.bold(hosts[ key ].port)
                    );
                }

                console.log('\r\n');

                break;
            case 'add':
                addRouter();

                break;
            case 'delete':
                remRouter();

                break;
            case 'delete-all':
                closeProxy(function () {
                    hosts = {};
                    ports = { used : [], port : 8000 };

                    var hoststr = JSON.stringify(hosts);
                    files.writeFile(hostpt, hoststr, function (err) {
                        if (err) {
                            console.log(err);
                        } else {
                            files.writeFile(portpt, JSON.stringify(ports), function(err) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    for ( var key in hosts ) {
                                        stopRoutedServer(key);
                                    }

                                    console.log('😭' + color.green.bold('  All router deleted.'));

                                    startProxy();
                                }
                            });
                        }
                    })
                });

                break;
            default :
                console.log('😭' + color.green.bold('  Command ') + color.bold(cliArg[ 2 ]) + color.green.bold(' is not mine.'));

                break;
        }
    }
    else {
        console.log(color.red.bold('At least one argument is required!'));
    }
}

/* Backup current Hosts */
files.writeFile(origin + '/.hosts-bkp', sysHost, function (err) {
    if ( err ) {
        console.log('😭' + color.red.bold('  Remember to run Proxy Router with sudo (as root)'));
        process.exit(0);
    }
    else {
        /* Start App */
        initialize();
    }
});
