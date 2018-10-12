export default function createPiano() {
    const
        eventTarget = document.createElement("div")
        , pianoKeys = document.querySelectorAll(".key")
        , addEventListener = (type, listener, useCapture) => {
            eventTarget.addEventListener(type, listener, useCapture);
        }, createMidiMessageEvent = (data) => {
            if (window.MIDIMessageEvent) {
                return new MIDIMessageEvent("midimessage", { data: data });
            } else {
                return new CustomEvent("midimessage", { detail: data });
            }
        }, dispatchMidiEvent = (data) => {
            const midievent = createMidiMessageEvent(data);
            eventTarget.dispatchEvent(midievent);
        }, keyHandler = (el) => {
            let playing = false;
            const
                startPlaying = (target) => {
                    if (!playing) {
                        const note = parseInt(target.getAttribute("data-note"))
                        console.log("Start playing, note: " + note);
                        playing = true;
                        dispatchMidiEvent(new Uint8Array([ 0x90, note, 0x7f ]));
                        target.setAttribute("style", "background: blue");
                    }
                }, stopPlaying = (target) => {
                    if (playing) {
                        const note = parseInt(target.getAttribute("data-note"))
                        console.log("Stop playing, note: " + note);
                        playing = false;
                        dispatchMidiEvent(new Uint8Array([ 0x90, note, 0x00 ]));
                        target.setAttribute("style", "");
                   }
                }, pointerWatcher = () => {
                    el.addEventListener("pointerdown", (ev) => {
                        startPlaying(ev.target);
                    }, false);
                    el.addEventListener("pointerover", (ev) => {
                        if (ev.pressure !== 0) {
                            startPlaying(ev.target);
                        }
                    }, false);
                    for (const evname of [ "pointerout", "pointerup" ]) {
                        el.addEventListener(evname, (ev) => {
                            stopPlaying(ev.target);
                        }, false);
                    }
                }, touchWatcher = () => {
                    let prevTarget;

                    el.addEventListener("touchstart", (ev) => {
                        prevTarget = ev.target;
                        startPlaying(prevTarget);
                        ev.preventDefault();
                    }, false);
                    el.addEventListener("touchmove", (ev) => {
                        const
                            touch = ev.targetTouches[0]
                            , target = document.elementFromPoint(touch.pageX, touch.pageY)
                            ;

                        if (prevTarget != target) {
                            stopPlaying(prevTarget);
                            startPlaying(target);
                            prevTarget = target;
                        }
                        ev.preventDefault();
                    }, false);
                    el.addEventListener("touchend", (ev) => {
                        stopPlaying(prevTarget);
                        prevTarget = undefined;
                        ev.preventDefault();
                    }, false);
                }, keyWatcher = () => {
                    const key = el.getAttribute("data-key");

                    window.addEventListener("keydown", (ev) => {
                        if (!ev.repeat && ev.key === key && !playing) {
                            startPlaying(el);
                        }
                    }, false);
                    window.addEventListener("keyup", (ev) => {
                        if (!ev.repeat && ev.key === key && playing) {
                            stopPlaying(el);
                        }
                    }, false);
                }
                ;
            
            if (window.ontouchstart === undefined) {
                pointerWatcher();
            } else {
                touchWatcher();
            }
            keyWatcher();
        }, send = (event) => {
            //console.log(event);
            const el = document.querySelector("[data-note=\"" + event.data[1] + "\"]");
            if (el) {
                // Mask off the lower nibble (MIDI channel, which we don't care about)
                switch (event.data[0] & 0xf0) {
                    case 0x90:
                        if (event.data[2] !== 0) {  // if velocity != 0, this is a note-on message
                            el.setAttribute("style", "background: blue");
                            return;
                        }
                        // if velocity == 0, fall thru: it's a note-off.  MIDI's weird, ya'll.
                    case 0x80:
                        el.setAttribute("style", "");
                        return;
                }
            }
        }
        ;
    
    for (const pianoKey of pianoKeys) {
        //console.log(pianoKey);
        keyHandler(pianoKey);
    }  
    return {
        send: send,
        addEventListener: addEventListener
    };
}

