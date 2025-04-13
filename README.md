# node-mq-prime-ecosystem
 ```
$ docker volume create qm1data
$ docker run --env LICENSE=accept --env MQ_QMGR_NAME=QM1 --volume qm1data:/mnt/mqm --publish 1414:1414 --publish 9443:9443 --detach --env MQ_APP_USER=app --env MQ_APP_PASSWORD=appIsSecure --env MQ_ADMIN_USER=admin --env MQ_ADMIN_PASSWORD=adminIsSecure --name QM1 icr.io/ibm-messaging/mq:latest
```

```
$ docker volume create redisdata
$ docker run --name redis -p 6379:6379 -v redisdata:/data -d redis redis-server --requirepass appIsSecure
$ docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 -v redisdata:/data -e REDIS_ARGS="--requirepass redisIsSecure" redis/redis-stack:latest
```

```
$ docker volume create mqsqlvolume
$ docker run --name mssql -e 'ACCEPT_EULA=Y' -e 'MSSQL_SA_PASSWORD=mssqlIsSecure!' -p
 1433:1433 -v mqsqlvolume:/var/opt/mssql -d mcr.microsoft.com/mssql/server:2022-latest 
```
