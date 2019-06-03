# typesense-steamapps
Indexes steam games to Typesense

https://hub.docker.com/r/typesense/typesense
```
docker run -p 8108:8108 -v ~/typesense-data:/data typesense/typesense:0.10.0 --data-dir /data --api-key=APIKEY --search-only-api-key=SEARCHONLYKEY
```
