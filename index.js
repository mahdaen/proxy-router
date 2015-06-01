#! /usr/bin/env node

'use strict';

// /* Loading Inquirer */
var inquire = require('inquirer'),
    files   = require('fs'),
    paths   = require('path'),
    execs   = require('child_process').exec,
    color   = require('colors/safe');

/* Getting Prefered Port */
var origin = __dirname;
var hostpt = paths.resolve('/etc/hosts.json');
var portpt = paths.resolve('/etc/ports.json');

/* Ensure Hosts json exist */
try {
    var st = files.statSync(hostpt);
}
catch ( err ) {
    files.writeFileSync(hostpt, '{}');
}

/* Ensure Hosts json exist */
try {
    var st = files.statSync(portpt);
}
catch ( err ) {
    files.writeFileSync(portpt, '{"used":[],"port":8000}');
}

/* Getting Hosts and Ports */
var hosts = require(hostpt),
    ports = require(portpt);

var nport = (ports.port + 1);

/* Getting System Hosts */
var sysHost = files.readFileSync('/etc/hosts', 'utf8');

/* Generate Host List String */
var textHost = function () {
    /* Generating Host List */
    var hostlist = '\r\n# $PROXY-ROUTER HOSTS START\r\n';

    for ( var key in hosts ) {
        hostlist += (ports.defip || '127.0.0.1') + '\t' + key + '\r\n';
        hostlist += (ports.defip || '127.0.0.1') + '\t' + (hosts[ key ].wild || 'www') + '.' + key + '\r\n';
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
                console.log('🍻' + color.red.green('  Proxy Router successfully started!'));
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
            console.log('😴' + color.green('  There is nothing to be stopped.'))

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
                    console.log('😭' + color.green('  Proxy Router successfully stopped! Why you stop me?'));
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

    /* Skip if not an NodeJS app */
    if ( !hinfo.node ) {
        console.log(color.bold(host) + ' (' + (hinfo.path || 'Apache, Nginx, etc') + ') ' + color.green('is not an NodeJS App. We can\'t start it.'));

        return;
    }

    /* Skip if no server path defined */
    if ( !hinfo.path ) return console.log(color.bold(host) + color.red.bold(" doesn't have server path. We can't start it!"));

    /* Ensure server path is exist */
    var starter;

    try {
        starter = files.statSync(hinfo.path);

        if ( !starter || !starter.isDirectory ) {
            starter = false;
        }
    }
    catch ( err ) {
        starter = false;
    }

    if ( starter ) {
        /* Getting main file, start command and arguments */
        var manfile = hinfo.main;
        var mancmds = hinfo.cmds;
        var manargs = hinfo.args;

        /* Solving main cases */
        if ( !manfile || manfile === '-' ) manfile = '';
        if ( !mancmds || manargs === '-' ) mancmds = '';
        if ( !manargs || manargs === '-' ) manargs = '';

        /* Creating Start Command */
        var startcmd = 'cd ' + hinfo.path + ' && ' + mancmds + ' ' + manfile + ' ' + manargs + ' --port=' + hinfo.port;

        execs(startcmd, function (err) {
            if ( err ) {
                console.log('😭' + color.red.bold('  Unable to start NodeJS App.'));
            }
            else {
                console.log('🍻  ' + color.bold(host) + ' (' + hinfo.path + ') ' + color.green('Successfully started!'));

                if ( 'function' === typeof after ) {
                    after.call();
                }
            }
        });
    }

    return;
}

/* Stop Routed Server */
var stopRoutedServer = function (host, after) {
    var hinfo = hosts[ host ];

    if ( hinfo.node && hinfo.path && hinfo.main ) {
        /* Getting main file and stop command */
        var manfile = hinfo.main;
        var mancmds = hinfo.cmdo;

        /* Handling unknown command and man file */
        if ( !manfile || manfile === '-' ) manfile = '';
        if ( !mancmds ) mancmds = 'forever stop';

        /* Creating command string */
        var command = 'cd ' + hinfo.path + ' && ' + mancmds + ' ' + manfile

        /* Executing stop-server command */
        execs(command, function (err) {
            if ( err ) {
                console.log('😭  ' + color.bold(host) + ' (' + hinfo.path + ') ' + color.green('is not started yet.'));
            }
            else {
                console.log('🍻  ' + color.bold(host) + ' (' + hinfo.path + ') ' + color.green('Successfully stopped!'));

                if ( 'function' === typeof after ) {
                    after.call();
                }
            }
        });
    }
    else {
        console.log(color.bold(host) + ' (' + (hinfo.path || 'Apache, Nginx, etc') + ') ' + color.green('is not an NodeJS App. We can\'t stop it.'));
    }
}

/* Default Prompt Value */
var prmdefault = {
    sslc : 0,
    name : null,
    wild : 'www',
    host : 'localhost',
    port : nport,
    path : process.cwd(),
    node : 0,
    main : 'index.js',
    cmds : 'forever -w start',
    cmdo : 'forever stop',
    args : '--prod'
}

var getPrompt = function (def, full) {
    /* Main Prompt */
    var lessprompt = [
        {
            name    : 'protocol',
            type    : 'list',
            message : 'Protocol',
            choices : [ '⦿ http', '⦿ https' ],
            default : def.sslc
        },
        {
            name    : 'host',
            type    : 'input',
            message : 'Host Name',
            default : def.name
        },
        {
            name    : 'wild',
            type    : 'input',
            message : 'Domain Wildcard',
            default : def.wild
        },
        {
            name    : 'path',
            type    : 'input',
            message : 'Target Host',
            default : def.host
        },
        {
            name    : 'port',
            type    : 'input',
            message : 'Port',
            default : def.port
        }
    ];

    /* Prompt for NodeJS App */
    var fullprompt = [
        {
            name    : 'location',
            type    : 'input',
            message : 'Location',
            default : def.path
        },
        {
            name    : 'starter',
            type    : 'input',
            message : 'Main File',
            default : def.main
        },
        {
            name    : 'command',
            type    : 'input',
            message : 'Start Command',
            default : def.cmds
        },
        {
            name    : 'destroy',
            type    : 'input',
            message : 'Stop Command',
            default : def.cmdo
        },
        {
            name    : 'args',
            type    : 'input',
            message : 'Runtime Flags',
            default : def.args
        },
    ];

    return full ? lessprompt.concat(fullprompt) : lessprompt;
}

/* Add Roter Handler */
var editmode = false;

var addRouter = function () {
    inquire.prompt([
        {
            name    : 'type',
            type    : 'list',
            message : 'Server Type',
            choices : [ '⦿ NodeJS', '⦿ Apache, Nginx, Etc' ],
            default : prmdefault.node
        },
    ], function (answers) {
        if ( answers.type.search('NodeJS') > -1 ) {
            inquire.prompt(getPrompt(prmdefault, true), function (answers) {
                if ( answers.host !== '' && answers.port !== '' ) {
                    if ( !editmode ) {
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
                    }

                    hosts[ answers.host ] = {
                        host : answers.path,
                        port : Number(answers.port),
                        path : 'NOJS'
                    }

                    if ( answers.wild && answers.wild != '' ) {
                        hosts[ answers.host ].wild = answers.wild;
                    }

                    if ( answers.protocol.search('https') > -1 ) {
                        hosts[ answers.host ].sslc = 1
                    }

                    if ( answers.location ) {
                        hosts[ answers.host ].node = 0;
                        hosts[ answers.host ].path = answers.location;
                    }

                    if ( answers.starter ) {
                        hosts[ answers.host ].main = answers.starter;
                    }

                    if ( answers.command ) {
                        hosts[ answers.host ].cmds = answers.command;
                    }

                    if ( answers.destroy ) {
                        hosts[ answers.host ].cmdo = answers.destroy;
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

                                console.log('🍻' + color.green('  New router added!'));
                            });
                        }
                    });
                }
            });
        }
        else {
            inquire.prompt(getPrompt(prmdefault), function (answers) {
                if ( answers.host !== '' && answers.port !== '' ) {
                    if ( !editmode ) {
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
                    }

                    hosts[ answers.host ] = {
                        host : answers.path,
                        port : Number(answers.port),
                        path : 'Apache, Nginx, etc'
                    }

                    if ( answers.wild && answers.wild != '' ) {
                        hosts[ answers.host ].wild = answers.wild;
                    }

                    if ( answers.protocol.search('https') > -1 ) {
                        hosts[ answers.host ].sslc = true
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
                                console.log('🍻' + color.green('  New router added!'));
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
            files.writeFile(hostpt, hoststr, function (err) {
                if ( err ) {
                    console.log(err);
                }
                else {
                    /* Save new Hosts */
                    saveHost(function () {
                        console.log('🍻' + color.red.green('  Router successfully deleted!'));

                        /* Restarting Server */
                        closeProxy(function () {
                            startProxy();
                        });
                    });
                }
            });
        }
        else {
            console.log('🍻' + color.red.green('  There is nothing to be deleted!'));
        }
    }
}

/* Initialize App */
var showHelp = function () {
    console.log('\r\n');
    console.log('\t' + color.green(packages.name) + ' - ' + color.bold('v' + packages.version));
    console.log('\t' + packages.description);
    console.log('\r\n');
    console.log('\t' + 'start \t\t\t' + 'Start Proxy Router with all registered NodeJS hosts');
    console.log('\t' + 'stop \t\t\t' + 'Stop Proxy Router with all registered NodeJS hosts');
    console.log('\t' + 'restart \t\t' + 'Restart Proxy Router');
    console.log('\t' + 'list \t\t\t' + 'List all registerd hosts');
    console.log('\t' + 'add \t\t\t' + 'Register new host to Proxy Router');
    console.log('\t' + 'delete \t\t\t' + 'Delete host from Proxy Router and stop it (NodeJS host)');
    console.log('\t' + 'delete-all \t\t' + 'Delete all hosts from Proxy Router and stop them (NodeJS host)');
    console.log('\t' + 'default-ip \t\t' + 'Set default IP address');
    console.log('\r\n');
}

var initialize = function () {
    if ( cliArg.length >= 3 ) {
        var commands = cliArg[ 2 ];

        switch ( commands ) {
            case '-v':
                console.log(color.green(packages.name) + ' - ' + color.bold('v' + packages.version));

                break;
            case '-h':
                showHelp();

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
                var ln = 0;
                for ( var key in hosts ) {
                    ln++;
                    console.log(
                        color.green('\r\nHosts\t\t: ') +
                        color.bold(key) +
                        color.green('\r\nTarget Port\t: ') +
                        color.bold(hosts[ key ].port)
                    );
                }

                if ( ln === 0 ) {
                    console.log(color.green('No proxies registered. Please register one using ') + 'sudo proxy-router add');
                }
                else {
                    console.log('\r\n');
                }

                break;
            case 'add':
                addRouter();

                break;
            case 'delete':
                remRouter();

                break;
            case 'edit':
                if ( cliArg.length >= 4 ) {
                    var hst = cliArg[ 3 ];

                    if ( hst in hosts ) {
                        var chost = hosts[ hst ];

                        editmode = true;
                        prmdefault.name = hst;

                        if ( !chost.node ) prmdefault.node = 1;

                        Object.keys(chost).forEach(function (prop) {
                            if ( prop !== 'name' && prop !== 'node' ) {
                                prmdefault[ prop ] = chost[ prop ];
                            }
                        });

                        addRouter();
                    }
                    else {
                        console.log('Hostname ' + color.red(hst) + ' is not registered.');
                    }
                }
                else {
                    console.log(color.red.bold('Hostname to be edited is required.'));
                    showHelp();
                }

                break;
            case 'delete-all':
                closeProxy(function () {
                    hosts = {};
                    ports = { used : [], port : 8000 };

                    var hoststr = JSON.stringify(hosts);
                    files.writeFile(hostpt, hoststr, function (err) {
                        if ( err ) {
                            console.log(err);
                        }
                        else {
                            files.writeFile(portpt, JSON.stringify(ports), function (err) {
                                if ( err ) {
                                    console.log(err);
                                }
                                else {
                                    for ( var key in hosts ) {
                                        stopRoutedServer(key);
                                    }

                                    console.log('😭' + color.green('  All router successfully deleted.'));

                                    startProxy();
                                }
                            });
                        }
                    })
                });

                break;
            case 'default-ip':
                inquire.prompt([
                    {
                        name    : 'ipaddr',
                        type    : 'input',
                        message : 'Default IP Address',
                        default : '127.0.0.1'
                    }
                ], function (answer) {
                    /* Use local ip if not defined */
                    if ( !answer.ipaddr || answer.ipaddr === '-' ) answer.ipaddr = '127.0.0.1';

                    /* Change default IP */
                    ports.defip = answer.ipaddr;

                    /* Save Default IP */
                    files.writeFile(portpt, JSON.stringify(ports), function (err) {
                        if ( err ) {
                            console.log(err);
                        }
                        else {
                            console.log(color.green('Default IP Address ') + ports.defip + ' successfully saved.');
                        }
                    });
                });

                break;
            default :
                console.log('😭' + color.green('  Unknown command: ') + color.bold(cliArg[ 2 ]));

                break;
        }
    }
    else {
        console.log(color.red.bold('At least one argument is required!'));
    }
}

/* Backup current Hosts */
files.writeFile('/etc/.hosts-bkp', sysHost, function (err) {
    if ( err ) {
        console.log('😭' + color.red.bold('  Remember to run Proxy Router with sudo (as root)'));
        process.exit(0);
    }
    else {
        /* Start App */
        initialize();
    }
});
