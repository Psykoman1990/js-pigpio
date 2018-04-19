const Put = require('put');
const assert = require('assert');

exports.reverse_string_and_clean = function (str) {
    var result='';
    var i = str.length-1;
    while (i>str.length-9) {
        result +=str [i-1] +  str[i] ;
        i -=2;
    }
    return parseInt(result,'16');
};

exports.reverse_string = function (str) {
    var result='';
    var i = str.length-1;
    while (i>0) {
            result +=str [i-1] +  str[i] ;
        i -=2;
    }
    return parseInt(result,'16');
};

const _LOCKS = [];

/**
 * A class to store socket and lock.
 * @private
 */
class _socklock {
    constructor(host, port) {
        this.s = null;
        this.host = host;
        this.port = port;
        this._next = [];
    }

    /* eslint: no-unmodified-loop-condition */
    _acquireLock() {
        "use strict";

        if (this.s.id !== undefined) {
            console.warn("aquire lock for " + this.s.id.toString());
        }

        console.warn("Pre acquire:", _LOCKS);

        const start = process.hrtime();

        /* eslint-disable no-unmodified-loop-condition */
        while (_LOCKS[this.host + ':' + this.port] !== undefined) {
            /* if someone else has the lock wait until timeout accured */
            var diff = process.hrtime(start)[1] / (1000000 * 500);
            if (diff >= 1){
                break;
            }
        }
        /* eslint-disable no-unmodified-loop-condition */

        if (_LOCKS[this.host + ':' + this.port] === undefined) {
            _LOCKS[this.host + ':' + this.port] = 'Locked';
        }
        else {
            throw new Error('Can not acquire Lock');
        }

        console.warn("Post aquire:", _LOCKS);
    }

    _releaseLock() {
        "use strict";

        if (this.s.id !== undefined) {
            console.warn("release lock for " + this.s.id.toString());
        }

        console.warn("Pre release:", _LOCKS);

        if (_LOCKS[this.host + ':' + this.port] !== undefined) {
            _LOCKS[this.host + ':' + this.port] = undefined;
        }

        console.warn("Post release:", _LOCKS);
    }
}

exports._socklock = _socklock;

exports._pi_gpio_command = function(socketlock, command, parameter1, parameter2, next, wait_for_response) {
    "use strict";
    assert(command !== undefined, "No command specified");
    const cmd = Put()
        .word32le(command)
        .word32le(parameter1)
        .word32le(parameter2)
        .word32le(0);

    console.warn("__________");

    console.warn("pi_gpio_command: " + command.toString() + " wait for response: " + wait_for_response.toString());

    try {
        socketlock._acquireLock();
    }
    catch (e) {
        console.warn(e.toString());
        next(new Error("Error aquirering lock for sending Command to Pi: "+command));
    }

    if(socketlock.s.id !== undefined) {
        console.warn("on socket with id: " +  socketlock.s.id.toString());
    }

    if (next !== undefined) {
        socketlock._next[command] = next;
    }

    if(!socketlock.s.write(cmd.buffer())) {
        next(new Error("Error Sending Command to Pi: "+command));
    }

    if(!wait_for_response) {
        socketlock._releaseLock();
    }

};
