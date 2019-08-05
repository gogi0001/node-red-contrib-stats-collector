module.exports = function(RED) {
    "use strict";

    const moment = require("moment");
    const _ = require("lodash");

    function StatsCollector(config) {
        RED.nodes.createNode(this, config);

        this.silentReset = !config.silentReset ? false : (config.silentReset == "1");
        this.onStartup = !config.onStartup ? "restore" : config.onStartup;
        this.startupValue = !config.startupValue ? 0 : config.startupValue;

        var node = this;
        var nodeContext = this.context();

        var nodeState = {};
        var nodeHistory = {};
        if (this.onStartup === "restore") {
            // Восстанавливаем счетчики из контекста
            nodeState = nodeContext.get("nodeState") || {};
            nodeHistory = nodeContext.get('nodeHistory') || {};
        } else {
            // Не восстанавливаем счетчики из контекста
            if (this.onStartup === "defvalue") {
                nodeState = {
                    currentPayloadSet: moment(),
                    currentPayload: this.startupValue
                }
                nodeHistory[this.startupValue] = {
                    periodStarted: moment(),
                    periodDuration: 0
                }
            }
            // Записываем новый контекст
            nodeContext.set('nodeHistory', nodeHistory);
            nodeContext.set('nodeState', nodeState);    
        }
        node.status({ text: "", fill: "grey" });

        node.on('input', function(msg) {
            const boolReset = (typeof(msg.reset) !== "undefined");
            if (boolReset) {
                // Если получен сигнал сброса, обнуляем объект            
                if (!this.silentReset) {
                    // Перед сбросом отправим последнее значение. Если возможно, обновим счетчик.
                    if (typeof(nodeState.currentPayloadSet) !== "undefined") {
                        const p = moment().diff(nodeState.currentPayloadSet, 'seconds');
                        if (typeof(nodeHistory[nodeState.currentPayload]) === "undefined") {
                            nodeHistory[msg.payload] = {
                                periodStarted: moment(),
                                periodDuration: 0
                            }
                        }
                        nodeHistory[nodeState.currentPayload].periodDuration += p;
                        node.send({
                            topic: nodeState.currentTopic,
                            payload: nodeHistory
                        });        
                    }
                }
                nodeHistory = {};
                nodeContext.set('nodeHistory', nodeHistory);
                nodeState = {};
                nodeContext.set('nodeState', nodeState);
                node.status({ text: 'reset', fill: "red" });
                return;
            }

            const badPayload = (typeof(msg.payload) !== "number") && (typeof(msg.payload) !== "string");
            if (badPayload) {
                node.warn('Invalid payload type: ' + typeof(msg.payload));
                node.status({ text: 'Invalid payload type: ' + typeof(msg.payload) });
                return;
            }

            // Проверим, есть ли история этого значения и создадим ее при необходимости
            if (typeof(nodeHistory[msg.payload]) === "undefined") {
                nodeHistory[msg.payload] = {
                    periodStarted: moment(),
                    periodDuration: 0
                };
            }

            var currentStateDuration = 0;
            const undefState = (typeof(nodeState.currentPayload) === "undefined");
            if (!undefState) {
                var periodIncrement = 0;
                // Значение уже было установлено ранее. Обновляем текущее состояние и вычисляем данные для истории.
                if (typeof(nodeState.currentPayloadSet) !== "undefined") {
                    periodIncrement = moment().diff(nodeState.currentPayloadSet, 'seconds');
                }
                if (typeof(nodeHistory[nodeState.currentPayload]) === "undefined") nodeHistory[nodeState.currentPayload] = {
                    periodStarted: moment(),
                    periodDuration: 0    
                }
                if (nodeState.currentPayload !== msg.payload) {
                    // Значение поменялось
                    nodeHistory[nodeState.currentPayload].periodDuration += periodIncrement;
                    nodeState.currentPayload = msg.payload;
                } else {
                    nodeHistory[nodeState.currentPayload].periodDuration += periodIncrement;
                }
                currentStateDuration = nodeHistory[nodeState.currentPayload].periodDuration;
                nodeState.currentPayloadSet = moment();
            }  else {
                nodeState = {
                    currentPayloadSet: moment(),
                    currentPayload: msg.payload
                };
            }
            nodeState.currentTopic = msg.topic;
            nodeContext.set('nodeHistory', nodeHistory);
            nodeContext.set('nodeState', nodeState);
            node.status({ 
                text: nodeState.currentPayload + " (" + currentStateDuration + ")", 
                fill: "blue" 
            });
            node.send({
                topic: msg.topic,
                payload: nodeHistory
            });        
        });
    }
    RED.nodes.registerType("stats-collector", StatsCollector);
}