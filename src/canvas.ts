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

function actionToSave(kind: ActionKind): boolean {
    switch (kind) {
    case ActionKind.AddNode:
        return false;
    case ActionKind.SelectTool:
        return false;
    }
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
        tempObjectMap: ObjectMap,
        tempObjectID: ObjectID,
    }

interface ActionHistory {
    root?: ActionHistoryNode,
    cur?: ActionHistoryNode,
}

interface ActionHistoryNode {
    action: Action,
    children: ActionHistoryNode[],
}

enum ObjectKind {
    Node,
    Line,
    Path,
    ControlPoint,
}

type ObjectID = number;

type CanvasObject = {
    id: ObjectID;
} & (
    {
        kind: ObjectKind.Node,
        point: Point,
    } |
    {
        kind: ObjectKind.Line,
        point1: ObjectID,
        point2: ObjectID,
    } |
    {
        kind: ObjectKind.Path,
        points: ObjectID[],
        lines: ObjectID[],
    }
)

type ObjectMap = {
    [key: ObjectID]: CanvasObject | undefined,
};

export interface State {
    tool: Tool,
    history: ActionHistory,
    objects: ObjectMap,
}

const generateID = (() => {
    let id = 0;
    return (): ObjectID => {
        return ++id;
    }
})();

function appendHistory(state: State, action: Action) {
    if (!state.history.cur) {
        state.history.cur = state.history.root;
    }
    if (!state.history.cur) {
        if (!state.history.root) {
            state.history.root = {
                action,
                children: [],
            }
            state.history.cur = state.history.root;
        }
    } else {
        const newChild = {
            action,
            children: [],
        }
        state.history.cur.children.push(newChild);
        state.history.cur = newChild;
    }
}

function executeAction(state: State, action: Action): boolean {
    if (actionToSave(action.kind)) {
        appendHistory(state, action);
    }

    switch (action.kind) {
    case ActionKind.AddNode:
        switch (state.tool.kind) {
        case ToolKind.Pen:
            const tempObject = state.tool.tempObjectMap[state.tool.tempObjectID];
            if (!tempObject || tempObject.kind !== ObjectKind.Path) {
                return false;
            }

            const newPoint: CanvasObject = {
                id: generateID(),
                kind: ObjectKind.Node,
                point: action.point,
            }
            state.tool.tempObjectMap[newPoint.id] = newPoint;
            tempObject.points.push(newPoint.id);
            return true;
        }

        return false;

    case ActionKind.SelectTool:
        if (state.tool.kind === action.tool) {
            return false;
        }

        switch (action.tool) {
        case ToolKind.Pen:
            const path: CanvasObject = {
                id: generateID(),
                kind: ObjectKind.Path,
                points: [],
                lines: [],
            };
            state.tool = {
                kind: ToolKind.Pen,
                tempObjectMap: {
                    [path.id]: path,
                },
                tempObjectID: path.id,
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

function generateAction(state: State, event: Event): Action | null {
    switch (event.kind) {
    case EventKind.MouseMove:
        // TODO: generate action
        return null;

    case EventKind.MouseDown:
        switch (state.tool.kind) {
        case ToolKind.Pen:
            return {
                kind: ActionKind.AddNode,
                point: event.point,
            }
        }

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
        history: {},
        objects: {},
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
        const action = generateAction(this.state, event);
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
