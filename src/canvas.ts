export type Point = [number, number];

export enum EventKind {
    MouseMove,
    MouseDown,
    MouseUp,
    KeyDown,
    KeyUp,
}

export type Event =
    {
        kind: EventKind.MouseMove,
        point: Point,
    } |
    {
        kind: EventKind.MouseDown,
        point: Point,
    } |
    {
        kind: EventKind.MouseUp,
        point: Point,
    } |
    {
        kind: EventKind.KeyDown,
        key: string,
    } |
    {
        kind: EventKind.KeyUp,
        key: string,
    }

enum ToolKind {
    Selector,
    Pen,
}

enum ActionKind {
    AddNode,
    SelectTool,
}

type Action =
    {
        kind: ActionKind.AddNode,
        point: Point,
    } |
    {
        kind: ActionKind.SelectTool,
        tool: ToolKind,
    }

type Tool =
    {
        kind: ToolKind.Selector,
    } |
    {
        kind: ToolKind.Pen,
    }

interface ActionHistory {
    root?: ActionHistoryNode,
}

interface ActionHistoryNode {
    action: Action,
    children: ActionHistoryNode[],
}

export interface State {
    tool: Tool,
    history: ActionHistory,
}

function executeAction(state: State, action: Action): boolean {
    switch (action.kind) {
    case ActionKind.AddNode:
        return false;

    case ActionKind.SelectTool:
        switch (action.tool) {
        case ToolKind.Pen:
            state.tool = {
                kind: ToolKind.Pen,
            }
            return true;

        case ToolKind.Selector:
            state.tool = {
                kind: ToolKind.Selector,
            }
            return true;
        }
    }
}

function generateAction(event: Event): Action | null {
    switch (event.kind) {
    case EventKind.MouseMove:
        // TODO: generate action
        return null;

    case EventKind.MouseDown:
        return null;

    case EventKind.MouseUp:
        return null;

    case EventKind.KeyDown:
        switch (event.key) {
        case 'p':
            return {
                kind: ActionKind.SelectTool,
                tool: ToolKind.Pen
            }
        case 's':
            return {
                kind: ActionKind.SelectTool,
                tool: ToolKind.Selector,
            }
        default:
            return null;
        }

    case EventKind.KeyUp:
        return null;
    }
}

export interface StateChangeEvent {
    state: State,
}

export type StateChangeListener = (e: StateChangeEvent) => void;

export class Drawing {
    private state: State = {
        tool: {
            kind: ToolKind.Selector,
        },
        history: {}
    };

    private listeners: Set<StateChangeListener> = new Set();

    public getState(): Readonly<State> {
        return this.state;
    }

    public addStateChangeListener(h: StateChangeListener) {
        this.listeners.add(h);
    }

    public removeStateChangeListener(h: StateChangeListener) {
        this.listeners.delete(h);
    }

    public sendEvent(event: Event) {
        const action = generateAction(event);
        if (!action) {
            return;
        }

        const changed = executeAction(this.state, action);
        if (!changed) {
            return;
        }

        const changeEv = {
            state: this.state,
        }
        this.listeners.forEach((v) => {
            v(changeEv);
        })
    }
}
