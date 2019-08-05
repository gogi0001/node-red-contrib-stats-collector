# node-red-contrib-stats-collector
A set of nodes for Node-Red allows to collect and analize incoming payloads.
Available nodes:
* stats-collector -- node receives payload and saves it to context with additional info. Node has time counters, which contains the duration of all received payloads after node reset.
* prev-state -- node provides information about previous received payload and its duration. Also, in case of node received the same payload again, it provides duration of staing with current payload.
