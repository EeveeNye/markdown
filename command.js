export class Command {
    constructor(execute, undo, data) {
        this.execute = execute;
        this.undo = undo;
        this.data = data;
    }
}

export class CommandManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
    }

    executeCommand(command) {
        command.execute(command.data);
        this.undoStack.push(command);
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const command = this.undoStack.pop();
        command.undo(command.data);
        this.redoStack.push(command);
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const command = this.redoStack.pop();
        command.execute(command.data);
        this.undoStack.push(command);
    }
}
