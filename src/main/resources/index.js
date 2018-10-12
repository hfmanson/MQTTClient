var host;
var port;
var topic;
var useTLS;
var cleansession;
var username;
var password;
var Paho;

addEventListener("load", function() {
    var mqtt;
    var reconnectTimeout = 2000;
    var playChordMidi = new Uint8Array([ 0x90, 0x40, 0x7f, 0x90, 0x44, 0x7f, 0x90, 0x47, 0x7f, 0x90, 0x4a, 0x7f ]);
    var stopChordMidi = new Uint8Array([ 0x90, 0x40, 0x00, 0x90, 0x44, 0x00, 0x90, 0x47, 0x00, 0x90, 0x4a, 0x00 ]);
    var playChord = new Paho.MQTT.Message(playChordMidi);
    var stopChord = new Paho.MQTT.Message(stopChordMidi);
    var chordButton = document.getElementById("chord");

    playChord.destinationName = "midi";
    stopChord.destinationName = "midi";

    var onConnect = function () {
        document.getElementById('status').value = 'Connected to ' + host + ':' + port + path;
        // Connection succeeded; subscribe to our topic
        mqtt.subscribe(topic, {qos: 0});
        document.getElementById('topic').value = topic;
        document.getElementById("send").addEventListener("click", function (ev) {
            var msgtext = document.getElementById("message").value;
            //var obj = { "text": msgtext };
            //var message = new Paho.MQTT.Message(JSON.stringify(obj));
            var message = new Paho.MQTT.Message(msgtext);
            //message.destinationName = "tkkrlab/ledmatrix";
            message.destinationName = "foo/bar/baz1";
            mqtt.send(message);
        }, false);
        chordButton.addEventListener("mousedown", function () {
            mqtt.send(playChord);
        }, false);
        chordButton.addEventListener("mouseup", function () {
            mqtt.send(stopChord);
        }, false);
    };
    var onConnectionLost = function (responseObject) {
        setTimeout(MQTTconnect, reconnectTimeout);
        document.getElementById('status').value = "connection lost: " + responseObject.errorMessage + ". Reconnecting";
    };
    var onMessageArrived = function (message) {

        var topic = message.destinationName;
        var payload = message.payloadBytes;

        var ws = document.getElementById('ws');
        var li = document.createElementNS("http://www.w3.org/1999/xhtml", "li");
        li.textContent = topic + ' = ' + payload;
        ws.insertBefore(li, ws.firstChild);
    };
    var MQTTconnect = function () {
        if (typeof path === "undefined") {
	    path = '/mqtt';
        }
        mqtt = new Paho.MQTT.Client(
            host,
            port,
            path,
            "web_" + parseInt(Math.random() * 100, 10)
        );
        var options = {
            timeout: 3,
            useSSL: useTLS,
            cleanSession: cleansession,
            onSuccess: onConnect,
            onFailure: function (message) {
                document.getElementById('status').value = "Connection failed: " + message.errorMessage + "Retrying";
                setTimeout(MQTTconnect, reconnectTimeout);
            }
        };
        mqtt.onConnectionLost = onConnectionLost;
        mqtt.onMessageArrived = onMessageArrived;

        if (username !== null) {
            options.userName = username;
            options.password = password;
        }
        console.log("Host="+ host + ", port=" + port + ", path=" + path + " TLS = " + useTLS + " username=" + username + " password=" + password);
        mqtt.connect(options);
    };


    MQTTconnect();
}, false);

