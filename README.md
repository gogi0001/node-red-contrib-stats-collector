## node-red-contrib-stats-collector
A set of nodes for Node-Red allows to collect and analize incoming payloads. All nodes are designed to operate with moment.js library format.

## Available nodes:
* **stats-collector** -- node receives payload and saves it to context with additional info. Node has time counters, which contains the duration of all received payloads after node reset.
Response example:
``` js
{
  "0" : {
    "periodSet" : "2019-08-05T00:13:32.514Z",
    "periodDuration" : 31100
  },
  "1" : {
    "periodSet" : "2019-08-04T23:59:47.741Z",
    "periodDuration" : 56100
  }
}
```

* **prev-state** -- node provides information about previous received payload and its duration. Also, in case of node received the same payload again, it provides duration of staing with current payload.
Response example:
``` js
{
  "currentPayloadSet" : "2019-08-05T18:19:56.671Z",
  "currentPayloadDuration" : 0,
  "currentPayload" : "5",
  "prevPayload" : "3",
  "prevPayloadSet" : "2019-08-05T18:19:29.760Z",
  "prevPayloadDuration" : 26
}
```
## Related
- [moment.js](https://momentjs.com/docs/#/use-it/node-js/) - Parse, validate, manipulate, and display dates and times in JavaScript.
