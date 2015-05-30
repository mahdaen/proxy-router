## **NodeJS Proxy Router CLI**

Small proxy router to route all requests to port 80 by proxying to another hosts and ports.
Run NodeJS, Apache, Nginx, etc together in single server.

***
## **Instalation**

Before installing Proxy Router, ensure you have NodeJS, NPM, and Forever installed in your machine.

Also if you registering NodeJS app to Proxy Router, be carefull since we using **`forever -w start YOURAPP`**.
So if your app doing **`grunt`** or any action that changing files during runtime inside your app folder, we will restart your app.
Add ignore list to file **`.foreverignore`** in your app folder to avoid forever watching your changed files during runtime.
 
Proxy Router currently supported on Mac and Linux machine (who have **`/etc/hosts`** file).

```bash
$ npm install -g proxy-router
```

***
## **Usage**

Please note, you must always run the Proxy Router with root priverllage (sudo). We need it to edit the **`/etc/hosts`** file.

```bash
$ sudo proxy-router COMMAND
```

**Available Commands**

* **start** - Start Proxy Router and all registered NodeJS hosts.
* **stop** - Stop Proxy Router and all registered NodeJS hosts.
* **restart** - Restart Proxy Router.
* **list** - List all register hosts with Proxy Router.
* **add** - Register new NodeJS hosts or another hosts (Apache, Nginx, etc) to Proxy Router
* **delete** - Delete NodeJS hosts or another hosts (Apache, Nginx, etc) from Proxy Router
* **delete-all** - Delete all registered hosts from Proxy Router

When registering hosts, you will be asked for few infos:

* **Server Type** - The server that run your host. If your host is NodeJS app, we will start it after adding host.
* **Protocol** - The protocol of your host. **`http`** or **`https`**
* **Host Name** - The host name of your app. E.g **`dev.app.local`**
* **Target Host** - The original host of your app (without http/https) where your app will be routed from. E.g **`node-app.com`**. Default is localhost (127.0.0.1)
* **Port** - The port of app run on. If your host is NodeJS app, we will use this port to start your app **`--port=PORT`**.
* **Location** - *NodeJS Choice* - Location of your NodeJS app. By default is the path where you run the Proxy Router
* **Server Starter** - *NodeJS Choice* - File name to start your app. Default is **`index.js`**
* **Additional Arguments** - *NodeJS Choice* - Add custom arguments to start your app. E.g **`--prod --safe`**

***
**Example**

Add new host with NodeJS app. 

```bash
macbook:test-app euser$ sudo proxy-router add

? Server Type: (Use arrow keys)
❯ ⦿ NodeJS 
  ⦿ Apache, Nginx, Etc 
? Protocol: (Use arrow keys)
❯ ⦿ http 
  ⦿ https 
? Host Name: test
? Target Host: (127.0.0.1) 
? Port: (8001) 
? Location: (/Users/euser/node-apps/test-app) 
? Server Starter: (index.js) 
? Additional Arguments. Separated by space. --dev --safe

```

After **`test`** host added, Proxy Router will also start the **`test-app`** including the arguments.
Start command will be **`forever -w start index.js --dev --safe --port=8001`**