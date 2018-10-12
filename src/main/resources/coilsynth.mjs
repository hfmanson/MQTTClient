/* Copyright 2013 Chris Wilson

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
//import {Paho} from "./mqttws31.mjs";

export default function createCoilsynth() {
    let
        mqtt
        ;
    const
        host = "tkkrlab-laptop"
        , port = 9001
        , path = "/mqtt"
        , reconnectTimeout = 2000
        , useTLS = false
        , topic = "midi"
        , send = (event) => {
            const
                data = event.data ? event.data : event.detail
                , message = new Paho.MQTT.Message(data)
                ;

            message.destinationName = "midi";
            mqtt.send(message);
        }, onConnect = (ev) => {
            console.log('Connected to ' + host + ':' + port + path);
            // Connection succeeded; subscribe to our topic
            mqtt.subscribe(topic, {qos: 0});
        }, onConnectionLost = (responseObject) => {
            setTimeout(MQTTconnect, reconnectTimeout);
            console.log("connection lost: " + responseObject.errorMessage + ", Reconnecting");
        }, onMessageArrived = (message) => {
            const
                topic = message.destinationName
                , payload = message.payloadBytes
                ;

            console.log(topic + ' = ' + payload);
        }, options = {
            timeout: 3,
            useSSL: useTLS,
            cleanSession: true,
            onSuccess: onConnect,
            onFailure: (message) => {
                console.log("Connection failed: " + message.errorMessage + "Retrying");
                setTimeout(MQTTconnect, reconnectTimeout);
            }
        }, MQTTconnect = function () {
            mqtt = new Paho.MQTT.Client(
                host,
                port,
                path,
                "web_" + parseInt(Math.random() * 100, 10)
            );
            mqtt.onConnectionLost = onConnectionLost;
            //mqtt.onMessageArrived = onMessageArrived;
            console.log("Host = " + host + ", port = " + port + ", path = " + path + ", TLS = " + useTLS);
            mqtt.connect(options);
        }
        ;

    MQTTconnect();
    return {
        send: send
    };
}
