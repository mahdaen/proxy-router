## **Dynamic Proxy Router**

Small proxy router to route all requests to port 80 by proxying to another hosts and ports.
Run Apache, Nginx, NodeJS, etc together in single server.

***
**Example**

For this sample, says that we run apache server on port **`8000`**, nginx server on port **`8001`** and nodejs app on port **`8002`**. 

**`/etc/hosts`**

```
localhost       127.0.0.1
dev.app.local   127.0.0.1
api.app.local   127.0.0.1
```

**`hosts.json`**

```json
{
    "localhost" : {
        "host" : "http://127.0.0.1",
        "port" : 8000
    },
    "dev.app.local" : {
        "host" : "http://127.0.0.1",
        "port" : 8001
    },
    "api.app.local" : {
        "host" : "http://127.0.0.1",
        "port" : 8002
    }
}
```

## **Installation**

Ensure you have nodejs installed on your machine. To install **`proxy-router`** please clone the repo.
 
Enter to the **`proxy-router`** directory and add your hosts to **`hosts.json`**.

Install dependencies:

```
npm install
```

**Run the server**:

```
sudo node server.js
```

You can use **`forever`** to keep the server running.

```
sudo forever server.js
```