module.exports = function(RED) {
    "use strict";

    const moment = require("moment");
    const _ = require("lodash");

    function PrevState(config) {
        RED.nodes.createNode(this, config);

        this.checkMaxDuration = (config.maxDuration > 0);
        if (this.checkMaxDuration) {
            this.maxDuration = moment.duration(Number(config.maxDuration), config.maxDurationType);
            // console.log("md: " + config.maxDuration + " mdt:" + config.maxDurationType + " res:" + _md.asSeconds());
        }

        this.durationType = config.durationType;
        this.onStartup = !config.onStartup ? "restore" : config.onStartup;
        this.startupValue = !config.startupValue ? 0 : config.startupValue;
        this.silentReset = !config.silentReset ? false : (config.silentReset == "1");

        var node = this;
        var nodeContext = this.context();

        // Определяем начальное состояние из контекста, либо - если указано - создаем чистый объект.
        var nodeState = {};
        if (this.onStartup === "defvalue") {
            nodeState = {
                currentPayloadSet: moment(),
                currentPayloadDuration: 0,
                currentPayload: this.startupValue
            }
        } else if (this.onStartup === "restore") {
            nodeState = nodeContext.get("nodeState") || {};
            // // Нужно проверить, насколько давно было сохранено значение в контексте. Если оно протухло - не восстанавливаем его.
            if (typeof(nodeState.currentPayloadSet) !== "undefined") {
                if (this.checkMaxDuration) {
                    var _diff = moment.duration(moment().diff(nodeState.currentPayloadSet));
                    if (_diff.asSeconds() > this.maxDuration.asSeconds()) {
                        // node.warn('Rejected context value: ' + _diff.asSeconds() + ' > ' + this.maxDuration.asSeconds());
                        nodeState = {};
                    }
                }
            }
        }

        node.status({
            text: (typeof(nodeState.currentPayload) !== "undefined") ? nodeState.currentPayload : "",
            fill: (typeof(nodeState.currentPayload) !== "undefined") ? "grey" : ""
        });

            // Ответ на запрос:
            //     prevPayload,
            //     prevPayloadDuration,
            //     prevPayloadSet,
            //     currentPayload,
            //     currentPayloadDuration,
            //     currentPayloadSet,
            //     currentPayloadUpdated,


        node.on('input', function(msg) {
            const boolReset = (typeof(msg.reset) !== "undefined");
            if (boolReset) {
                 // Если получен сигнал сброса, обнуляем объект            
                if (!this.silentReset) {
                    // Перед сбросом отправим последнее значение. Если возможно, обновим счетчик.
                    if (typeof(nodeState.currentPayloadSet) !== "undefined") {
                        nodeState.currentPayloadDuration = moment().diff(nodeState.currentPayloadSet, this.durationType);
                    }
                    node.send({
                        topic: msg.topic,
                        payload: nodeState
                    });        
                }
                // Обнуляем объект и сохраняем в контекст.
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

            // bool undefState = true;
            const undefState = (typeof(nodeState.currentPayload) === "undefined");

            if (!undefState) {
                // node.warn('Есть текущее значение');
                // Нода уже инициализирована
                const samePayload = (nodeState.currentPayload === msg.payload);
                if (samePayload) {
                    if (typeof(nodeState.currentPayloadSet) === "undefined") nodeState.currentPayloadSet = moment();
                    nodeState.currentPayloadDuration = moment().diff(nodeState.currentPayloadSet, this.durationType);
                    nodeState.currentPayloadUpdated = moment();
                    // node.warn('The same payload');
                } else {
                    // node.warn('Другое!');
                    // Другое значение. Нужно вычислить значения предыдущего периода, если они есть.
                    // Если предыдущего периода не было или истек тайм-аут, уберем о них упоминания
                    if (typeof(nodeState.currentPayloadSet) === "undefined") {
                        // node.warn('нет предыдущего!');
                        _.unset(nodeState, ['prevPayload', 'prevPayloadDuration']);
                    } else {
                        // node.warn('есть предыдущее!');
                        nodeState.prevPayload = nodeState.currentPayload;
                        nodeState.prevPayloadSet = nodeState.currentPayloadSet;
                        nodeState.prevPayloadDuration = moment().diff(nodeState.prevPayloadSet, this.durationType);
                    }
                    // Теперь заполняем новые значения
                    nodeState.currentPayload = msg.payload;
                    nodeState.currentPayloadSet = moment();
                    nodeState.currentPayloadDuration = 0;
                    _.unset(nodeState, ['currentPayloadUpdated']);
                }
            } else {
                // node.warn('Нет текущее значение');
                nodeState = {
                    currentPayloadSet: moment(),
                    currentPayloadDuration: 0,
                    currentPayload: msg.payload
                };
            }
            // Отправляем сформированный ответ.
            // node.warn(nodeState);
            node.send({
                topic: msg.topic,
                payload: nodeState
            });

            const text_suffix = (typeof(nodeState.prevPayload) !== "undefined") ? " (" + nodeState.prevPayload + ")" : "";
            const fill = (typeof(nodeState.prevPayload) !== "undefined") ? "green" : "blue";
            node.status({
                text: nodeState.currentPayload + text_suffix,
                fill: fill
            });
            nodeContext.set('nodeState', nodeState);
        });
    }
    RED.nodes.registerType("prev-state", PrevState);
}