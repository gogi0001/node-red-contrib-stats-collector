module.exports = function(RED) {
    "use strict";

    const moment = require("moment");
    const _ = require("lodash");

    function PayloadChangeStats(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var nodeContext = this.context();
        node.startedAt = moment();

        var nodeState = nodeContext.get('nodeState') || {
            payloadCounters: {},
            lastChanged: moment()
        };

        node.on('input', function(msg) {

            if (!((typeof(msg.payload) === "number") || (typeof(msg.payload) === "string"))) {
                node.warn('Invalid payload type: ' + typeof(msg.payload));
                node.status({ text: 'Invalid payload type: ' + typeof(msg.payload) });
                return;
            }


            function commitState() {
                if (typeof(nodeState.currentPayload) !== "undefined" && typeof(nodeState.lastChanged) !== "undefined") {
                    // Какое-то значение уже было установлено ранее. Нужно обновить там счетчики.
                    var prevPayloadCounter = nodeState.payloadCounters[nodeState.currentPayload];
                    if (typeof(prevPayloadCounter) !== "undefined") {
                        prevPayloadCounter += moment().diff(nodeState.lastChanged, 'seconds');
                    } else {
                        prevPayloadCounter = 0;
                    }
                    nodeState.payloadCounters[nodeState.currentPayload] = prevPayloadCounter;
                }    
            }

            if (msg.topic === "reset") {
                commitState();
                const ret = nodeState.payloadCounters;
                nodeState = {
                    payloadCounters: {},
                    lastChanged: moment()
                };
                nodeContext.set('nodeState', nodeState);
                node.send([null, { topic: msg.topic, payload: ret }]);
                return;
            }


            if (typeof(nodeState.payloadCounters) === "undefined") nodeState.payloadCounters = {};
            
            commitState();

            // Сохраняем текущее состояние
            nodeState.currentPayload = msg.payload;
            nodeState.lastChanged = moment();

            if (typeof(nodeState.payloadCounters[nodeState.currentPayload]) === "undefined") {
                nodeState.payloadCounters[nodeState.currentPayload] = 0;
            };

            nodeContext.set('nodeState', nodeState);
            const ret = nodeState.payloadCounters
            node.send([{ topic: msg.topic, payload: ret }, null]);
        });
    }
    RED.nodes.registerType("payload-change-stats", PayloadChangeStats);
}