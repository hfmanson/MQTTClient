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
import createPiano from "./piano.mjs";

export default function setupPianoAndSynth(synth) {
    const
        piano = createPiano()        
        , onMIDIInit = (midi) => {
            const
                hookUpMIDIInput = () => {
                    const
                        inputs = midi.inputs.values()
                        , addListener = (eventTarget, handler) => {
                            eventTarget.addEventListener("midimessage", handler, false);
                        }
                        ;

                    for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
                        const value = input.value;
                        addListener(value, synth.send); 
                        addListener(value, piano.send); 
                    }
                }
            ;
            
            hookUpMIDIInput();
            midi.onstatechange = hookUpMIDIInput;
        }
        , onMIDIReject = (err) => {
            alert("The MIDI system failed to start.  You're gonna have a bad time.");
        }
        ;
    
    piano.addEventListener("midimessage", synth.send, false);
    if (navigator.requestMIDIAccess)
        navigator.requestMIDIAccess().then(onMIDIInit, onMIDIReject);
    else
        alert("No MIDI support present in your browser.  You're gonna have a bad time.")
}

