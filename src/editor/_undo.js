/*
Simple Javascript undo and redo.
https://github.com/ArthurClemens/Javascript-Undo-Manager
*/

;(function() {

    'use strict';

    function removeFromTo(array, from, to) {
        array.splice(from,
            !to ||
            1 + to - from + (!(to < 0 ^ from >= 0) && (to < 0 || -1) * array.length));
        return array.length;
    }

    var UndoManager = function() {

        var commands = [],
            index = -1,
            limit = 0,
            isExecuting = false,
            callback,
            
            // functions
            execute;

        execute = function(command, action) {
            if (!command || typeof command[action] !== "function") {
                return this;
            }
            isExecuting = true;

            command[action]();

            isExecuting = false;
            return this;
        };

        return {

            /*
            Add a command to the queue.
            */
            add: function (command) {
                if (isExecuting) {
                    return this;
                }
                // if we are here after having called undo,
                // invalidate items higher on the stack
                commands.splice(index + 1, commands.length - index);

                commands.push(command);
                
                // if limit is set, remove items from the start
                if (limit && commands.length > limit) {
                    removeFromTo(commands, 0, -(limit+1));
                }
                
                // set the current index to the end
                index = commands.length - 1;
                if (callback) {
                    callback();
                }
                return this;
            },

            /*
            Pass a function to be called on undo and redo actions.
            */
            setCallback: function (callbackFunc) {
                callback = callbackFunc;
            },

            /*
            Perform undo: call the undo function at the current index and decrease the index by 1.
            */
            undo: function () {
                var command = commands[index];
                if (!command) {
                    return this;
                }
                execute(command, "undo");
                index -= 1;
                if (callback) {
                    callback();
                }
                return this;
            },

            /*
            Perform redo: call the redo function at the next index and increase the index by 1.
            */
            redo: function () {
                var command = commands[index + 1];
                if (!command) {
                    return this;
                }
                execute(command, "redo");
                index += 1;
                if (callback) {
                    callback();
                }
                return this;
            },

            /*
            Clears the memory, losing all stored states. Reset the index.
            */
            clear: function () {
                var prev_size = commands.length;

                commands = [];
                index = -1;

                if (callback && (prev_size > 0)) {
                    callback();
                }
            },

            hasUndo: function () {
                return index !== -1;
            },

            hasRedo: function () {
                return index < (commands.length - 1);
            },

            getCommands: function () {
                return commands;
            },

            getIndex: function() {
                return index;
            },
            
            setLimit: function (l) {
                limit = l;
            }
        };
    };

    if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {
        // AMD. Register as an anonymous module.
        define(function() {
            return UndoManager;
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = UndoManager;
    } else {
        window.UndoManager = UndoManager;
    }

}());

var Undos = new UndoManager();

function Undoable(redo, undo, title, silent) {
    var self = this;

    self.undo = undo;
    self.redo = redo;


    undoHistory.index++;
    undoHistory.title = title || 'last action';

    // hack until pushState's title param works in all browsers:
    var docTitle = document.title + '';
    document.title = undoHistory.title;
    history.pushState({ undoIndex: undoHistory.index }, undoHistory.title);
    //document.title = docTitle;

    var task = { undo: undo, redo: redo };
    Undos.add(task);

    if(!silent) task.redo();

    return self;
}

undoHistory = {
    index:  0,
    title: '',

    goto: function(newIndex) {
        while(newIndex > undoHistory.index) undoHistory.redo();
        while(newIndex < undoHistory.index) undoHistory.undo();
    },

    undo:   function() {
        if(Undos.hasUndo()) {
            Undos.undo();
            undoHistory.index--;
            console.log('newIndex', undoHistory.index);
        }
    },

    redo:   function() {
        if(Undos.hasRedo()) {
            Undos.redo();
            undoHistory.index++;
            console.log('newIndex', undoHistory.index);
        }
    }
};

history.replaceState({ undoIndex: 0 }, '');

jQuery(window).on('popstate', function(event, state) {
    undoHistory.goto(event.originalEvent.state.undoIndex);
});