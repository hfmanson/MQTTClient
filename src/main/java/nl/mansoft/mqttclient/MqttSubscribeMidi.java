/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package nl.mansoft.mqttclient;

import java.io.IOException;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.sound.midi.InvalidMidiDataException;
import javax.sound.midi.MidiDevice;
import javax.sound.midi.MidiMessage;
import javax.sound.midi.MidiSystem;
import javax.sound.midi.MidiUnavailableException;
import javax.sound.midi.Receiver;
import javax.sound.midi.ShortMessage;
import org.eclipse.paho.client.mqttv3.IMqttClient;
import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.MqttCallback;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;

public class MqttSubscribeMidi implements MqttCallback, Receiver {
    private final static char[] HEXARRAY = "0123456789ABCDEF".toCharArray();
    private final static int PROGRAM_CHANGE = 0xC0;

    private final Receiver receiver;
    private MidiDevice midiIn;
    private IMqttClient iMqttClient;

    public MqttSubscribeMidi(Receiver r, IMqttClient client) {
        receiver = r;
        iMqttClient = client;
    }

    @Override
    public void connectionLost(Throwable thrwbl) {
        System.out.println("connectionLost");
        System.exit(1);
    }

    @Override
    public void messageArrived(String topic, MqttMessage mm) throws Exception {
        byte[] payload = mm.getPayload();
        int length = payload.length;

        System.out.println("messageArrived, topic: " + topic + ", payload: " + bytesToHex(payload));
        int i = 0;
        while (i < length) {
            int status = payload[i];
            int dataLength = getDataLength(status);
            int data1 = dataLength > 0 ? payload[i + 1] : 0;
            int data2 = dataLength > 1 ? payload[i + 2] : 0;
            ShortMessage shortMessage = new ShortMessage(status, data1, data2);
            receiver.send(shortMessage, 0);
            i += dataLength + 1;
        }
    }

    @Override
    public void deliveryComplete(IMqttDeliveryToken imdt) {
        System.out.println("deliveryComplete");
    }

    public void setProgram(int midiProgram) throws InvalidMidiDataException {
        ShortMessage shortMessage = new ShortMessage(PROGRAM_CHANGE, midiProgram, 0);
        receiver.send(shortMessage, 0);
    }

    public void setupMidiIn(int deviceNumber) throws MidiUnavailableException {
        MidiDevice.Info[] infos = MidiSystem.getMidiDeviceInfo();
        MidiDevice.Info info = infos[deviceNumber];
        midiIn = MidiSystem.getMidiDevice(info);
        midiIn.open();
        midiIn.getTransmitter().setReceiver(this);
    }

    public void disconnect() throws MqttException {
        iMqttClient.disconnect();
    }

    public void closeMidiIn() {
        if (midiIn != null) {
            midiIn.close();
        }
    }

    public static String bytesToHex(byte[] bytes) {
        char[] hexChars = new char[bytes.length * 2];
        for ( int j = 0; j < bytes.length; j++ ) {
            int v = bytes[j] & 0xFF;
            hexChars[j * 2] = HEXARRAY[v >>> 4];
            hexChars[j * 2 + 1] = HEXARRAY[v & 0x0F];
        }
        return new String(hexChars);
    }

    public static void midiInfo(MidiDevice.Info[] infos) {
        for (int i = 0; i < infos.length; i++) {
            MidiDevice.Info info = infos[i];
            try {
                MidiDevice device = MidiSystem.getMidiDevice(info);
                System.err.println(i + ": " + info.getName() + ", " + info.getDescription()+ ", " + device.getClass().getName());
            } catch (MidiUnavailableException e) {
                System.err.println(e.getMessage());
            }
        }
    }

    public static MqttSubscribeMidi setupSubscriber(MidiDevice.Info info, String broker, String topic, int midiProgram) throws MqttException, MidiUnavailableException, InvalidMidiDataException, UnknownHostException {
        String clientId     = InetAddress.getLocalHost().getHostName();

        MemoryPersistence persistence = new MemoryPersistence();
        System.err.println("clientId: " + clientId);
        IMqttClient client = new MqttClient(broker, clientId, persistence);
        MqttConnectOptions connOpts = new MqttConnectOptions();
        connOpts.setCleanSession(true);
        System.out.println("Connecting to broker: "+broker);
        client.connect(connOpts);
        System.out.println("Connected");
        MidiDevice device = MidiSystem.getMidiDevice(info);
        device.open();
        MqttSubscribeMidi subscriber = new MqttSubscribeMidi(device.getReceiver(), client);
        subscriber.setProgram(midiProgram);
        //subscriber.setupMidiIn(1);
        client.setCallback(subscriber);
        client.subscribe(topic);
        return subscriber;
    }

    public static void waitForKeypress(String prompt) {
        System.out.println(prompt);
        try {
            System.in.read();
        } catch (IOException ignored) {
        }
    }
    /**
     * Retrieves the number of data bytes associated with a particular
     * status byte value.
     * @param status status byte value, which must represent a short MIDI message
     * @return data length in bytes (0, 1, or 2)
     * @throws <code>InvalidMidiDataException</code> if the
     * <code>status</code> argument does not represent the status byte for any
     * short message
     */
    public static int getDataLength(int status) throws InvalidMidiDataException {
        // system common and system real-time messages
        switch(status) {
        case 0xF6:                      // Tune Request
        case 0xF7:                      // EOX
            // System real-time messages
        case 0xF8:                      // Timing Clock
        case 0xF9:                      // Undefined
        case 0xFA:                      // Start
        case 0xFB:                      // Continue
        case 0xFC:                      // Stop
        case 0xFD:                      // Undefined
        case 0xFE:                      // Active Sensing
        case 0xFF:                      // System Reset
            return 0;
        case 0xF1:                      // MTC Quarter Frame
        case 0xF3:                      // Song Select
            return 1;
        case 0xF2:                      // Song Position Pointer
            return 2;
        default:
        }

        // channel voice and mode messages
        switch(status & 0xF0) {
        case 0x80:
        case 0x90:
        case 0xA0:
        case 0xB0:
        case 0xE0:
            return 2;
        case 0xC0:
        case 0xD0:
            return 1;
        default:
            throw new InvalidMidiDataException("Invalid status byte: " + status);
        }
    }

    public static void main(String[] args) throws MqttException, MidiUnavailableException, InvalidMidiDataException, UnknownHostException {
        MidiDevice.Info[] infos = MidiSystem.getMidiDeviceInfo();
        if (args.length == 0) {
            midiInfo(infos);
        } else if (args.length >= 2) {
            int deviceNumber = Integer.parseInt(args[0]);
            String broker = args[1];
            MidiDevice.Info info = infos[deviceNumber];
            String topic = args.length > 2 ? args[2] : "midi";
            int midiProgram = args.length > 3 ? Integer.parseInt(args[3]) : 0;
            //IMqttClient client = setupSubscriber(info, broker, topic, midiProgram);
            MqttSubscribeMidi subscribeMidi = setupSubscriber(info, broker, topic, midiProgram);
            //NanoHTTPD.main(new String[] { "-d", "src/main/resources", "-p", "8000" });
            waitForKeypress("Subscriber started, Hit Enter to stop.");
            subscribeMidi.closeMidiIn();
            subscribeMidi.disconnect();
            System.out.println("Disconnected");
        } else {
            String appName = MqttSubscribeMidi.class.getName();
            System.err.println("Usage: " + appName + " <device number> <broker> [topic] [midi program]\nEg. " + appName + " 0 tcp://raspberrypi2:1883 midi 19");
        }
    }

    @Override
    public void send(MidiMessage message, long timeStamp) {
        try {
            System.err.println(timeStamp + ": " +  bytesToHex(message.getMessage()));
            MqttMessage mqttMessage = new MqttMessage(message.getMessage());
            iMqttClient.publish("midi", mqttMessage);
        } catch (MqttException ex) {
            Logger.getLogger(MqttSubscribeMidi.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    @Override
    public void close() {
    }
}
